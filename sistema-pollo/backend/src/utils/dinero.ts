/**
 * Utilidades de dinero. Internamente se calcula en CÉNTIMOS (enteros) para evitar
 * errores de coma flotante; la BD guarda DECIMAL(10,2).
 */

/** "12.50" | 12.5 → 1250 */
export const aCentimos = (valor: string | number | null | undefined): number =>
  Math.round(Number(valor ?? 0) * 100);

/** 1250 → 12.5 */
export const deCentimos = (centimos: number): number => Math.round(centimos) / 100;

/** "12.50" | 12.5 → 12.5 (redondeado a 2 decimales) */
export const aNumero = (valor: string | number | null | undefined): number => deCentimos(aCentimos(valor));

/** 12.5 → "12.50" */
export const formatear = (valor: number | string): string => aNumero(valor).toFixed(2);
