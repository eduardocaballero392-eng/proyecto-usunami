import { consultar, consultarUno } from '../config/database';
import { aNumero } from '../utils/dinero';
import { hoyLima, sumarDias } from '../utils/fechas';

/**
 * REPORTES Y DASHBOARD (RF-026 … RF-033)
 * Reglas:
 *   · Una venta = pedido PAGADO. Su fecha contable es pedidos.pagadoEn.
 *   · Los pedidos ANULADOS y los ítems anulados nunca suman.
 *   · Rangos semiabiertos [inicio, fin) para aprovechar idx_pedidos_estado_pagado.
 */

interface Rango {
  inicio: string;
  fin: string;
}

const n = (v: unknown) => Number(v ?? 0);

// --- RF-026: Dashboard en tiempo real -----------------------------------------------

export const dashboard = async () => {
  const hoy = hoyLima();
  const ayer = sumarDias(hoy, -1);
  const rangoHoy = { inicio: `${hoy} 00:00:00`, fin: `${sumarDias(hoy, 1)} 00:00:00` };
  const horaActual = new Date().toLocaleTimeString('en-GB', { timeZone: 'America/Lima', hour12: false });

  const [mesas, activos, ventasHoy, anuladosHoy, ventasAyer, porHora, errores, turnos, activosPorMozo, productosDestacados] = await Promise.all([
    consultarUno(
      `SELECT COUNT(DISTINCT m.id_mesas) AS total,
              COUNT(DISTINCT CASE WHEN p.id_pedidos IS NOT NULL THEN m.id_mesas END) AS ocupadas
         FROM mesas m
         LEFT JOIN (pedido_mesas pm JOIN pedidos p ON p.id_pedidos = pm.pedidoId AND p.estado = 'ABIERTO')
                ON pm.mesaId = m.id_mesas
        WHERE m.activo = 1`
    ),
    consultar(
      `SELECT tipo, COUNT(*) AS pedidos, COALESCE(SUM(total), 0) AS monto,
              TIMESTAMPDIFF(MINUTE, MIN(creadoEn), NOW()) AS minutosMasAntiguo
         FROM pedidos WHERE estado = 'ABIERTO' GROUP BY tipo`
    ),
    consultarUno(
      `SELECT COUNT(*) AS pedidos, COALESCE(SUM(total), 0) AS ventas
         FROM pedidos WHERE estado = 'PAGADO' AND pagadoEn >= ? AND pagadoEn < ?`,
      [rangoHoy.inicio, rangoHoy.fin]
    ),
    consultarUno(
      `SELECT COUNT(*) AS pedidos FROM pedidos WHERE estado = 'ANULADO' AND anuladoEn >= ? AND anuladoEn < ?`,
      [rangoHoy.inicio, rangoHoy.fin]
    ),
    // Ayer hasta la misma hora → comparación justa durante el día
    consultarUno(
      `SELECT COALESCE(SUM(CASE WHEN pagadoEn <= ? THEN total END), 0) AS mismaHora,
              COALESCE(SUM(total), 0) AS diaCompleto
         FROM pedidos WHERE estado = 'PAGADO' AND pagadoEn >= ? AND pagadoEn < ?`,
      [`${ayer} ${horaActual}`, `${ayer} 00:00:00`, `${hoy} 00:00:00`]
    ),
    consultar(
      `SELECT HOUR(creadoEn) AS hora, COUNT(*) AS pedidos, COALESCE(SUM(total), 0) AS total
         FROM pedidos WHERE estado = 'PAGADO' AND pagadoEn >= ? AND pagadoEn < ?
        GROUP BY HOUR(creadoEn)`,
      [rangoHoy.inicio, rangoHoy.fin]
    ),
    consultarUno("SELECT COUNT(*) AS n FROM impresiones WHERE estado = 'ERROR'"),
    consultar(
      `SELECT t.id_turnos_caja, u.nombre AS cajero, t.apertura FROM turnos_caja t
         JOIN usuarios u ON u.id_usuarios = t.usuarioId WHERE t.cierre IS NULL ORDER BY t.apertura`
    ),
    consultar(
      `SELECT u.nombre, COUNT(*) AS pedidos, COALESCE(SUM(p.total), 0) AS monto
         FROM pedidos p JOIN usuarios u ON u.id_usuarios = p.usuarioId
        WHERE p.estado = 'ABIERTO' GROUP BY u.id_usuarios ORDER BY pedidos DESC`
    ),
    // Productos más vendidos hoy (top 10)
    consultar(
      `SELECT pr.id_productos, pr.nombre, c.nombre AS categoria,
              SUM(d.cantidad) AS cantidad, SUM(d.cantidad * (d.precioUnitario + d.recargoUnitario)) AS total
         FROM detalle_pedidos d
         JOIN pedidos p ON p.id_pedidos = d.pedidoId
         JOIN productos pr ON pr.id_productos = d.productoId
         JOIN categorias c ON c.id_categorias = pr.categoriaId
        WHERE p.estado = 'PAGADO' AND p.pagadoEn >= ? AND p.pagadoEn < ? AND d.anulado = 0
        GROUP BY pr.id_productos
        ORDER BY cantidad DESC
        LIMIT 10`,
      [rangoHoy.inicio, rangoHoy.fin]
    ),
  ]);

  const tipos = { MESA: 0, LLEVAR: 0, DELIVERY: 0 } as Record<string, number>;
  let montoPorCobrar = 0;
  let minutosMasAntiguo: number | null = null;
  for (const a of activos) {
    tipos[a.tipo] = n(a.pedidos);
    montoPorCobrar += aNumero(a.monto);
    minutosMasAntiguo = Math.max(minutosMasAntiguo ?? 0, n(a.minutosMasAntiguo));
  }

  const horas = Array.from({ length: 24 }, (_, h) => {
    const f = porHora.find((x) => n(x.hora) === h);
    return { hora: h, pedidos: n(f?.pedidos), total: aNumero(f?.total) };
  });
  const pico = horas.reduce<(typeof horas)[number] | null>((max, h) => (h.total > (max?.total ?? 0) ? h : max), null);

  const ventas = aNumero(ventasHoy?.ventas);
  const pedidos = n(ventasHoy?.pedidos);
  const mesasTotal = n(mesas?.total);
  const mesasOcupadas = n(mesas?.ocupadas);

  return {
    generadoEn: new Date().toISOString(),
    fecha: hoy,
    mesas: { total: mesasTotal, ocupadas: mesasOcupadas, libres: mesasTotal - mesasOcupadas },
    pedidosActivos: {
      total: tipos.MESA + tipos.LLEVAR + tipos.DELIVERY,
      porTipo: tipos,
      montoPorCobrar: aNumero(montoPorCobrar),
      minutosMasAntiguo,
      porMozo: activosPorMozo.map((m) => ({ nombre: m.nombre, pedidos: n(m.pedidos), monto: aNumero(m.monto) })),
    },
    hoy: {
      ventas,
      pedidos,
      ticketPromedio: pedidos ? aNumero(ventas / pedidos) : 0,
      anulados: n(anuladosHoy?.pedidos),
      horaPico: pico ? { hora: pico.hora, total: pico.total, pedidos: pico.pedidos } : null,
    },
    ayer: { ventasMismaHora: aNumero(ventasAyer?.mismaHora), ventasDiaCompleto: aNumero(ventasAyer?.diaCompleto) },
    ventasPorHora: horas,
    impresionesConError: n(errores?.n),
    turnosAbiertos: turnos,
    productosDestacados: productosDestacados.map((p) => ({
      id_productos: p.id_productos,
      nombre: p.nombre,
      categoria: p.categoria,
      cantidad: n(p.cantidad),
      total: aNumero(p.total),
    })),
  };
};

