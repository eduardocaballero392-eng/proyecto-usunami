import { useState } from 'react';
import api from '../../api/cliente';
import { AnalisisPeriodo, TurnoReporte } from '../../api/tipos';
import { Aviso, Spinner, Tarjeta, useDatos } from '../../components/ui';
import { BarrasRanking, Kpi, LineaTiempo, TarjetaGrafico, Variacion } from '../../components/charts/Graficos';
import { S, Scorto, fechaCorta, fechaHora, hora, hoyLima, num, sumarDias, variacion } from '../../utils/formato';

type Preset = 'hoy' | 'ayer' | 'semana' | 'semana_ant' | 'mes' | 'mes_ant' | 'rango';

/** Lunes de la semana de `f` */
const lunes = (f: string) => {
  const dia = new Date(`${f}T12:00:00Z`).getUTCDay();
  return sumarDias(f, -((dia + 6) % 7));
};

const calcularRango = (p: Preset, desde: string, hasta: string): [string, string] => {
  const hoy = hoyLima();
  switch (p) {
    case 'hoy':
      return [hoy, hoy];
    case 'ayer':
      return [sumarDias(hoy, -1), sumarDias(hoy, -1)];
    case 'semana':
      return [lunes(hoy), hoy];
    case 'semana_ant':
      return [sumarDias(lunes(hoy), -7), sumarDias(lunes(hoy), -1)];
    case 'mes':
      return [`${hoy.slice(0, 7)}-01`, hoy];
    case 'mes_ant': {
      const fin = sumarDias(`${hoy.slice(0, 7)}-01`, -1);
      return [`${fin.slice(0, 7)}-01`, fin];
    }
    default:
      return [desde, hasta];
  }
};

const PRESETS: { valor: Preset; texto: string }[] = [
  { valor: 'hoy', texto: 'Hoy' },
  { valor: 'ayer', texto: 'Ayer' },
  { valor: 'semana', texto: 'Esta semana' },
  { valor: 'semana_ant', texto: 'Semana anterior' },
  { valor: 'mes', texto: 'Este mes' },
  { valor: 'mes_ant', texto: 'Mes anterior' },
  { valor: 'rango', texto: 'Personalizado' },
];

const METODOS: Record<string, string> = { EFECTIVO: 'Efectivo', YAPE: 'Yape', PLIN: 'Plin' };

