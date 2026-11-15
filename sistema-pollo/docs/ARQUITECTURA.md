# Arquitectura — La Parrillita v2

Documento de referencia técnica. Reemplaza la sección de modelo de datos y API de `design.md`.

## 1. Vista general

```
 Celulares (mozos) ─┐
 PC caja ───────────┼── WiFi local ──►  Laptop Windows (IP fija)
 Tablet cocina ─────┘                    ┌──────────────────────────────────────┐
                                         │ Node.js · Express · TypeScript :3000 │
                                         │  ├─ /api/*   API REST (JWT)           │
                                         │  ├─ /*       App React compilada      │
                                         │  └─ Worker   cola de impresión        │
                                         │ MariaDB (XAMPP) :3306 — sólo local    │
                                         └───────────────┬──────────────────────┘
                                                         │ TCP 9100 (ESC/POS)
                              Impresoras: Parrilla · Broaster · Carta · Caja
```

**Decisiones clave**

| Decisión | Motivo |
|---|---|
| Un solo proceso sirve API + app | Un puerto, sin Apache ni CORS; los celulares sólo necesitan `http://IP:3000`. |
| El frontend llama a `/api` (ruta relativa) | Nunca hay que editar IPs en el código (antes estaba fija en `192.168.1.100`). |
| Mozos = `usuarios` con `rol='MOZO'` | Un solo módulo de personal, un solo login, una sola FK `pedidos.usuarioId`. |
| Cola de impresión **persistente** en BD | La comanda se inserta en la misma transacción que el pedido: si la impresora o el servidor fallan, nada se pierde. |
| Dinero en céntimos enteros en el código, `DECIMAL(10,2)` en BD | Sin errores de coma flotante (RNF-004). |
| Venta = pedido `PAGADO`, fecha contable `pagadoEn` | Reportes coherentes con la caja; anulados nunca suman. |
| Gráficos propios (sin librerías) | Funcionan offline, livianos (104 KB gzip toda la app). |
| Refresco por sondeo (30 s dashboard, 15 s caja/mozo) | Suficiente para 1 local; Socket.IO queda como mejora opcional. |

## 2. Modelo de datos (`database/schema.sql`)

Convenciones: tablas en plural · PK `id_<tabla>` · FK `<entidad>Id` · dinero `DECIMAL(10,2)` · hora de Lima.

```
usuarios ─┬─< pedidos >─┬─< pedido_mesas >── mesas
 (rol:    │   (usuarioId │
  ADMIN,  │    = mozo)   ├─< detalle_pedidos >── productos >── categorias
  CAJERO, │              │        │                  │  └──── areas ──< impresoras
  cocina, │              │        └─< detalle_pedido_opciones   └─< opciones_producto
  MOZO)   │              ├─< pagos >── turnos_caja >── usuarios
          │              ├── comprobantes >── series
          │              └─< impresiones >── areas / impresoras
          └─< productos_historial_precios
```

| Tabla | Propósito | Reglas en la BD |
|---|---|---|
| `usuarios` | Todo el personal. Mozos sin password, `pinHash` opcional (bcrypt) | `CHECK`: si no es MOZO, exige usuario y password |
| `areas`, `impresoras` | Áreas de producción y su impresora | IP+puerto únicos |
| `mesas` | Mesas del local | número único; se **desactivan**, no se borran |
| `categorias`, `productos`, `opciones_producto` | Carta | precio ≥ 0; nombre único por categoría |
| `productos_historial_precios` | Auditoría de cambios de precio | — |
| `pedidos` | Cabecera. Estados `ABIERTO → PAGADO / ANULADO` | auditoría de anulación (quién, cuándo, motivo) |
| `pedido_mesas` | Un pedido puede ocupar varias mesas | PK compuesta |
| `detalle_pedidos` | Ítems con **precio, recargo y área congelados** al vender; `ronda` | cantidad > 0; auditoría de anulación |
| `detalle_pedido_opciones` | Opciones elegidas (copia) | — |
| `impresiones` | Cola persistente: documento JSON, estado, intentos, error | — |
| `turnos_caja` | Apertura/cierre con esperado, contado y diferencia | columna generada `abierto` + `UNIQUE(usuarioId, abierto)` ⇒ **un turno abierto por cajero** |
| `pagos` | Pagos (mixtos) con recibido y vuelto | monto > 0 |
| `series`, `comprobantes` | Numeración correlativa | `UNIQUE(serie, numero)`, un comprobante por pedido |

**Integridad que no puede expresar un índice** (se garantiza en transacción):
- *Una mesa en un solo pedido abierto*: `SELECT … FROM mesas … FOR UPDATE` serializa a dos mozos que eligen la misma mesa.
- *Numeración sin saltos*: `SELECT siguienteNumero … FOR UPDATE` dentro de la transacción de cobro.

Índices pensados para reportes: `pedidos(estado, pagadoEn)`, `pagos(turnoCajaId, metodo)`, `detalle_pedidos(pedidoId, ronda)`. Medido con 2 500 pedidos: dashboard 25 ms, análisis de 1 año 47 ms (RNF-001 exige < 3 s).

## 3. Seguridad

- Contraseñas y PIN con **bcrypt** (10 rondas). Login con comparación constante y **límite de intentos** (8/min por IP+usuario).
- **JWT** firmado: 8 h personal, 14 h mozos. En cada petición se verifica que el usuario siga **activo** (desactivar a alguien corta su sesión al instante).
- Autorización por rol en cada ruta (`permitir(...)`); ADMIN accede a todo. Un mozo sólo opera **sus** pedidos.
- Toda entrada validada con `express-validator`; SQL siempre parametrizado.
- `helmet` (CSP propia, sin forzar HTTPS por ser red local), JSON ≤ 200 KB, errores de MySQL traducidos sin filtrar detalles internos.
- El servidor **no arranca en producción** sin `JWT_SECRET` de ≥ 32 caracteres.

