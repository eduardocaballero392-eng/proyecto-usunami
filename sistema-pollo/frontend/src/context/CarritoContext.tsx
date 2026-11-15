import { createContext, ReactNode, useContext, useMemo, useState } from 'react';
import { Opcion, ProductoMenu } from '../api/tipos';

export interface ItemCarrito {
  clave: string; // producto + opciones + nota → líneas distintas en el carrito
  producto: ProductoMenu;
  cantidad: number;
  opciones: Opcion[];
  nota: string;
}

interface CarritoContexto {
  items: ItemCarrito[];
  /** Si hay un pedido abierto seleccionado, los productos se AGREGAN a ese pedido */
  pedidoDestino: { id: number; titulo: string } | null;
  setPedidoDestino: (p: { id: number; titulo: string } | null) => void;
  agregar: (producto: ProductoMenu, opciones?: Opcion[], nota?: string, cantidad?: number) => void;
  cambiarCantidad: (clave: string, cantidad: number) => void;
  quitar: (clave: string) => void;
  vaciar: () => void;
  totalUnidades: number;
  /** Subtotal sin recargo para llevar (el backend calcula el total definitivo) */
  subtotal: number;
}

const Ctx = createContext<CarritoContexto | null>(null);

export const useCarrito = () => {
  const c = useContext(Ctx);
  if (!c) throw new Error('useCarrito fuera de CarritoProvider');
  return c;
};

export const precioItem = (i: Pick<ItemCarrito, 'producto' | 'opciones'>) =>
  i.producto.precio + i.opciones.reduce((s, o) => s + o.precioExtra, 0);

export const CarritoProvider = ({ children }: { children: ReactNode }) => {
  const [items, setItems] = useState<ItemCarrito[]>([]);
  const [pedidoDestino, setPedidoDestino] = useState<{ id: number; titulo: string } | null>(null);

  const agregar: CarritoContexto['agregar'] = (producto, opciones = [], nota = '', cantidad = 1) => {
    const clave = `${producto.id_productos}|${opciones.map((o) => o.id_opciones_producto).sort().join(',')}|${nota.trim()}`;
    setItems((prev) => {
      const existe = prev.find((i) => i.clave === clave);
      if (existe) return prev.map((i) => (i.clave === clave ? { ...i, cantidad: Math.min(99, i.cantidad + cantidad) } : i));
      return [...prev, { clave, producto, cantidad, opciones, nota: nota.trim() }];
    });
  };

  const cambiarCantidad = (clave: string, cantidad: number) =>
    setItems((prev) =>
      cantidad <= 0 ? prev.filter((i) => i.clave !== clave) : prev.map((i) => (i.clave === clave ? { ...i, cantidad: Math.min(99, cantidad) } : i))
    );

  const valor = useMemo<CarritoContexto>(
    () => ({
      items,
      pedidoDestino,
      setPedidoDestino,
      agregar,
      cambiarCantidad,
      quitar: (clave) => setItems((prev) => prev.filter((i) => i.clave !== clave)),
      vaciar: () => {
        setItems([]);
        setPedidoDestino(null);
      },
      totalUnidades: items.reduce((s, i) => s + i.cantidad, 0),
      subtotal: items.reduce((s, i) => s + i.cantidad * precioItem(i), 0),
    }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [items, pedidoDestino]
  );

  return <Ctx.Provider value={valor}>{children}</Ctx.Provider>;
};
