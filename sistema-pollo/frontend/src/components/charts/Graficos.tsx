import { ReactNode, useEffect, useMemo, useRef, useState } from 'react';
import { ArrowDownRight, ArrowUpRight, Minus, Table2, BarChart3 } from 'lucide-react';

/*
 * Gráficos hechos a mano (sin librerías): ligeros y funcionan sin internet.
 * Reglas aplicadas:
 *   · Datos en un solo tono (azul "serie"); gris neutro sólo como contexto.
 *   · Rejilla de 1px sólida y discreta; línea de 2px; marcadores ≥ 8px.
 *   · Hover siempre: crosshair + tooltip en líneas; tooltip por barra en barras.
 *   · Texto con tokens de tinta, nunca con el color de la serie.
 *   · Cada gráfico ofrece vista de tabla (accesibilidad).
 */

// --- KPI ---------------------------------------------------------------------------

export const Variacion = ({ pct, contexto, invertir = false }: { pct: number | null; contexto: string; invertir?: boolean }) => {
  if (pct === null) return <p className="text-xs text-tinta-3">Sin datos para comparar {contexto}</p>;
  const sube = pct > 0.05;
  const baja = pct < -0.05;
  const bueno = invertir ? baja : sube;
  const malo = invertir ? sube : baja;
  const Icono = sube ? ArrowUpRight : baja ? ArrowDownRight : Minus;
  const color = bueno ? 'text-green-700 dark:text-green-400' : malo ? 'text-red-700 dark:text-red-400' : 'text-tinta-3';
  return (
    <p className="flex items-center gap-1 text-xs">
      <span className={`inline-flex items-center gap-0.5 font-semibold ${color}`}>
        <Icono className="h-3.5 w-3.5" aria-hidden />
        {pct > 0 ? '+' : ''}
        {pct.toFixed(1)}%
      </span>
      <span className="text-tinta-3">{contexto}</span>
    </p>
  );
};

export const Kpi = ({ etiqueta, valor, pie, heroe = false }: { etiqueta: string; valor: ReactNode; pie?: ReactNode; heroe?: boolean }) => (
  <div className="flex min-w-0 flex-col gap-1">
    <p className="text-sm text-tinta-2">{etiqueta}</p>
    <p className={`font-semibold leading-none tracking-tight ${heroe ? 'text-5xl' : 'text-3xl'}`}>{valor}</p>
    {pie && <div className="mt-1">{pie}</div>}
  </div>
);

// --- Contenedor con alternador gráfico/tabla -------------------------------------------

export interface ColumnaTabla<T> {
  titulo: string;
  valor: (fila: T) => ReactNode;
  derecha?: boolean;
}

