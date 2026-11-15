// Tipos compartidos con el backend (ver backend/src/services/*)

export type Rol = 'ADMIN' | 'CAJERO' | 'COCINERO' | 'PARRILLA' | 'BROASTER' | 'MOZO';
export type TipoPedido = 'MESA' | 'LLEVAR' | 'DELIVERY';
export type EstadoPedido = 'ABIERTO' | 'PAGADO' | 'ANULADO';
export type MetodoPago = 'EFECTIVO' | 'YAPE' | 'PLIN';

export const ROLES: { valor: Rol; etiqueta: string }[] = [
  { valor: 'MOZO', etiqueta: 'Mozo' },
  { valor: 'CAJERO', etiqueta: 'Cajero' },
  { valor: 'PARRILLA', etiqueta: 'Parrilla' },
  { valor: 'BROASTER', etiqueta: 'Broaster' },
  { valor: 'COCINERO', etiqueta: 'Cocina (carta)' },
  { valor: 'ADMIN', etiqueta: 'Administrador' },
];

export interface UsuarioSesion {
  id: number;
  nombre: string;
  rol: Rol;
}

export interface MozoLista {
  id_usuarios: number;
  nombre: string;
  tienePin: boolean;
}

export interface Opcion {
  id_opciones_producto: number;
  nombre: string;
  precioExtra: number;
}

export interface ProductoMenu {
  id_productos: number;
  nombre: string;
  descripcion: string | null;
  precio: number;
  recargoLlevar: number;
  foto: string | null;
  categoriaId: number;
  areaId: number;
  opciones: Opcion[];
}

export interface CategoriaMenu {
  id_categorias: number;
  nombre: string;
  orden: number;
  productos: ProductoMenu[];
}

export interface MesaEstado {
  id_mesas: number;
  numero: number;
  ocupada: boolean;
  pedidoId: number | null;
  mozoNombre: string | null;
  total: number | null;
  desde: string | null;
}

export interface ItemPedido {
  id_detalle_pedidos: number;
  productoId: number;
  productoNombre: string;
  areaNombre: string;
  cantidad: number;
  precioUnitario: number;
  recargoUnitario: number;
  ronda: number;
  nota: string | null;
  opciones: string | null;
  anulado: boolean;
  motivoAnulacion: string | null;
}

export interface ImpresionResumen {
  id_impresiones: number;
  area: string;
  tipo: string;
  ronda: number | null;
  estado: 'PENDIENTE' | 'IMPRESA' | 'ERROR';
  error: string | null;
}

export interface Pedido {
  id_pedidos: number;
  usuarioId: number;
  mozoNombre: string;
  tipo: TipoPedido;
  estado: EstadoPedido;
  total: number;
  observacion: string | null;
  creadoEn: string;
  mesas: number[];
  items: ItemPedido[];
  impresiones: ImpresionResumen[];
}

export interface Turno {
  id_turnos_caja: number;
  cajero: string;
  apertura: string;
  cierre: string | null;
  montoInicial: number;
  montoEsperado: number;
  montoFinal: number | null;
  diferencia: number | null;
  efectivo: number;
  yape: number;
  plin: number;
  pedidos: number;
  totalVentas: number;
}

// --- Reportes ---
export interface Dashboard {
  generadoEn: string;
  fecha: string;
  mesas: { total: number; ocupadas: number; libres: number };
  pedidosActivos: {
    total: number;
    porTipo: Record<TipoPedido, number>;
    montoPorCobrar: number;
    minutosMasAntiguo: number | null;
    porMozo: { nombre: string; pedidos: number; monto: number }[];
  };
  hoy: {
    ventas: number;
    pedidos: number;
    ticketPromedio: number;
    anulados: number;
    horaPico: { hora: number; total: number; pedidos: number } | null;
  };
  ayer: { ventasMismaHora: number; ventasDiaCompleto: number };
  ventasPorHora: PuntoHora[];
  impresionesConError: number;
  turnosAbiertos: { id_turnos_caja: number; cajero: string; apertura: string }[];
}

export interface PuntoHora {
  hora: number;
  pedidos: number;
  total: number;
}

export interface ResumenVentas {
  ventas: number;
  pedidos: number;
  ticketPromedio: number;
}

export interface AnalisisPeriodo {
  ventas: ResumenVentas & {
    desde: string;
    hasta: string;
    anterior: ResumenVentas;
    anulados: { pedidos: number; monto: number };
    porMetodo: { metodo: MetodoPago; pagos: number; total: number }[];
    porDia: { fecha: string; pedidos: number; total: number }[];
  };
  productos: { id_productos: number; nombre: string; categoria: string; cantidad: number; total: number }[];
  mozos: { id_usuarios: number; nombre: string; rol: Rol; pedidos: number; total: number; ticketPromedio: number }[];
  categorias: { id_categorias: number; nombre: string; cantidad: number; total: number; porcentaje: number }[];
  areas: { id_areas: number; nombre: string; items: number; total: number }[];
  horas: PuntoHora[];
}

export interface TurnoReporte {
  id_turnos_caja: number;
  cajero: string;
  apertura: string;
  cierre: string | null;
  montoInicial: number;
  montoEsperado: number | null;
  montoFinal: number | null;
  diferencia: number | null;
  efectivo: number;
  yape: number;
  plin: number;
  pedidos: number;
}
