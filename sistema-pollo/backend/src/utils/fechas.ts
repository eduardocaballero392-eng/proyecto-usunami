import { ValidationError } from './errors';

const RE_FECHA = /^\d{4}-\d{2}-\d{2}$/;

/** Fecha de hoy en Lima como YYYY-MM-DD */
export const hoyLima = (): string =>
  new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Lima' }).format(new Date());

/** Suma días a una fecha YYYY-MM-DD */
export const sumarDias = (fecha: string, dias: number): string => {
  const d = new Date(`${fecha}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + dias);
  return d.toISOString().slice(0, 10);
};

/**
 * Convierte ?desde=YYYY-MM-DD&hasta=YYYY-MM-DD (inclusive) en un rango semiabierto
 * [inicio, fin) de DATETIME, apto para usar índices:  col >= inicio AND col < fin
 */
export const rangoFechas = (desde?: unknown, hasta?: unknown): { inicio: string; fin: string; desde: string; hasta: string } => {
  const d = typeof desde === 'string' && desde ? desde : hoyLima();
  const h = typeof hasta === 'string' && hasta ? hasta : d;
  if (!RE_FECHA.test(d) || !RE_FECHA.test(h)) throw new ValidationError('Formato de fecha inválido (use AAAA-MM-DD)');
  if (h < d) throw new ValidationError('La fecha final no puede ser anterior a la inicial');
  const dias = (Date.parse(h) - Date.parse(d)) / 86_400_000;
  if (dias > 366) throw new ValidationError('El rango máximo es de 1 año');
  return { desde: d, hasta: h, inicio: `${d} 00:00:00`, fin: `${sumarDias(h, 1)} 00:00:00` };
};
