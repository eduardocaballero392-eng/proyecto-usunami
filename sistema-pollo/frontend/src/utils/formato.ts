const soles = new Intl.NumberFormat('es-PE', { style: 'currency', currency: 'PEN', minimumFractionDigits: 2 });
const solesCompacto = new Intl.NumberFormat('es-PE', { style: 'currency', currency: 'PEN', notation: 'compact', maximumFractionDigits: 1 });
const entero = new Intl.NumberFormat('es-PE');

/** 1234.5 → "S/ 1,234.50" */
export const S = (n: number) => soles.format(n ?? 0);
/** 12345 → "S/ 12.3 mil" (ejes y etiquetas cortas) */
export const Scorto = (n: number) => (Math.abs(n) < 1000 ? S(n) : solesCompacto.format(n));
export const num = (n: number) => entero.format(n ?? 0);

/** 13 → "13:00" */
export const hora = (h: number) => `${String(h).padStart(2, '0')}:00`;

/** "2026-11-13 22:10:05" → "22:10" */
export const horaDe = (fecha: string) => fecha.slice(11, 16);

/** "2026-11-13" → "vie 13 nov" */
export const fechaCorta = (iso: string) =>
  new Date(`${iso.slice(0, 10)}T12:00:00`).toLocaleDateString('es-PE', { weekday: 'short', day: 'numeric', month: 'short' });

/** "2026-11-13" → "Viernes, 13 de noviembre" */
export const fechaLarga = (iso: string) => {
  const t = new Date(`${iso.slice(0, 10)}T12:00:00`).toLocaleDateString('es-PE', { weekday: 'long', day: 'numeric', month: 'long' });
  return t.charAt(0).toUpperCase() + t.slice(1);
};

/** "2026-11-13 22:10:05" → "13/11 22:10" */
export const fechaHora = (f: string) => `${f.slice(8, 10)}/${f.slice(5, 7)} ${f.slice(11, 16)}`;

/** Variación porcentual; null si no hay base para comparar. */
export const variacion = (actual: number, anterior: number): number | null =>
  anterior > 0 ? ((actual - anterior) / anterior) * 100 : null;

export const minutosDesde = (fecha: string) => Math.max(0, Math.round((Date.now() - new Date(fecha.replace(' ', 'T') + '-05:00').getTime()) / 60000));

export const tituloPedido = (p: { tipo: string; mesas: number[] }) => {
  if (p.tipo === 'LLEVAR') return 'Para llevar';
  if (p.tipo === 'DELIVERY') return 'Delivery';
  return p.mesas.length > 1 ? `Mesas ${p.mesas.join(' y ')}` : `Mesa ${p.mesas[0] ?? '?'}`;
};

/** Fecha de hoy en Lima, YYYY-MM-DD */
export const hoyLima = () => new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Lima' }).format(new Date());

export const sumarDias = (fecha: string, dias: number) => {
  const d = new Date(`${fecha}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() + dias);
  return d.toISOString().slice(0, 10);
};