/** RF-027 … RF-033 */
const Reportes = () => {
  const [preset, setPreset] = useState<Preset>('mes');
  const [desdeP, setDesdeP] = useState(sumarDias(hoyLima(), -6));
  const [hastaP, setHastaP] = useState(hoyLima());
  const [limite, setLimite] = useState(10);
  const [desde, hasta] = calcularRango(preset, desdeP, hastaP);

  const { datos: a, error, cargando } = useDatos(
    () => api.get<AnalisisPeriodo>('/reportes/periodo', { params: { desde, hasta, limite } }).then((r) => r.data),
    [desde, hasta, limite]
  );
  const turnos = useDatos(() => api.get<TurnoReporte[]>('/reportes/turnos', { params: { desde, hasta } }).then((r) => r.data), [desde, hasta]);

  const unDia = desde === hasta;
  const totalMetodos = a?.ventas.porMetodo.reduce((s, m) => s + m.total, 0) ?? 0;
  const conHoras = a?.horas.filter((h) => h.pedidos > 0).map((h) => h.hora) ?? [];
  const horas = a?.horas.filter((h) => h.hora >= Math.min(11, ...conHoras) && h.hora <= Math.max(23, ...conHoras)) ?? [];
  const pico = horas.reduce<number | null>((max, h, i) => (h.total > (max !== null ? horas[max].total : 0) ? i : max), null);

  return (
    <div className="mx-auto max-w-7xl space-y-5">
      <header>
        <h1 className="text-2xl font-bold">Reportes</h1>
        <p className="text-sm text-tinta-3">
          {unDia ? fechaCorta(desde) : `${fechaCorta(desde)} – ${fechaCorta(hasta)}`} · sólo pedidos cobrados, sin anulados
        </p>
      </header>

      {/* Filtros: una sola fila encima de todos los gráficos */}
      <div className="sticky top-[104px] z-10 -mx-4 flex flex-wrap items-end gap-2 border-b border-borde bg-fondo/95 px-4 py-3 backdrop-blur lg:top-0 lg:mx-0 lg:rounded-2xl lg:border lg:bg-superficie/95">
        <div className="flex flex-wrap gap-1" role="group" aria-label="Período">
          {PRESETS.map((p) => (
            <button
              key={p.valor}
              onClick={() => setPreset(p.valor)}
              aria-pressed={preset === p.valor}
              className={`h-9 rounded-lg px-3 text-sm font-medium ${preset === p.valor ? 'bg-amber-500 text-white' : 'bg-superficie text-tinta-2 hover:bg-fondo lg:bg-fondo'}`}
            >
              {p.texto}
            </button>
          ))}
        </div>
        {preset === 'rango' && (
          <div className="flex items-end gap-2">
            <label className="text-xs text-tinta-3">
              Desde
              <input type="date" value={desdeP} max={hastaP} onChange={(e) => setDesdeP(e.target.value)} className="block h-9 rounded-lg border border-borde bg-superficie px-2 text-sm text-tinta" />
            </label>
            <label className="text-xs text-tinta-3">
              Hasta
              <input type="date" value={hastaP} min={desdeP} max={hoyLima()} onChange={(e) => setHastaP(e.target.value)} className="block h-9 rounded-lg border border-borde bg-superficie px-2 text-sm text-tinta" />
            </label>
          </div>
        )}
        {cargando && a && <span className="text-xs text-tinta-3">Actualizando…</span>}
      </div>

      {error && <Aviso>{error}</Aviso>}
      {!a ? (
        cargando && <Spinner texto="Calculando reportes…" />
      ) : (
        <>
          {/* RF-027: resumen */}
          <Tarjeta>
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
              <Kpi heroe etiqueta="Total vendido" valor={S(a.ventas.ventas)} pie={<Variacion pct={variacion(a.ventas.ventas, a.ventas.anterior.ventas)} contexto="vs. período anterior" />} />
              <Kpi etiqueta="Pedidos" valor={num(a.ventas.pedidos)} pie={<Variacion pct={variacion(a.ventas.pedidos, a.ventas.anterior.pedidos)} contexto="vs. período anterior" />} />
              <Kpi etiqueta="Ticket promedio" valor={S(a.ventas.ticketPromedio)} pie={<Variacion pct={variacion(a.ventas.ticketPromedio, a.ventas.anterior.ticketPromedio)} contexto="vs. período anterior" />} />
              <Kpi etiqueta="Pedidos anulados" valor={num(a.ventas.anulados.pedidos)} pie={<p className="text-xs text-tinta-3">{S(a.ventas.anulados.monto)} no facturados</p>} />
            </div>
          </Tarjeta>

          <div className="grid gap-5 lg:grid-cols-3">
            <div className="lg:col-span-2">
              {unDia ? (
                <TarjetaGrafico
                  titulo="Ventas por hora"
                  subtitulo="Hora en que se tomó el pedido"
                  filas={a.ventas.pedidos ? horas : []}
                  columnas={[
                    { titulo: 'Hora', valor: (h) => `${hora(h.hora)}–${hora(h.hora + 1)}` },
                    { titulo: 'Pedidos', valor: (h) => num(h.pedidos), derecha: true },
                    { titulo: 'Total', valor: (h) => S(h.total), derecha: true },
                  ]}
                >
                  <LineaTiempo
                    puntos={horas.map((h) => ({ etiqueta: hora(h.hora), detalle: `${hora(h.hora)} – ${hora(h.hora + 1)}`, valor: h.total, extra: `${h.pedidos} pedido(s)` }))}
                    formatoY={Scorto}
                    formatoValor={S}
                    marcar={pico}
                  />
                </TarjetaGrafico>
              ) : (
                <TarjetaGrafico
                  titulo="Ventas por día"
                  filas={a.ventas.pedidos ? a.ventas.porDia : []}
                  columnas={[
                    { titulo: 'Fecha', valor: (d) => fechaCorta(d.fecha) },
                    { titulo: 'Pedidos', valor: (d) => num(d.pedidos), derecha: true },
                    { titulo: 'Total', valor: (d) => S(d.total), derecha: true },
                  ]}
                >
                  <LineaTiempo
                    puntos={a.ventas.porDia.map((d) => ({ etiqueta: fechaCorta(d.fecha).replace(/^\w+\.? /, ''), detalle: fechaCorta(d.fecha), valor: d.total, extra: `${d.pedidos} pedido(s)` }))}
                    formatoY={Scorto}
                    formatoValor={S}
                  />
                </TarjetaGrafico>
              )}
            </div>

            {/* RF-027: desglose por método de pago */}
            <TarjetaGrafico
              titulo="Métodos de pago"
              subtitulo={`${num(a.ventas.porMetodo.reduce((s, m) => s + m.pagos, 0))} pagos registrados`}
              filas={totalMetodos ? a.ventas.porMetodo : []}
              columnas={[
                { titulo: 'Método', valor: (m) => METODOS[m.metodo] },
                { titulo: 'Pagos', valor: (m) => num(m.pagos), derecha: true },
                { titulo: 'Total', valor: (m) => S(m.total), derecha: true },
                { titulo: '%', valor: (m) => `${((m.total / totalMetodos) * 100).toFixed(1)}%`, derecha: true },
              ]}
            >
              <BarrasRanking
                max={totalMetodos}
                filas={[...a.ventas.porMetodo]
                  .sort((x, y) => y.total - x.total)
                  .map((m) => ({
                    clave: m.metodo,
                    etiqueta: METODOS[m.metodo],
                    valor: m.total,
                    texto: `${((m.total / totalMetodos) * 100).toFixed(0)}%`,
                    tooltip: `${S(m.total)} · ${num(m.pagos)} pagos`,
                  }))}
              />
              <p className="mt-3 text-xs text-tinta-3">Porcentaje sobre el total cobrado</p>
            </TarjetaGrafico>
          </div>

          <div className="grid gap-5 lg:grid-cols-2">
            {/* RF-028 */}
            <TarjetaGrafico
              titulo="Productos más vendidos"
              subtitulo="Por unidades vendidas"
              filas={a.productos}
              acciones={
                <select value={limite} onChange={(e) => setLimite(Number(e.target.value))} className="h-9 rounded-lg border border-borde bg-superficie px-2 text-xs" aria-label="Cantidad de productos">
                  {[10, 20, 50].map((n) => (
                    <option key={n} value={n}>
                      Top {n}
                    </option>
                  ))}
                </select>
              }
              columnas={[
                { titulo: 'Producto', valor: (p) => p.nombre },
                { titulo: 'Categoría', valor: (p) => p.categoria },
                { titulo: 'Unid.', valor: (p) => num(p.cantidad), derecha: true },
                { titulo: 'Total', valor: (p) => S(p.total), derecha: true },
              ]}
            >
              <BarrasRanking
                filas={a.productos.map((p) => ({
                  clave: p.id_productos,
                  etiqueta: p.nombre,
                  valor: p.cantidad,
                  texto: `${num(p.cantidad)} u.`,
                  tooltip: `${p.categoria} · ${S(p.total)} facturado`,
                }))}
              />
            </TarjetaGrafico>

            <div className="space-y-5">
              {/* RF-030 */}
              <TarjetaGrafico
                titulo="Ventas por categoría"
                filas={a.categorias}
                columnas={[
                  { titulo: 'Categoría', valor: (c) => c.nombre },
                  { titulo: 'Unid.', valor: (c) => num(c.cantidad), derecha: true },
                  { titulo: 'Total', valor: (c) => S(c.total), derecha: true },
                  { titulo: '%', valor: (c) => `${c.porcentaje}%`, derecha: true },
                ]}
              >
                <BarrasRanking
                  filas={a.categorias.map((c) => ({
                    clave: c.id_categorias,
                    etiqueta: c.nombre,
                    valor: c.total,
                    texto: `${c.porcentaje}%`,
                    tooltip: `${S(c.total)} · ${num(c.cantidad)} unidades`,
                  }))}
                />
              </TarjetaGrafico>

              {/* RF-031 */}
              <TarjetaGrafico
                titulo="Carga por área de producción"
                subtitulo="Ítems preparados"
                filas={a.areas}
                columnas={[
                  { titulo: 'Área', valor: (x) => x.nombre },
                  { titulo: 'Ítems', valor: (x) => num(x.items), derecha: true },
                  { titulo: 'Total', valor: (x) => S(x.total), derecha: true },
                ]}
              >
                <BarrasRanking
                  filas={a.areas.map((x) => ({
                    clave: x.id_areas,
                    etiqueta: x.nombre.charAt(0) + x.nombre.slice(1).toLowerCase(),
                    valor: x.items,
                    texto: `${num(x.items)} ítems`,
                    tooltip: `${S(x.total)} facturado`,
                  }))}
                />
              </TarjetaGrafico>
            </div>
          </div>

          <div className="grid gap-5 lg:grid-cols-2">
            {/* RF-029 */}
            <TarjetaGrafico
              titulo="Desempeño por mozo"
              filas={a.mozos}
              columnas={[
                { titulo: 'Mozo', valor: (m) => m.nombre },
                { titulo: 'Pedidos', valor: (m) => num(m.pedidos), derecha: true },
                { titulo: 'Total', valor: (m) => S(m.total), derecha: true },
                { titulo: 'Ticket prom.', valor: (m) => S(m.ticketPromedio), derecha: true },
              ]}
            >
              <BarrasRanking
                filas={a.mozos.map((m) => ({
                  clave: m.id_usuarios,
                  etiqueta: m.nombre,
                  sub: `${num(m.pedidos)} pedidos · ticket ${S(m.ticketPromedio)}`,
                  valor: m.total,
                  texto: Scorto(m.total),
                  tooltip: S(m.total),
                }))}
              />
            </TarjetaGrafico>

            {/* RF-032 (en rangos de varios días) */}
            {!unDia && (
              <TarjetaGrafico
                titulo="Horas pico"
                subtitulo="Total del período por hora en que se tomó el pedido"
                filas={a.ventas.pedidos ? horas : []}
                columnas={[
                  { titulo: 'Hora', valor: (h) => `${hora(h.hora)}–${hora(h.hora + 1)}` },
                  { titulo: 'Pedidos', valor: (h) => num(h.pedidos), derecha: true },
                  { titulo: 'Total', valor: (h) => S(h.total), derecha: true },
                ]}
              >
                <LineaTiempo
                  puntos={horas.map((h) => ({ etiqueta: hora(h.hora), detalle: `${hora(h.hora)} – ${hora(h.hora + 1)}`, valor: h.total, extra: `${num(h.pedidos)} pedidos` }))}
                  formatoY={Scorto}
                  formatoValor={S}
                  marcar={pico}
                />
              </TarjetaGrafico>
            )}
          </div>

          {/* RF-033 */}
          <Tarjeta>
            <h3 className="mb-1 font-semibold">Cierres de caja</h3>
            <p className="mb-4 text-sm text-tinta-3">Diferencia = efectivo contado − efectivo esperado</p>
            {turnos.error && <Aviso>{turnos.error}</Aviso>}
            {!turnos.datos?.length ? (
              <p className="py-6 text-center text-sm text-tinta-3">Sin turnos en este período</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full min-w-[720px] text-sm">
                  <thead className="text-left text-tinta-3">
                    <tr className="border-b border-borde">
                      <th className="py-2 pr-3 font-medium">Cajero</th>
                      <th className="py-2 pr-3 font-medium">Apertura</th>
                      <th className="py-2 pr-3 font-medium">Cierre</th>
                      <th className="py-2 pr-3 text-right font-medium">Inicial</th>
                      <th className="py-2 pr-3 text-right font-medium">Efectivo</th>
                      <th className="py-2 pr-3 text-right font-medium">Yape</th>
                      <th className="py-2 pr-3 text-right font-medium">Plin</th>
                      <th className="py-2 pr-3 text-right font-medium">Esperado</th>
                      <th className="py-2 pr-3 text-right font-medium">Contado</th>
                      <th className="py-2 text-right font-medium">Diferencia</th>
                    </tr>
                  </thead>
                  <tbody className="num">
                    {turnos.datos.map((t) => (
                      <tr key={t.id_turnos_caja} className="border-b border-borde/60">
                        <td className="py-2 pr-3">{t.cajero}</td>
                        <td className="py-2 pr-3">{fechaHora(t.apertura)}</td>
                        <td className="py-2 pr-3">{t.cierre ? fechaHora(t.cierre) : <span className="font-medium text-amber-700 dark:text-amber-400">Abierta</span>}</td>
                        <td className="py-2 pr-3 text-right">{S(t.montoInicial)}</td>
                        <td className="py-2 pr-3 text-right">{S(t.efectivo)}</td>
                        <td className="py-2 pr-3 text-right">{S(t.yape)}</td>
                        <td className="py-2 pr-3 text-right">{S(t.plin)}</td>
                        <td className="py-2 pr-3 text-right">{t.montoEsperado !== null ? S(t.montoEsperado) : '—'}</td>
                        <td className="py-2 pr-3 text-right">{t.montoFinal !== null ? S(t.montoFinal) : '—'}</td>
                        <td className="py-2 text-right font-semibold">
                          {t.diferencia === null ? (
                            '—'
                          ) : t.diferencia === 0 ? (
                            <span className="text-green-700 dark:text-green-400">✓ Cuadra</span>
                          ) : (
                            <span className={t.diferencia < 0 ? 'text-red-700 dark:text-red-400' : 'text-tinta'}>
                              {t.diferencia < 0 ? '▼ Falta ' : '▲ Sobra '}
                              {S(Math.abs(t.diferencia))}
                            </span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </Tarjeta>
        </>
      )}
    </div>
  );
};

export default Reportes;
