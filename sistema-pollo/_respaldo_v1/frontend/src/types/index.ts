// Tipos compartidos con el backend
export type RolUsuario = 'ADMINISTRADOR' | 'COCINERO' | 'BROSTER' | 'PARILLA' | 'CAJA' | 'MOZO';
export type TipoPedido = 'MESA' | 'LLEVAR' | 'DELIVERY';
export type EstadoPedido = 'ABIERTO' | 'ENVIADO' | 'PAGADO' | 'ANULADO';
export type MetodoPago = 'EFECTIVO' | 'YAPE' | 'PLIN';

export interface Usuario {
  id_usuarios: number;
  nombre: string;
  usuario: string;
  rol: RolUsuario;
}

export interface Mozo {
  id_usuarios: number;
  nombre: string;
}

export interface Categoria {
  id_categorias: number;
  nombre: string;
  orden: number;
  activo: boolean;
}

export interface Producto {
  id_productos: number;
  nombre: string;
  precio: number;
  categoriaId: number;
  areaId: number;
  activo: boolean;
}

export interface ItemCarrito {
  productoId: number;
  productoNombre: string;
  cantidad: number;
  precioUnitario: number;
}

export interface DetallePedido {
  id_detalle_pedido: number;
  productoId: number;
  productoNombre?: string;
  cantidad: number;
  precioUnitario: number;
  nota: string | null;
  anulado: boolean;
}

export interface Pedido {
  id_pedidos: number;
  mesaId: number | null;
  usuarioId: number;
  tipo: TipoPedido;
  estado: EstadoPedido;
  total: number;
  creadoEn: string;
  actualizadoEn: string;
  items?: DetallePedido[];
}

export interface Mesa {
  id_mesas: number;
  numero: number;
}

export interface CreatePedidoDto {
  tipo: TipoPedido;
  mesaNumero?: number;
  items: {
    productoId: number;
    cantidad: number;
    nota?: string;
  }[];
}