### Permisos

| Acción | MOZO | CAJERO | Cocina | ADMIN |
|---|:-:|:-:|:-:|:-:|
| Ver menú / mesas / pedidos abiertos | propios | todos | todos | todos |
| Crear pedido, agregar ronda, cambiar mesa | ✓ (propios) | ✓ | | ✓ |
| Anular ítem enviado (con motivo), quitar recargo, reimprimir | | ✓ | | ✓ |
| Turno de caja, cobrar | | ✓ | | ✓ |
| Anular pedido completo | | | | ✓ |
| Dashboard, reportes, personal, carta, local | | | | ✓ |

## 4. Flujos

**Pedido (RF-005…RF-009)** — una transacción: reservar mesas (FOR UPDATE) → insertar pedido, mesas, ítems con precios congelados → recalcular total → encolar una comanda por área → COMMIT → responder al mozo (< 1 s) → imprimir en segundo plano. Agregar ítems crea la ronda N y sólo imprime esa ronda ("AGREGADO – MESA n").

**Impresión (RF-010)** — `PENDIENTE → IMPRESA | ERROR`. Un worker cada 10 s reintenta los `ERROR` (máx. 3, cada 30 s) y recupera `PENDIENTE` huérfanas tras un reinicio. Botón manual "Reintentar" en caja. Modo `mock` escribe en `backend/logs/`.

**Cobro (RF-022…RF-024)** — una transacción: exige turno abierto → bloquea el pedido → valida Σ pagos = total (en céntimos) → inserta pagos (efectivo: recibido y vuelto) → numera boleta B001 → `PAGADO` + `pagadoEn` (libera mesas) → encola la boleta en el área CAJA.

**Cierre de caja (RF-021)** — esperado = inicial + efectivo del turno; diferencia = contado − esperado; imprime reporte. Si es la **última** caja abierta, no se puede cerrar con pedidos sin cobrar.

## 5. API

Todas bajo `/api`, JSON, `Authorization: Bearer <token>` salvo las públicas.

| Método y ruta | Rol | RF |
|---|---|---|
| `POST /auth/login` · `GET /auth/mozos` · `POST /auth/mozo` · `GET /auth/yo` | público / sesión | 001, 002 |
| `GET /menu?buscar=` · `GET /mesas` | sesión | 003, 016 |
| `GET /pedidos/activos` · `GET /pedidos/:id` | sesión | 011 |
| `POST /pedidos` · `POST /pedidos/:id/items` · `PATCH /pedidos/:id/mesas` | MOZO, CAJERO | 005–009, 011 |
| `POST /pedidos/:id/items/:itemId/anular` · `…/quitar-recargo` · `POST /pedidos/:id/reimprimir` | CAJERO | 006, 012, 013 |
| `POST /pedidos/:id/anular` | ADMIN | 025 |
| `GET /caja/turno` · `POST /caja/turno/abrir` · `POST /caja/turno/cerrar` · `POST /caja/cobrar` | CAJERO | 020–024 |
| `GET /reportes/dashboard` | ADMIN | 026 |
| `GET /reportes/periodo?desde&hasta&limite` (todo en una llamada) · `/ventas` · `/productos` · `/mozos` · `/categorias` · `/areas` · `/horas` · `/turnos` | ADMIN | 027–033 |
| `/admin/usuarios` · `/categorias` · `/productos` (+opciones, historial) · `/mesas` · `/areas` · `/impresoras` (+probar) | ADMIN | 014–019 |
| `GET /admin/impresiones` · `POST /admin/impresiones/:id/reintentar` | CAJERO | 010 |

## 6. Dashboard y reportes

- **Dashboard (RF-026)**: ventas de hoy vs. ayer *a la misma hora*, pedidos cobrados, ticket promedio, hora pico, ocupación de mesas, pedidos en curso por tipo y antigüedad, cajas abiertas, mozos con mesas, alertas de impresión, curva de ventas por hora. Se actualiza cada 30 s.
- **Reportes (RF-027…033)**: filtros Hoy / Ayer / Semana / Semana anterior / Mes / Mes anterior / Personalizado (máx. 1 año). Cada KPI se compara con el período anterior de igual duración.
- **Criterios de visualización**: un solo tono para datos (azul) y gris de contexto; rankings en barras horizontales ordenadas (más legibles que el pastel pedido en RF-030); estado siempre con ícono + texto; cada gráfico con vista **Tabla**; modo claro y oscuro.

## 7. Desviaciones respecto a requirements.md

| Requisito | Decisión | Por qué |
|---|---|---|
| Estado `ENVIADO` | Eliminado: `ABIERTO` ya implica comanda enviada | El "antes de enviar" es el carrito del celular; no hay estado intermedio real en BD. |
| RF-030 gráfico de pastel | Barras ordenadas con % | Comparar 6 categorías es más preciso en barras sobre una misma base. |
| Socket.IO | Sondeo periódico | Menos piezas para operar offline; puede agregarse sin cambiar la API. |
| "Esquema existente sin modificar" | Esquema nuevo | La base estaba vacía y el código existente usaba 3 esquemas incompatibles. |

## 8. Pendiente / siguientes pasos

1. Probar con las impresoras reales (`PRINTER_MODE=network`) y ajustar `PRINTER_WIDTH_CHARS` al modelo.
2. Socket.IO para avisos instantáneos (opcional).
3. PWA instalable para los celulares (`vite-plugin-pwa`).
4. Pruebas automatizadas (unitarias de totales/cobro e integración del flujo pedido → cobro).
5. Fotos de productos (hoy el campo `foto` acepta una URL/ruta).
