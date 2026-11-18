import { Link } from 'react-router-dom';
import { AlertTriangle, ArrowRight, Bike, Clock, Moon, RefreshCw, ShoppingBag, Sun, UtensilsCrossed, Wallet } from 'lucide-react';
import api from '../../api/cliente';
import { Dashboard as TDashboard } from '../../api/tipos';
import { Aviso, Spinner, Tarjeta, useDatos } from '../../components/ui';
import { Kpi, LineaTiempo, Medidor, TarjetaGrafico, Variacion } from '../../components/charts/Graficos';
import { S, Scorto, fechaLarga, hora, horaDe, num, variacion } from '../../utils/formato';
import { useTema } from '../../hooks/useTema';

const REFRESCO_MS = 30_000;

/** RF-026: dashboard principal en tiempo real. */
const Dashboard = () => {
  const { datos: d, error, cargando, recargar } = useDatos(() => api.get<TDashboard>('/reportes/dashboard').then((r) => r.data), [], REFRESCO_MS);
  const { oscuro, alternarTema } = useTema();

  if (cargando && !d) return <Spinner texto="Cargando indicadores…" />;
  if (!d) return <Aviso>{error ?? 'No se pudo cargar el dashboard'}</Aviso>;

  // Horas con operación: desde la primera hasta la última con ventas (mín. 11:00–23:00)
  const conVentas = d.ventasPorHora.filter((h) => h.pedidos > 0).map((h) => h.hora);
  const desde = Math.min(11, ...conVentas);
  const hasta = Math.max(23, ...conVentas);
  const horas = d.ventasPorHora.filter((h) => h.hora >= desde && h.hora <= hasta);
  const idxPico = d.hoy.horaPico ? horas.findIndex((h) => h.hora === d.hoy.horaPico!.hora) : null;
  const ocupacion = d.mesas.total ? Math.round((d.mesas.ocupadas / d.mesas.total) * 100) : 0;

  return (
    <div className="mx-auto max-w-7xl space-y-5">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">Dashboard</h1>
          <p className="text-sm text-tinta-3">{fechaLarga(d.fecha)}</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={alternarTema}
            className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-borde bg-superficie hover:bg-fondo transition-colors"
            aria-label={oscuro ? 'Cambiar a tono claro' : 'Cambiar a tono oscuro'}
            title={oscuro ? 'Cambiar a tono claro' : 'Cambiar a tono oscuro'}
          >
            {oscuro ? (
              <Sun className="h-5 w-5 text-amber-500" />
            ) : (
              <Moon className="h-5 w-5 text-slate-600" />
            )}
          </button>
          <button onClick={() => recargar()} className="inline-flex h-10 items-center gap-2 rounded-xl border border-borde bg-superficie px-3 text-sm text-tinta-2 hover:bg-fondo">
            <RefreshCw className={`h-4 w-4 ${cargando ? 'animate-spin' : ''}`} />
            Actualizado {new Date(d.generadoEn).toLocaleTimeString('es-PE', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
          </button>
        </div>
      </header>

      {error && <Aviso>Sin conexión: mostrando los últimos datos. {error}</Aviso>}

      {/* Alertas operativas (estado: ícono + texto) */}
      {(d.impresionesConError > 0 || d.turnosAbiertos.length === 0) && (
        <div className="grid gap-2 sm:grid-cols-2">
          {d.impresionesConError > 0 && (
            <Link to="/caja" className="flex items-center gap-2 rounded-xl border border-red-300 bg-red-50 px-3 py-2 text-sm text-red-800 dark:border-red-900 dark:bg-red-950/40 dark:text-red-200">
              <AlertTriangle className="h-4 w-4 shrink-0" />
              <span className="flex-1">
                <b>{d.impresionesConError}</b> impresión(es) con error — revisa las impresoras
              </span>
              <ArrowRight className="h-4 w-4" />
            </Link>
          )}
          {d.turnosAbiertos.length === 0 && (
            <div className="flex items-center gap-2 rounded-xl border border-amber-300 bg-amber-50 px-3 py-2 text-sm text-amber-900 dark:border-amber-800 dark:bg-amber-950/40 dark:text-amber-200">
              <Wallet className="h-4 w-4 shrink-0" />
              No hay ninguna caja abierta: no se podrá cobrar
            </div>
          )}
        </div>
      )}

      {/* KPIs del día */}
      <Tarjeta>
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-[1.4fr_1fr_1fr_1fr]">
          <Kpi
            heroe
            etiqueta="Ventas de hoy"
            valor={S(d.hoy.ventas)}
            pie={<Variacion pct={variacion(d.hoy.ventas, d.ayer.ventasMismaHora)} contexto="vs. ayer a esta hora" />}
          />
          <Kpi etiqueta="Pedidos cobrados" valor={num(d.hoy.pedidos)} pie={<p className="text-xs text-tinta-3">{d.hoy.anulados} anulado(s) hoy</p>} />
          <Kpi etiqueta="Ticket promedio" valor={S(d.hoy.ticketPromedio)} pie={<p className="text-xs text-tinta-3">Ayer cerró en {S(d.ayer.ventasDiaCompleto)}</p>} />
          <Kpi
            etiqueta="Hora pico"
            valor={d.hoy.horaPico ? hora(d.hoy.horaPico.hora) : '—'}
            pie={<p className="text-xs text-tinta-3">{d.hoy.horaPico ? `${S(d.hoy.horaPico.total)} · ${d.hoy.horaPico.pedidos} pedidos` : 'Aún sin ventas'}</p>}
          />
        </div>
      </Tarjeta>

      <div className="grid gap-5 lg:grid-cols-3">
        {/* Mesas */}
        <Tarjeta>
          <div className="mb-3 flex items-baseline justify-between">
            <h3 className="font-semibold">Mesas</h3>
            <span className="text-sm text-tinta-3">{ocupacion}% ocupación</span>
          </div>
          <p className="mb-3">
            <span className="text-3xl font-semibold">{d.mesas.ocupadas}</span>
            <span className="text-tinta-3"> ocupadas de {d.mesas.total}</span>
          </p>
          <Medidor valor={d.mesas.ocupadas} total={d.mesas.total} etiqueta="Mesas ocupadas" />
          <p className="mt-2 text-sm text-tinta-2">{d.mesas.libres} libres</p>
        </Tarjeta>

        {/* Pedidos activos */}
        <Tarjeta>
          <div className="mb-3 flex items-baseline justify-between">
            <h3 className="font-semibold">Pedidos en curso</h3>
            <Link to="/admin/pedidos" className="text-sm text-amber-700 hover:underline dark:text-amber-400">
              Ver todos
            </Link>
          </div>
          <p className="mb-3">
            <span className="text-3xl font-semibold">{d.pedidosActivos.total}</span>
            <span className="text-tinta-3"> por cobrar · {S(d.pedidosActivos.montoPorCobrar)}</span>
          </p>
          <ul className="grid grid-cols-3 gap-2 text-center text-sm">
            {[
              { k: 'MESA' as const, t: 'Mesa', I: UtensilsCrossed },
              { k: 'LLEVAR' as const, t: 'Llevar', I: ShoppingBag },
              { k: 'DELIVERY' as const, t: 'Delivery', I: Bike },
            ].map(({ k, t, I }) => (
              <li key={k} className="rounded-xl bg-fondo py-2">
                <I className="mx-auto mb-1 h-4 w-4 text-tinta-3" />
                <p className="num text-lg font-semibold">{d.pedidosActivos.porTipo[k]}</p>
                <p className="text-xs text-tinta-3">{t}</p>
              </li>
            ))}
          </ul>
          {d.pedidosActivos.minutosMasAntiguo !== null && d.pedidosActivos.total > 0 && (
            <p className={`mt-3 flex items-center gap-1 text-sm ${d.pedidosActivos.minutosMasAntiguo > 90 ? 'text-red-700 dark:text-red-400' : 'text-tinta-2'}`}>
              <Clock className="h-4 w-4" /> El más antiguo lleva {d.pedidosActivos.minutosMasAntiguo} min
            </p>
          )}
        </Tarjeta>

        {/* Personal en turno */}
        <Tarjeta>
          <h3 className="mb-3 font-semibold">En turno</h3>
          <p className="mb-1 text-xs font-medium uppercase tracking-wide text-tinta-3">Cajas abiertas</p>
          {d.turnosAbiertos.length ? (
            <ul className="mb-3 space-y-1 text-sm">
              {d.turnosAbiertos.map((t) => (
                <li key={t.id_turnos_caja} className="flex justify-between">
                  <span>{t.cajero}</span>
                  <span className="text-tinta-3">desde {horaDe(t.apertura)}</span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="mb-3 text-sm text-tinta-3">Ninguna</p>
          )}
          <p className="mb-1 text-xs font-medium uppercase tracking-wide text-tinta-3">Mozos con mesas abiertas</p>
          {d.pedidosActivos.porMozo.length ? (
            <ul className="space-y-1 text-sm">
              {d.pedidosActivos.porMozo.map((m) => (
                <li key={m.nombre} className="flex justify-between gap-2">
                  <span className="truncate">{m.nombre}</span>
                  <span className="num shrink-0 text-tinta-2">
                    {m.pedidos} · {S(m.monto)}
                  </span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-tinta-3">Ninguno</p>
          )}
        </Tarjeta>
      </div>

      {/* NUEVA SECCIÓN: Productos Destacados - Responsivo */}
      {d.productosDestacados.length > 0 && (
        <Tarjeta>
          <div className="mb-4 flex items-baseline justify-between">
            <h3 className="font-semibold">🌟 Productos más vendidos hoy</h3>
            <Link to="/admin/reportes" className="text-sm text-amber-700 hover:underline dark:text-amber-400">
              Ver más
            </Link>
          </div>
          {/* Vista para escritorio/tablet */}
          <div className="hidden sm:block overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-borde text-left text-xs text-tinta-3">
                  <th className="pb-2 font-medium">Producto</th>
                  <th className="pb-2 font-medium">Categoría</th>
                  <th className="pb-2 text-right font-medium">Cantidad</th>
                  <th className="pb-2 text-right font-medium">Total</th>
                </tr>
              </thead>
              <tbody>
                {d.productosDestacados.map((p, idx) => (
                  <tr key={p.id_productos} className="border-b border-borde/50 last:border-0">
                    <td className="py-2.5">
                      <span className="inline-flex items-center gap-2">
                        {idx < 3 ? (
                          <span className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs font-bold ${
                            idx === 0 
                              ? 'bg-amber-500 text-white dark:bg-amber-600' 
                              : idx === 1 
                              ? 'bg-amber-400/70 text-amber-950 dark:bg-amber-500/60 dark:text-amber-100' 
                              : 'bg-amber-300/50 text-amber-900 dark:bg-amber-400/40 dark:text-amber-200'
                          }`}>
                            {idx + 1}
                          </span>
                        ) : (
                          <span className="flex h-6 w-6 shrink-0 items-center justify-center text-xs font-semibold text-tinta-3">
                            {idx + 1}
                          </span>
                        )}
                        <span className="font-medium">{p.nombre}</span>
                      </span>
                    </td>
                    <td className="py-2.5 text-tinta-2">{p.categoria}</td>
                    <td className="py-2.5 text-right num font-semibold">{num(p.cantidad)}</td>
                    <td className="py-2.5 text-right num font-semibold text-amber-700 dark:text-amber-400">{S(p.total)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {/* Vista para móvil */}
          <div className="sm:hidden space-y-3">
            {d.productosDestacados.map((p, idx) => (
              <div key={p.id_productos} className="flex items-start gap-3 rounded-lg bg-fondo p-3">
                {idx < 3 ? (
                  <span className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-sm font-bold ${
                    idx === 0 
                      ? 'bg-amber-500 text-white dark:bg-amber-600' 
                      : idx === 1 
                      ? 'bg-amber-400/70 text-amber-950 dark:bg-amber-500/60 dark:text-amber-100' 
                      : 'bg-amber-300/50 text-amber-900 dark:bg-amber-400/40 dark:text-amber-200'
                  }`}>
                    {idx + 1}
                  </span>
                ) : (
                  <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-fondo border border-borde text-sm font-semibold text-tinta-2">
                    {idx + 1}
                  </span>
                )}
                <div className="flex-1 min-w-0">
                  <p className="font-medium truncate">{p.nombre}</p>
                  <p className="text-xs text-tinta-3">{p.categoria}</p>
                  <div className="mt-1.5 flex justify-between text-sm">
                    <span className="text-tinta-2">{num(p.cantidad)} vendidos</span>
                    <span className="num font-semibold text-amber-700 dark:text-amber-400">{S(p.total)}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </Tarjeta>
      )}

      <TarjetaGrafico
        titulo="Ventas de hoy por hora"
        subtitulo="Pedidos cobrados según la hora en que se tomaron"
        filas={d.hoy.pedidos ? horas : []}
        vacio="Todavía no hay ventas cobradas hoy"
        columnas={[
          { titulo: 'Hora', valor: (h) => `${hora(h.hora)}–${hora(h.hora + 1)}` },
          { titulo: 'Pedidos', valor: (h) => num(h.pedidos), derecha: true },
          { titulo: 'Total', valor: (h) => S(h.total), derecha: true },
        ]}
        acciones={
          <Link to="/admin/reportes" className="inline-flex h-9 items-center gap-1 rounded-lg px-2 text-xs font-medium text-amber-700 hover:bg-fondo dark:text-amber-400">
            Más reportes <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        }
      >
        <LineaTiempo
          puntos={horas.map((h) => ({
            etiqueta: hora(h.hora),
            detalle: `${hora(h.hora)} – ${hora(h.hora + 1)}`,
            valor: h.total,
            extra: `${h.pedidos} pedido(s)`,
          }))}
          formatoY={Scorto}
          formatoValor={S}
          marcar={idxPico !== null && idxPico >= 0 ? idxPico : null}
        />
      </TarjetaGrafico>
    </div>
  );
};

export default Dashboard;
