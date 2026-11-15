export const ROLES = ['ADMIN', 'CAJERO', 'COCINERO', 'PARRILLA', 'BROASTER', 'MOZO'] as const;
export type Rol = (typeof ROLES)[number];

export const ROLES_COCINA: Rol[] = ['COCINERO', 'PARRILLA', 'BROASTER'];

export type TipoPedido = 'MESA' | 'LLEVAR' | 'DELIVERY';
export type EstadoPedido = 'ABIERTO' | 'PAGADO' | 'ANULADO';
export type MetodoPago = 'EFECTIVO' | 'YAPE' | 'PLIN';

/** Usuario autenticado adjunto a cada request */
export interface UsuarioSesion {
  id: number;
  nombre: string;
  rol: Rol;
}

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      usuario?: UsuarioSesion;
    }
  }
}