// --- RF-027: ventas del período ---------------------------------------------------

const resumenVentas = async (r: Rango) => {
  const f = await consultarUno(
    `SELECT COUNT(*) AS pedidos, COALESCE(SUM(total), 0) AS ventas
       FROM pedidos WHERE estado = 'PAGADO' AND pagadoEn >= ? AND pagadoEn < ?`,
    [r.inicio, r.fin]
  );
  const ventas = aNumero(f?.ventas);
  const pedidos = n(f?.pedidos);
  return { ventas, pedidos, ticketPromedio: pedidos ? aNumero(ventas / pedidos) : 0 };
};

export const ventasPeriodo = async (r: Rango & { desde: string; hasta: string }) => {
  const dias = Math.round((Date.parse(r.hasta) - Date.parse(r.desde)) / 86_400_000) + 1;
  const anterior = {
    inicio: `${sumarDias(r.desde, -dias)} 00:00:00`,
    fin: r.inicio,
  };

  const [actual, previo, metodos, porDia, anulados] = await Promise.all([
    resumenVentas(r),
    resumenVentas(anterior),
    consultar(
      `SELECT pg.metodo, COUNT(*) AS pagos, COALESCE(SUM(pg.monto), 0) AS total
         FROM pagos pg JOIN pedidos p ON p.id_pedidos = pg.pedidoId
        WHERE p.estado = 'PAGADO' AND p.pagadoEn >= ? AND p.pagadoEn < ?
        GROUP BY pg.metodo`,
      [r.inicio, r.fin]
    ),
    consultar(
      `SELECT DATE(pagadoEn) AS fecha, COUNT(*) AS pedidos, COALESCE(SUM(total), 0) AS total
         FROM pedidos WHERE estado = 'PAGADO' AND pagadoEn >= ? AND pagadoEn < ?
        GROUP BY DATE(pagadoEn) ORDER BY fecha`,
      [r.inicio, r.fin]
    ),
    consultarUno(
      `SELECT COUNT(*) AS pedidos, COALESCE(SUM(total), 0) AS monto
         FROM pedidos WHERE estado = 'ANULADO' AND anuladoEn >= ? AND anuladoEn < ?`,
      [r.inicio, r.fin]
    ),
  ]);

  // Serie diaria completa (días sin ventas = 0) para que la línea no "salte" días
  const serie: { fecha: string; pedidos: number; total: number }[] = [];
  for (let i = 0; i < dias; i++) {
    const fecha = sumarDias(r.desde, i);
    const f = porDia.find((x) => String(x.fecha).slice(0, 10) === fecha);
    serie.push({ fecha, pedidos: n(f?.pedidos), total: aNumero(f?.total) });
  }

  return {
    desde: r.desde,
    hasta: r.hasta,
    ...actual,
    anterior: previo,
    anulados: { pedidos: n(anulados?.pedidos), monto: aNumero(anulados?.monto) },
    porMetodo: (['EFECTIVO', 'YAPE', 'PLIN'] as const).map((m) => {
      const f = metodos.find((x) => x.metodo === m);
      return { metodo: m, pagos: n(f?.pagos), total: aNumero(f?.total) };
    }),
    porDia: serie,
  };
};

