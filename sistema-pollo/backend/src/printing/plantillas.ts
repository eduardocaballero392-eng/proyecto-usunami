import { Documento, Linea } from './documento';
import { formatear } from '../utils/dinero';

const hora = (fecha = new Date()) =>
  fecha.toLocaleTimeString('es-PE', { timeZone: 'America/Lima', hour: '2-digit', minute: '2-digit', hour12: false });
const fechaCorta = (fecha = new Date()) =>
  fecha.toLocaleDateString('es-PE', { timeZone: 'America/Lima', day: '2-digit', month: '2-digit', year: 'numeric' });

export interface CabeceraPedido {
  id_pedidos: number;
  tipo: 'MESA' | 'LLEVAR' | 'DELIVERY';
  mesas: number[];
  mozoNombre: string;
  observacion?: string | null;
}

export interface ItemImpresion {
  cantidad: number;
  productoNombre: string;
  nota?: string | null;
  opciones?: string[];
}

/** "MESA 4 Y 5" | "PARA LLEVAR" | "DELIVERY" */
export const tituloPedido = (p: CabeceraPedido): string => {
  if (p.tipo === 'LLEVAR') return 'PARA LLEVAR';
  if (p.tipo === 'DELIVERY') return 'DELIVERY';
  if (p.mesas.length === 0) return 'MESA';
  const lista = [...p.mesas].sort((a, b) => a - b);
  return `MESA ${lista.length > 1 ? `${lista.slice(0, -1).join(', ')} Y ${lista[lista.length - 1]}` : lista[0]}`;
};

const lineasItems = (items: ItemImpresion[]): Linea[] =>
  items.flatMap((i) => [
    { texto: `${i.cantidad}x ${i.productoNombre}`, negrita: true } as Linea,
    ...(i.opciones ?? []).map((o) => ({ texto: `   + ${o}` }) as Linea),
    ...(i.nota ? [{ texto: `   Nota: ${i.nota}` } as Linea] : []),
    { vacia: true } as Linea,
  ]);

/** RF-008 / RF-009: comanda por área (ronda ≥ 2 → "AGREGADO"). */
export const comanda = (p: CabeceraPedido, items: ItemImpresion[], ronda: number, area: string): Documento => ({
  lineas: [
    { separador: '=' },
    { texto: (ronda >= 2 ? 'AGREGADO - ' : '') + tituloPedido(p), grande: true, negrita: true, alinear: 'centro' },
    { separador: '=' },
    { columnas: [`Pedido #${p.id_pedidos}`, area] },
    { texto: `Mozo: ${p.mozoNombre}` },
    { texto: `Hora: ${hora()}${ronda >= 2 ? `   Ronda ${ronda}` : ''}` },
    ...(p.tipo === 'DELIVERY' && p.observacion ? [{ texto: `Dir: ${p.observacion}` } as Linea] : []),
    { separador: '-' },
    ...lineasItems(items),
    { separador: '-' },
  ],
});

/** RF-012: ticket de anulación. */
export const anulacion = (p: CabeceraPedido, item: ItemImpresion, motivo: string, autorizadoPor: string): Documento => ({
  lineas: [
    { separador: '=' },
    { texto: '*** ANULADO ***', grande: true, negrita: true, alinear: 'centro' },
    { separador: '=' },
    { texto: tituloPedido(p), negrita: true, alinear: 'centro' },
    { texto: `Pedido #${p.id_pedidos}   Hora: ${hora()}` },
    { vacia: true },
    { texto: `${item.cantidad}x ${item.productoNombre}`, negrita: true },
    { vacia: true },
    { texto: `Motivo: ${motivo}` },
    { texto: `Autorizó: ${autorizadoPor}` },
    { separador: '=' },
  ],
});

export interface ItemBoleta {
  cantidad: number;
  descripcion: string;
  precioUnitario: number;
  recargoUnitario: number;
}

export interface PagoBoleta {
  metodo: string;
  monto: number;
  montoRecibido?: number | null;
  vuelto: number;
}

