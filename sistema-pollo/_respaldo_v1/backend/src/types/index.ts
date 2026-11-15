// Tipos de Usuario
export type RolUsuario = 'ADMINISTRADOR' | 'COCINERO' | 'BROSTER' | 'PARILLA' | 'CAJA' | 'MOZO';

export interface Usuario {
  id_usuarios: number;
  nombre: string;
  usuario: string;
  password: string;
  rol: RolUsuario;
}

// Tipos de Pedido
export type TipoPedido = 'MESA' | 'LLEVAR' | 'DELIVERY';
export type EstadoPedido = 'ABIERTO' | 'ENVIADO' | 'PAGADO' | 'ANULADO';

export interface Pedido {
  id_pedidos: number;
  mesaId: number | null;
  usuarioId: number;
  tipo: TipoPedido;
  estado: EstadoPedido;
  total: number;
  creadoEn: Date;
  actualizadoEn: Date;
}

export interface DetallePedido {
  id_detalle_pedido: number;
  pedidoId: number;
  productoId: number;
  areaId: number;
  cantidad: number;
  precioUnitario: number;
  nota: string | null;
  anulado: boolean;
}

// Tipos de Producto
export interface Producto {
  id_productos: number;
  nombre: string;
  precio: number;
  categoriaId: number;
  areaId: number;
  activo: boolean;
  creadoEn: Date;
}

export interface Categoria {
  id_categorias: number;
  nombre: string;
  orden: number;
  activo: boolean;
}

// Tipos de Impresión
export type EstadoImpresion = 'PENDIENTE' | 'ERROR' | 'IMPRESA';

export interface Impresion {
  id_impresiones: number;
  pedidoId: number;
  impresoraId: number;
  estado: EstadoImpresion;
  intentos: number;
  error: string | null;
  creadoEn: Date;
  actualizadoEn: Date;
}

// Tipos de Caja
export type MetodoPago = 'EFECTIVO' | 'YAPE' | 'PLIN';

export interface TurnoCaja {
  id_caja: number;
  usuarioId: number;
  montoInicial: number;
  montoFinal: number | null;
  apertura: Date;
  cierre: Date | null;
}

export interface Pago {
  id_pago: number;
  pedidoId: number;
  turnoCajaId: number | null;
  metodo: MetodoPago;
  monto: number;
  creadoEn: Date;
}

// Request types para API
export interface CrearPedidoRequest {
  tipo: TipoPedido;
  mesaNumero?: number;
  items: {
    productoId: number;
    cantidad: number;
    nota?: string;
  }[];
}