// --- RF-028 … RF-032 ----------------------------------------------------------------

/** FROM … WHERE común a los reportes por ítem vendido (sólo ventas pagadas, sin ítems anulados). */
const itemsVendidos = (joins: string) => `
  FROM detalle_pedidos d
  JOIN pedidos p ON p.id_pedidos = d.pedidoId
  ${joins}
 WHERE p.estado = 'PAGADO' AND p.pagadoEn >= ? AND p.pagadoEn < ? AND d.anulado = 0`;

const JOIN_PRODUCTO_CATEGORIA =
  'JOIN productos pr ON pr.id_productos = d.productoId JOIN categorias c ON c.id_categorias = pr.categoriaId';

/** RF-028: ranking de productos. */
export const productosMasVendidos = async (r: Rango, limite = 10) =>
  (
    await consultar(
      `SELECT pr.id_productos, pr.nombre, c.nombre AS categoria,
              SUM(d.cantidad) AS cantidad, SUM(d.cantidad * (d.precioUnitario + d.recargoUnitario)) AS total
         ${itemsVendidos(JOIN_PRODUCTO_CATEGORIA)}
        GROUP BY pr.id_productos
        ORDER BY cantidad DESC, total DESC
        LIMIT ?`,
      [r.inicio, r.fin, limite]
    )
  ).map((f) => ({ id_productos: f.id_productos, nombre: f.nombre, categoria: f.categoria, cantidad: n(f.cantidad), total: aNumero(f.total) }));