/** RF-024: boleta interna (sin IGV ni datos tributarios). */
export const boleta = (
  serie: string,
  numero: number,
  p: CabeceraPedido,
  items: ItemBoleta[],
  total: number,
  pagos: PagoBoleta[]
): Documento => ({
  lineas: [
    { separador: '=' },
    { texto: 'BOLETA DE VENTA', negrita: true, alinear: 'centro' },
    { separador: '=' },
    { texto: `${serie} - ${String(numero).padStart(8, '0')}`, negrita: true, alinear: 'centro' },
    { vacia: true },
    { columnas: [`Fecha: ${fechaCorta()}`, `Hora: ${hora()}`] },
    { texto: `${p.tipo === 'MESA' ? 'Mesa' : 'Servicio'}: ${tituloPedido(p).replace(/^MESA /, '')}` },
    { texto: `Atendió: ${p.mozoNombre}` },
    { texto: 'Cliente: CLIENTES VARIOS' },
    { separador: '-' },
    { columnas: ['Cant  Descripción', 'Importe'] },
    { separador: '-' },
    ...items.flatMap((i) => [
      { columnas: [`${String(i.cantidad).padEnd(5)} ${i.descripcion}`.slice(0, 32), formatear(i.cantidad * i.precioUnitario)] } as Linea,
      ...(i.recargoUnitario > 0
        ? [{ texto: `      (+ Envase ${formatear(i.cantidad * i.recargoUnitario)})` } as Linea]
        : []),
    ]),
    { separador: '-' },
    { columnas: ['TOTAL S/', formatear(total)], negrita: true },
    { separador: '-' },
    ...pagos.flatMap((pg) => [
      { columnas: [`Pago: ${pg.metodo}`, formatear(pg.montoRecibido ?? pg.monto)] } as Linea,
      ...(pg.vuelto > 0 ? [{ columnas: ['Vuelto:', formatear(pg.vuelto)] } as Linea] : []),
    ]),
    { separador: '-' },
    { texto: 'Gracias por su visita', alinear: 'centro' },
    { separador: '=' },
  ],
});

export interface DatosCierre {
  id_turnos_caja: number;
  cajero: string;
  apertura: string;
  cierre: string;
  montoInicial: number;
  efectivo: number;
  yape: number;
  plin: number;
  montoEsperado: number;
  montoFinal: number;
  diferencia: number;
  pedidos: number;
}

/** RF-021: reporte de cierre de turno. */
export const cierreCaja = (d: DatosCierre): Documento => ({
  lineas: [
    { separador: '=' },
    { texto: 'CIERRE DE CAJA', grande: true, negrita: true, alinear: 'centro' },
    { separador: '=' },
    { texto: `Turno #${d.id_turnos_caja}   Cajero: ${d.cajero}` },
    { texto: `Apertura: ${d.apertura}` },
    { texto: `Cierre:   ${d.cierre}` },
    { texto: `Pedidos cobrados: ${d.pedidos}` },
    { separador: '-' },
    { columnas: ['Monto inicial', formatear(d.montoInicial)] },
    { columnas: ['Ventas efectivo', formatear(d.efectivo)] },
    { columnas: ['Ventas Yape', formatear(d.yape)] },
    { columnas: ['Ventas Plin', formatear(d.plin)] },
    { separador: '-' },
    { columnas: ['Efectivo esperado', formatear(d.montoEsperado)], negrita: true },
    { columnas: ['Efectivo contado', formatear(d.montoFinal)], negrita: true },
    { columnas: ['Diferencia', formatear(d.diferencia)], negrita: true },
    { separador: '=' },
  ],
});

export const prueba = (impresora: string, area: string): Documento => ({
  lineas: [
    { separador: '=' },
    { texto: 'PRUEBA DE IMPRESION', grande: true, negrita: true, alinear: 'centro' },
    { separador: '=' },
    { texto: `Impresora: ${impresora}` },
    { texto: `Área: ${area}` },
    { texto: `${fechaCorta()} ${hora()}` },
    { separador: '-' },
    { texto: 'Si lees esto, la impresora funciona.', alinear: 'centro' },
  ],
});
