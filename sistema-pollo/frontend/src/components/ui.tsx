import { ButtonHTMLAttributes, InputHTMLAttributes, ReactNode, SelectHTMLAttributes, useCallback, useEffect, useRef, useState } from 'react';
import { AlertTriangle, CheckCircle2, Clock, Loader2, X } from 'lucide-react';
import { mensajeError } from '../api/cliente';

// --- Botón (mín. 44 px de alto para uso táctil) ---
type Variante = 'primario' | 'secundario' | 'peligro' | 'fantasma';
const estilos: Record<Variante, string> = {
  primario: 'bg-amber-500 text-white hover:bg-amber-600 active:bg-amber-700 shadow-sm',
  secundario: 'bg-superficie text-tinta border border-borde hover:bg-fondo',
  peligro: 'bg-red-600 text-white hover:bg-red-700',
  fantasma: 'text-tinta-2 hover:bg-fondo',
};

export const Boton = ({
  variante = 'primario',
  cargando,
  className = '',
  children,
  disabled,
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { variante?: Variante; cargando?: boolean }) => (
  <button
    className={`inline-flex min-h-[44px] items-center justify-center gap-2 rounded-xl px-4 font-semibold transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-amber-500 disabled:cursor-not-allowed disabled:opacity-50 ${estilos[variante]} ${className}`}
    disabled={disabled || cargando}
    {...props}
  >
    {cargando && <Loader2 className="h-4 w-4 animate-spin" aria-hidden />}
    {children}
  </button>
);

// --- Campos ---
export const Campo = ({ etiqueta, ayuda, className = '', ...props }: InputHTMLAttributes<HTMLInputElement> & { etiqueta: string; ayuda?: string }) => (
  <label className={`block ${className}`}>
    <span className="mb-1 block text-sm font-medium text-tinta-2">{etiqueta}</span>
    <input
      className="min-h-[44px] w-full rounded-xl border border-borde bg-superficie px-3 text-tinta placeholder:text-tinta-3 focus:border-amber-500 focus:outline-none focus:ring-2 focus:ring-amber-500/30"
      {...props}
    />
    {ayuda && <span className="mt-1 block text-xs text-tinta-3">{ayuda}</span>}
  </label>
);

export const Selector = ({ etiqueta, children, className = '', ...props }: SelectHTMLAttributes<HTMLSelectElement> & { etiqueta: string }) => (
  <label className={`block ${className}`}>
    <span className="mb-1 block text-sm font-medium text-tinta-2">{etiqueta}</span>
    <select
      className="min-h-[44px] w-full rounded-xl border border-borde bg-superficie px-3 text-tinta focus:border-amber-500 focus:outline-none focus:ring-2 focus:ring-amber-500/30"
      {...props}
    >
      {children}
    </select>
  </label>
);

// --- Contenedores ---
export const Tarjeta = ({ children, className = '' }: { children: ReactNode; className?: string }) => (
  <section className={`rounded-2xl border border-borde bg-superficie p-4 sm:p-5 ${className}`}>{children}</section>
);

export const Spinner = ({ texto }: { texto?: string }) => (
  <div className="flex items-center justify-center gap-2 py-10 text-tinta-3" role="status">
    <Loader2 className="h-6 w-6 animate-spin" aria-hidden />
    {texto && <span>{texto}</span>}
  </div>
);

export const Aviso = ({ tipo = 'error', children, onCerrar }: { tipo?: 'error' | 'exito' | 'info'; children: ReactNode; onCerrar?: () => void }) => {
  const s = {
    error: 'border-red-300 bg-red-50 text-red-800 dark:border-red-900 dark:bg-red-950/50 dark:text-red-200',
    exito: 'border-green-300 bg-green-50 text-green-800 dark:border-green-900 dark:bg-green-950/50 dark:text-green-200',
    info: 'border-borde bg-fondo text-tinta-2',
  }[tipo];
  const Icono = tipo === 'exito' ? CheckCircle2 : AlertTriangle;
  return (
    <div className={`flex items-start gap-2 rounded-xl border px-3 py-2 text-sm ${s}`} role={tipo === 'error' ? 'alert' : 'status'}>
      <Icono className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
      <div className="flex-1">{children}</div>
      {onCerrar && (
        <button onClick={onCerrar} aria-label="Cerrar aviso" className="-m-1 p-1 opacity-70 hover:opacity-100">
          <X className="h-4 w-4" />
        </button>
      )}
    </div>
  );
};

/** Estado de impresión: siempre ícono + texto, nunca sólo color. */
export const EstadoImpresion = ({ estado }: { estado: 'PENDIENTE' | 'IMPRESA' | 'ERROR' }) => {
  const cfg = {
    IMPRESA: { Icono: CheckCircle2, texto: 'Impresa', cls: 'text-green-700 dark:text-green-400' },
    PENDIENTE: { Icono: Clock, texto: 'En cola', cls: 'text-tinta-3' },
    ERROR: { Icono: AlertTriangle, texto: 'Error', cls: 'text-red-700 dark:text-red-400' },
  }[estado];
  return (
    <span className={`inline-flex items-center gap-1 text-xs font-medium ${cfg.cls}`}>
      <cfg.Icono className="h-3.5 w-3.5" aria-hidden />
      {cfg.texto}
    </span>
  );
};

export const Modal = ({ abierto, titulo, onCerrar, children, ancho = 'max-w-md' }: { abierto: boolean; titulo: string; onCerrar: () => void; children: ReactNode; ancho?: string }) => {
  useEffect(() => {
    if (!abierto) return;
    const esc = (e: KeyboardEvent) => e.key === 'Escape' && onCerrar();
    document.addEventListener('keydown', esc);
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', esc);
      document.body.style.overflow = '';
    };
  }, [abierto, onCerrar]);
  if (!abierto) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center" role="dialog" aria-modal="true" aria-label={titulo}>
      <div className="absolute inset-0 bg-black/50" onClick={onCerrar} />
      <div className={`relative max-h-[92vh] w-full ${ancho} overflow-y-auto rounded-t-2xl bg-superficie shadow-xl sm:rounded-2xl`}>
        <div className="sticky top-0 z-10 flex items-center justify-between border-b border-borde bg-superficie px-4 py-3">
          <h2 className="text-lg font-semibold">{titulo}</h2>
          <button onClick={onCerrar} className="flex h-11 w-11 items-center justify-center rounded-xl hover:bg-fondo" aria-label="Cerrar">
            <X className="h-5 w-5" />
          </button>
        </div>
        <div className="p-4">{children}</div>
      </div>
    </div>
  );
};

// --- Carga de datos ---
/** Ejecuta `fn` al montar (y cada `refrescoMs` si se indica). */
export function useDatos<T>(fn: () => Promise<T>, deps: unknown[] = [], refrescoMs?: number) {
  const [datos, setDatos] = useState<T | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [cargando, setCargando] = useState(true);
  const fnRef = useRef(fn);
  fnRef.current = fn;

  const recargar = useCallback(async (silencioso = false) => {
    if (!silencioso) setCargando(true);
    try {
      setDatos(await fnRef.current());
      setError(null);
    } catch (e) {
      setError(mensajeError(e));
    } finally {
      setCargando(false);
    }
  }, []);

  useEffect(() => {
    recargar();
    if (!refrescoMs) return;
    const t = setInterval(() => document.visibilityState === 'visible' && recargar(true), refrescoMs);
    return () => clearInterval(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);

  return { datos, error, cargando, recargar, setDatos };
}