/** RF-029: desempeño por mozo. */
export const ventasPorMozo = async (r: Rango) =>
  (
    await consultar(
      `SELECT u.id_usuarios, u.nombre, u.rol, COUNT(*) AS pedidos, COALESCE(SUM(p.total), 0) AS total
         FROM pedidos p JOIN usuarios u ON u.id_usuarios = p.usuarioId
        WHERE p.estado = 'PAGADO' AND p.pagadoEn >= ? AND p.pagadoEn < ?
        GROUP BY u.id_usuarios ORDER BY total DESC`,
      [r.inicio, r.fin]
    )
  ).map((f) => {
    const total = aNumero(f.total);
    const pedidos = n(f.pedidos);
    return { id_usuarios: f.id_usuarios, nombre: f.nombre, rol: f.rol, pedidos, total, ticketPromedio: pedidos ? aNumero(total / pedidos) : 0 };
  });

/** RF-030: distribución por categoría (con % del total). */
export const ventasPorCategoria = async (r: Rango) => {
  const filas = await consultar(
    `SELECT c.id_categorias, c.nombre, SUM(d.cantidad) AS cantidad,
            SUM(d.cantidad * (d.precioUnitario + d.recargoUnitario)) AS total
       ${itemsVendidos(JOIN_PRODUCTO_CATEGORIA)}
      GROUP BY c.id_categorias ORDER BY total DESC`,
    [r.inicio, r.fin]
  );
  const suma = filas.reduce((s, f) => s + aNumero(f.total), 0);
  return filas.map((f) => ({
    id_categorias: f.id_categorias,
    nombre: f.nombre,
    cantidad: n(f.cantidad),
    total: aNumero(f.total),
    porcentaje: suma ? Math.round((aNumero(f.total) / suma) * 1000) / 10 : 0,
  }));
};

/** RF-031: carga de trabajo por área de producción. */
export const ventasPorArea = async (r: Rango) =>
  (
    await consultar(
      `SELECT a.id_areas, a.nombre, SUM(d.cantidad) AS items,
              SUM(d.cantidad * (d.precioUnitario + d.recargoUnitario)) AS total
         ${itemsVendidos('JOIN areas a ON a.id_areas = d.areaId')}
        GROUP BY a.id_areas ORDER BY items DESC`,
      [r.inicio, r.fin]
    )
  ).map((f) => ({ id_areas: f.id_areas, nombre: f.nombre, items: n(f.items), total: aNumero(f.total) }));

/** RF-032: horas pico (hora en que se TOMÓ el pedido). */
export const horasPico = async (r: Rango) => {
  const filas = await consultar(
    `SELECT HOUR(creadoEn) AS hora, COUNT(*) AS pedidos, COALESCE(SUM(total), 0) AS total
       FROM pedidos WHERE estado = 'PAGADO' AND pagadoEn >= ? AND pagadoEn < ?
      GROUP BY HOUR(creadoEn)`,
    [r.inicio, r.fin]
  );
  return Array.from({ length: 24 }, (_, h) => {
    const f = filas.find((x) => n(x.hora) === h);
    return { hora: h, pedidos: n(f?.pedidos), total: aNumero(f?.total) };
  });
};

/** Todo el análisis de un período en una sola llamada (pantalla de Reportes). */
export const analisisPeriodo = async (r: Rango & { desde: string; hasta: string }, limiteProductos = 10) => {
  const [ventas, productos, mozos, categorias, areas, horas] = await Promise.all([
    ventasPeriodo(r),
    productosMasVendidos(r, limiteProductos),
    ventasPorMozo(r),
    ventasPorCategoria(r),
    ventasPorArea(r),
    horasPico(r),
  ]);
  return { ventas, productos, mozos, categorias, areas, horas };
};
