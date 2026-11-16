import { RefreshCw, UtensilsCrossed, ClipboardList, LayoutGrid, TrendingUp, Clock, User, ChevronDown, ChevronUp } from 'lucide-react';
import { useState } from 'react';
import api from '../../api/cliente';
import { Aviso, Spinner, Tarjeta, useDatos } from '../../components/ui';
import { fechaLarga, fechaHora } from '../../utils/formato';

// ── Tipos ──────────────────────────────────────────────────────────────────
interface ItemComanda {
  nombre: string;
  cantidad: number;
  nota: string | null;
  opciones: string | null;
}

interface Comanda {
  id_pedidos: number;
  tipo: string;
  mozoNombre: string;
  mesas: string | null;
  creadoEn: string;
  estado: string;
  items: ItemComanda[];
}

interface DashboardParrilla {
  fecha: string;
  generadoEn: string;
  stats: {
    totalPlatos: number;
    totalComandas: number;
    tiposDistintos: number;
    platoMasVendido: { nombre: string; cantidad: number } | null;
  };
  ranking: { nombre: string; cantidad: number }[];
  comandas: Comanda[];
}

// ── Tarjeta KPI ────────────────────────────────────────────────────────────
const KpiCard = ({
  icono: Icono,
  etiqueta,
  valor,
  sub,
  color = 'amber',
}: {
  icono: React.ElementType;
  etiqueta: string;
  valor: string | number;
  sub?: string;
  color?: 'amber' | 'blue' | 'green' | 'purple';
}) => {
  const colores = {
    amber:  'bg-amber-50 text-amber-600 dark:bg-amber-950/40 dark:text-amber-400',
    blue:   'bg-blue-50 text-blue-600 dark:bg-blue-950/40 dark:text-blue-400',
    green:  'bg-green-50 text-green-600 dark:bg-green-950/40 dark:text-green-400',
    purple: 'bg-purple-50 text-purple-600 dark:bg-purple-950/40 dark:text-purple-400',
  };
  return (
    <div className="flex items-center gap-4 rounded-2xl border border-borde bg-superficie p-4">
      <span className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-xl ${colores[color]}`}>
        <Icono className="h-6 w-6" />
      </span>
      <div className="min-w-0">
        <p className="text-xs font-medium uppercase tracking-wide text-tinta-3">{etiqueta}</p>
        <p className="truncate text-2xl font-bold leading-tight">{valor}</p>
        {sub && <p className="truncate text-xs text-tinta-3">{sub}</p>}
      </div>
    </div>
  );
};

// ── Fila de comanda ────────────────────────────────────────────────────────
const FilaComanda = ({ c, idx }: { c: Comanda; idx: number }) => {
  const [expandida, setExpandida] = useState(false);
  const totalPlatos = c.items.reduce((s, i) => s + i.cantidad, 0);
  const etiquetaTipo =
    c.tipo === 'MESA'     ? `Mesa ${c.mesas ?? '—'}` :
    c.tipo === 'LLEVAR'   ? 'Para llevar' : 'Delivery';
  const colorEstado =
    c.estado === 'ABIERTO' ? 'bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300' :
    c.estado === 'PAGADO'  ? 'bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-300' :
                             'bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-300';

  return (
    <div className={`rounded-2xl border bg-superficie transition ${expandida ? 'border-amber-400' : 'border-borde'}`}>
      {/* Cabecera de la comanda */}
      <button
        onClick={() => setExpandida((v) => !v)}
        className="flex w-full items-center gap-3 p-3 text-left"
      >
        {/* Número */}
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-fondo text-sm font-bold text-tinta-3">
          {idx + 1}
        </span>

        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className="font-semibold">#{c.id_pedidos}</span>
            <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${colorEstado}`}>
              {c.estado}
            </span>
            <span className="text-sm text-tinta-3">{etiquetaTipo}</span>
          </div>
          <div className="mt-0.5 flex flex-wrap items-center gap-3 text-xs text-tinta-3">
            <span className="flex items-center gap-1"><User className="h-3 w-3" />{c.mozoNombre}</span>
            <span className="flex items-center gap-1"><Clock className="h-3 w-3" />{fechaHora(c.creadoEn)}</span>
            <span className="flex items-center gap-1"><UtensilsCrossed className="h-3 w-3" />{totalPlatos} plato{totalPlatos !== 1 ? 's' : ''}</span>
          </div>
        </div>

        {expandida
          ? <ChevronUp className="h-4 w-4 shrink-0 text-tinta-3" />
          : <ChevronDown className="h-4 w-4 shrink-0 text-tinta-3" />
        }
      </button>

      {/* Detalle expandible */}
      {expandida && (
        <div className="border-t border-borde px-3 pb-3 pt-2">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-xs uppercase tracking-wide text-tinta-3">
                <th className="pb-1 pr-3 font-medium">Plato</th>
                <th className="pb-1 pr-3 text-center font-medium">Cant.</th>
                <th className="pb-1 font-medium">Detalles</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-borde">
              {c.items.map((item, i) => (
                <tr key={i}>
                  <td className="py-1.5 pr-3 font-medium">{item.nombre}</td>
                  <td className="py-1.5 pr-3 text-center">
                    <span className="rounded-lg bg-amber-100 px-2 py-0.5 text-xs font-bold text-amber-800 dark:bg-amber-900/40 dark:text-amber-300">
                      ×{item.cantidad}
                    </span>
                  </td>
                  <td className="py-1.5 text-tinta-3">
                    {[item.opciones, item.nota].filter(Boolean).join(' · ') || <span className="italic">Sin detalles</span>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

// ── Página principal ───────────────────────────────────────────────────────
const ParrillaDia = () => {
  const { datos: d, error, cargando, recargar } = useDatos(
    () => api.get<DashboardParrilla>('/parrilla/dashboard').then((r) => r.data),
    [],
    30_000
  );

  if (cargando && !d) return <Spinner texto="Cargando parrilla…" />;
  if (!d) return <Aviso>{error ?? 'No se pudo cargar el dashboard de parrilla'}</Aviso>;

  return (
    <div className="mx-auto max-w-5xl space-y-5">

      {/* Encabezado */}
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">Parrilla — Resumen del día</h1>
          <p className="text-sm text-tinta-3">{fechaLarga(d.fecha)}</p>
        </div>
        <button
          onClick={() => recargar()}
          className="inline-flex h-10 items-center gap-2 rounded-xl border border-borde bg-superficie px-3 text-sm text-tinta-2 hover:bg-fondo"
        >
          <RefreshCw className={`h-4 w-4 ${cargando ? 'animate-spin' : ''}`} />
          Actualizar
        </button>
      </header>

      {error && <Aviso>Sin conexión: mostrando los últimos datos.</Aviso>}

      {/* ── Tarjetas KPI ── */}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <KpiCard
          icono={UtensilsCrossed}
          etiqueta="Total platos vendidos"
          valor={d.stats.totalPlatos}
          sub="unidades del día"
          color="amber"
        />
        <KpiCard
          icono={ClipboardList}
          etiqueta="Comandas emitidas"
          valor={d.stats.totalComandas}
          sub="pedidos con ítems de parrilla"
          color="blue"
        />
        <KpiCard
          icono={LayoutGrid}
          etiqueta="Tipos de platos"
          valor={d.stats.tiposDistintos}
          sub="platos distintos pedidos"
          color="green"
        />
        <KpiCard
          icono={TrendingUp}
          etiqueta="Plato más vendido"
          valor={d.stats.platoMasVendido?.nombre ?? '—'}
          sub={d.stats.platoMasVendido ? `${d.stats.platoMasVendido.cantidad} unidades` : 'Sin ventas aún'}
          color="purple"
        />
      </div>

      <div className="grid gap-4 lg:grid-cols-[1fr_280px]">

        {/* ── Comandas del día ── */}
        <section>
          <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-tinta-3">
            Comandas del día ({d.comandas.length})
          </h2>
          {d.comandas.length === 0 ? (
            <Tarjeta>
              <p className="py-6 text-center text-tinta-3">Aún no hay comandas de parrilla hoy</p>
            </Tarjeta>
          ) : (
            <div className="space-y-2">
              {d.comandas.map((c, i) => (
                <FilaComanda key={c.id_pedidos} c={c} idx={i} />
              ))}
            </div>
          )}
        </section>

        {/* ── Ranking de platos ── */}
        <section>
          <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-tinta-3">
            Ranking de platos
          </h2>
          <Tarjeta>
            {d.ranking.length === 0 ? (
              <p className="py-4 text-center text-sm text-tinta-3">Sin datos</p>
            ) : (
              <ol className="space-y-3">
                {d.ranking.map((r, i) => {
                  const max = d.ranking[0].cantidad;
                  const pct = max > 0 ? Math.round((r.cantidad / max) * 100) : 0;
                  return (
                    <li key={r.nombre}>
                      <div className="mb-1 flex items-center justify-between gap-2 text-sm">
                        <div className="flex items-center gap-2 min-w-0">
                          <span className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-xs font-bold ${
                            i === 0 ? 'bg-amber-500 text-white' :
                            i === 1 ? 'bg-tinta-3/30 text-tinta-2' :
                            i === 2 ? 'bg-tinta-3/20 text-tinta-2' : 'bg-transparent text-tinta-3'
                          }`}>{i + 1}</span>
                          <span className="truncate font-medium">{r.nombre}</span>
                        </div>
                        <span className="shrink-0 font-bold text-amber-600 dark:text-amber-400">
                          {r.cantidad}
                        </span>
                      </div>
                      <div className="h-1.5 w-full rounded-full bg-fondo">
                        <div
                          className="h-1.5 rounded-full bg-amber-500 transition-all"
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                    </li>
                  );
                })}
              </ol>
            )}
          </Tarjeta>
        </section>
      </div>
    </div>
  );
};

export default ParrillaDia;