export function TarjetaGrafico<T>({
  titulo,
  subtitulo,
  acciones,
  filas,
  columnas,
  children,
  vacio = 'Sin datos en este período',
}: {
  titulo: string;
  subtitulo?: string;
  acciones?: ReactNode;
  filas: T[];
  columnas: ColumnaTabla<T>[];
  children: ReactNode;
  vacio?: string;
}) {
  const [tabla, setTabla] = useState(false);
  return (
    <section className="flex min-w-0 flex-col rounded-2xl border border-borde bg-superficie p-4 sm:p-5">
      <header className="mb-4 flex flex-wrap items-start justify-between gap-2">
        <div className="min-w-0">
          <h3 className="font-semibold">{titulo}</h3>
          {subtitulo && <p className="text-sm text-tinta-3">{subtitulo}</p>}
        </div>
        <div className="flex items-center gap-2">
          {acciones}
          <button
            onClick={() => setTabla((t) => !t)}
            className="inline-flex h-9 items-center gap-1 rounded-lg border border-borde px-2 text-xs text-tinta-2 hover:bg-fondo"
            aria-pressed={tabla}
          >
            {tabla ? <BarChart3 className="h-3.5 w-3.5" /> : <Table2 className="h-3.5 w-3.5" />}
            {tabla ? 'Gráfico' : 'Tabla'}
          </button>
        </div>
      </header>
      {filas.length === 0 ? (
        <p className="py-10 text-center text-sm text-tinta-3">{vacio}</p>
      ) : tabla ? (
        <div className="max-h-96 overflow-auto">
          <table className="w-full text-sm">
            <thead className="sticky top-0 bg-superficie text-left text-tinta-3">
              <tr>
                {columnas.map((c) => (
                  <th key={c.titulo} className={`border-b border-borde py-2 pr-3 font-medium ${c.derecha ? 'text-right' : ''}`}>
                    {c.titulo}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filas.map((f, i) => (
                <tr key={i} className="border-b border-borde/60">
                  {columnas.map((c) => (
                    <td key={c.titulo} className={`py-1.5 pr-3 ${c.derecha ? 'num text-right' : ''}`}>
                      {c.valor(f)}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        children
      )}
    </section>
  );
}

// --- Línea en el tiempo (con crosshair) -----------------------------------------------------

const useAncho = () => {
  const ref = useRef<HTMLDivElement>(null);
  const [ancho, setAncho] = useState(0);
  useEffect(() => {
    if (!ref.current) return;
    const ro = new ResizeObserver(([e]) => setAncho(e.contentRect.width));
    ro.observe(ref.current);
    return () => ro.disconnect();
  }, []);
  return { ref, ancho };
};

/** Escala "bonita" para el eje Y: 0 … máximo redondeado, 4 divisiones. */
const ticksY = (max: number) => {
  if (max <= 0) return [0, 1];
  const paso0 = max / 4;
  const mag = 10 ** Math.floor(Math.log10(paso0));
  const paso = [1, 2, 2.5, 5, 10].map((m) => m * mag).find((p) => p >= paso0) ?? paso0;
  return Array.from({ length: Math.ceil(max / paso) + 1 }, (_, i) => i * paso);
};

export interface PuntoLinea {
  etiqueta: string; // eje X
  detalle: string; // encabezado del tooltip
  valor: number;
  extra?: string; // línea secundaria del tooltip
}

export const LineaTiempo = ({
  puntos,
  formatoY,
  formatoValor,
  alto = 220,
  marcar,
}: {
  puntos: PuntoLinea[];
  formatoY: (n: number) => string;
  formatoValor: (n: number) => string;
  alto?: number;
  /** índice a destacar con etiqueta directa (p. ej. hora pico) */
  marcar?: number | null;
}) => {
  const { ref, ancho } = useAncho();
  const [hover, setHover] = useState<number | null>(null);

  const m = { arriba: 12, derecha: 12, abajo: 26, izquierda: 64 };
  const w = Math.max(0, ancho - m.izquierda - m.derecha);
  const h = alto - m.arriba - m.abajo;
  const ticks = useMemo(() => ticksY(Math.max(...puntos.map((p) => p.valor), 0)), [puntos]);
  const maxY = ticks[ticks.length - 1] || 1;
  const x = (i: number) => (puntos.length <= 1 ? w / 2 : (i / (puntos.length - 1)) * w);
  const y = (v: number) => h - (v / maxY) * h;

  const linea = puntos.map((p, i) => `${i ? 'L' : 'M'}${x(i).toFixed(1)},${y(p.valor).toFixed(1)}`).join(' ');
  const area = puntos.length ? `${linea} L${x(puntos.length - 1)},${h} L${x(0)},${h} Z` : '';
  // Etiquetas del eje X: como máximo ~8 para que no choquen
  const cadaX = Math.max(1, Math.ceil(puntos.length / Math.max(2, Math.floor(w / 70))));

  const mover = (clientX: number, rect: DOMRect) => {
    if (!puntos.length) return;
    const rel = clientX - rect.left - m.izquierda;
    const i = puntos.length <= 1 ? 0 : Math.round((rel / w) * (puntos.length - 1));
    setHover(Math.min(puntos.length - 1, Math.max(0, i)));
  };

  const p = hover !== null ? puntos[hover] : null;
  const tipIzq = hover !== null ? m.izquierda + x(hover) : 0;

  return (
    <div ref={ref} className="relative w-full select-none" style={{ height: alto }}>
      {ancho > 0 && (
        <svg
          width={ancho}
          height={alto}
          role="img"
          aria-label="Gráfico de línea"
          onPointerMove={(e) => mover(e.clientX, e.currentTarget.getBoundingClientRect())}
          onPointerLeave={() => setHover(null)}
          className="touch-none"
        >
          <g transform={`translate(${m.izquierda},${m.arriba})`}>
            {ticks.map((t) => (
              <g key={t}>
                <line x1={0} x2={w} y1={y(t)} y2={y(t)} stroke="rgb(var(--borde))" strokeWidth={1} />
                <text x={-8} y={y(t)} dy="0.32em" textAnchor="end" className="fill-tinta-3 text-[11px]">
                  {formatoY(t)}
                </text>
              </g>
            ))}
            {puntos.map((pt, i) =>
              i % cadaX === 0 || i === puntos.length - 1 ? (
                <text
                  key={i}
                  x={x(i)}
                  y={h + 18}
                  textAnchor={puntos.length > 1 && i === 0 ? 'start' : puntos.length > 1 && i === puntos.length - 1 ? 'end' : 'middle'}
                  className="fill-tinta-3 text-[11px]"
                >
                  {pt.etiqueta}
                </text>
              ) : null
            )}
            <path d={area} fill="rgb(var(--serie))" fillOpacity={0.1} />
            <path d={linea} fill="none" stroke="rgb(var(--serie))" strokeWidth={2} strokeLinejoin="round" strokeLinecap="round" />

            {marcar !== undefined && marcar !== null && puntos[marcar] && hover === null && (
              <g>
                <circle cx={x(marcar)} cy={y(puntos[marcar].valor)} r={4.5} fill="rgb(var(--serie))" stroke="rgb(var(--superficie))" strokeWidth={2} />
                <text
                  x={x(marcar)}
                  y={y(puntos[marcar].valor) - 10}
                  textAnchor={x(marcar) > w - 60 ? 'end' : x(marcar) < 60 ? 'start' : 'middle'}
                  className="fill-tinta text-[11px] font-semibold"
                >
                  Pico {formatoValor(puntos[marcar].valor)}
                </text>
              </g>
            )}

            {hover !== null && p && (
              <g pointerEvents="none">
                <line x1={x(hover)} x2={x(hover)} y1={0} y2={h} stroke="rgb(var(--tinta-3))" strokeWidth={1} />
                <circle cx={x(hover)} cy={y(p.valor)} r={4.5} fill="rgb(var(--serie))" stroke="rgb(var(--superficie))" strokeWidth={2} />
              </g>
            )}
          </g>
        </svg>
      )}
      {p && (
        <div
          className="pointer-events-none absolute top-0 z-10 rounded-lg border border-borde bg-superficie px-3 py-2 text-xs shadow-lg"
          style={{ left: Math.min(Math.max(tipIzq, 70), ancho - 70), transform: 'translateX(-50%)' }}
        >
          <p className="text-tinta-3">{p.detalle}</p>
          <p className="flex items-center gap-1.5 font-semibold">
            <span className="inline-block h-2 w-2 rounded-full bg-serie" aria-hidden />
            {formatoValor(p.valor)}
          </p>
          {p.extra && <p className="text-tinta-2">{p.extra}</p>}
        </div>
      )}
    </div>
  );
};

// --- Barras horizontales ordenadas ------------------------------------------------------------

export interface FilaBarra {
  clave: string | number;
  etiqueta: string;
  sub?: string; // texto secundario bajo la etiqueta
  valor: number; // define el largo
  texto: string; // valor mostrado a la derecha
  tooltip?: string;
}

export const BarrasRanking = ({ filas, max }: { filas: FilaBarra[]; max?: number }) => {
  const tope = max ?? Math.max(...filas.map((f) => f.valor), 0);
  const [activa, setActiva] = useState<string | number | null>(null);
  return (
    <ol className="space-y-2.5">
      {filas.map((f, i) => {
        const pct = tope > 0 ? (f.valor / tope) * 100 : 0;
        return (
          <li
            key={f.clave}
            tabIndex={0}
            onPointerEnter={() => setActiva(f.clave)}
            onPointerLeave={() => setActiva(null)}
            onFocus={() => setActiva(f.clave)}
            onBlur={() => setActiva(null)}
            className="group relative grid grid-cols-[minmax(0,1fr)_auto] items-center gap-x-3 gap-y-1 rounded-lg outline-none focus-visible:ring-2 focus-visible:ring-amber-500"
          >
            <div className="min-w-0">
              <p className="truncate text-sm">
                <span className="num mr-1.5 text-tinta-3">{i + 1}.</span>
                {f.etiqueta}
                {f.sub && <span className="ml-1.5 text-xs text-tinta-3">{f.sub}</span>}
              </p>
            </div>
            <p className="num text-right text-sm font-medium">{f.texto}</p>
            <div className="col-span-2 h-2.5 w-full rounded-full bg-serie-suave/40">
              <div
                className={`h-full rounded-full bg-serie transition-[filter] ${activa === f.clave ? 'brightness-110' : ''}`}
                style={{ width: `${Math.max(pct, f.valor > 0 ? 1.5 : 0)}%` }}
              />
            </div>
            {activa === f.clave && f.tooltip && (
              <div className="pointer-events-none absolute -top-9 right-0 z-10 whitespace-nowrap rounded-lg border border-borde bg-superficie px-2.5 py-1 text-xs shadow-lg">
                {f.tooltip}
              </div>
            )}
          </li>
        );
      })}
    </ol>
  );
};

// --- Medidor (una razón contra su total) ------------------------------------------------------

export const Medidor = ({ valor, total, etiqueta }: { valor: number; total: number; etiqueta: string }) => {
  const pct = total > 0 ? Math.min(100, (valor / total) * 100) : 0;
  return (
    <div>
      <div className="h-3 w-full overflow-hidden rounded-full bg-serie-suave/60" role="meter" aria-valuenow={valor} aria-valuemin={0} aria-valuemax={total} aria-label={etiqueta}>
        <div className="h-full rounded-full bg-serie" style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
};
