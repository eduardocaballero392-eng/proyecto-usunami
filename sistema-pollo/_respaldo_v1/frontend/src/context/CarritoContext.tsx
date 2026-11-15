import { createContext, useContext, useState, ReactNode } from 'react';
import { ItemCarrito, Producto } from '../types';

interface CarritoContextType {
  items: ItemCarrito[];
  agregarProducto: (producto: Producto) => void;
  eliminarProducto: (productoId: number) => void;
  actualizarCantidad: (productoId: number, cantidad: number) => void;
  limpiarCarrito: () => void;
  getTotal: () => number;
  getTotalItems: () => number;
}

const CarritoContext = createContext<CarritoContextType | undefined>(undefined);

export const useCarrito = () => {
  const context = useContext(CarritoContext);
  if (!context) {
    throw new Error('useCarrito debe ser usado dentro de CarritoProvider');
  }
  return context;
};

export const CarritoProvider = ({ children }: { children: ReactNode }) => {
  const [items, setItems] = useState<ItemCarrito[]>([]);

  const agregarProducto = (producto: Producto) => {
    setItems((prevItems) => {
      const existente = prevItems.find((item) => item.productoId === producto.id_productos);
      
      if (existente) {
        return prevItems.map((item) =>
          item.productoId === producto.id_productos
            ? { ...item, cantidad: item.cantidad + 1 }
            : item
        );
      }
      
      return [
        ...prevItems,
        {
          productoId: producto.id_productos,
          productoNombre: producto.nombre,
          cantidad: 1,
          precioUnitario: producto.precio,
        },
      ];
    });
  };

  const eliminarProducto = (productoId: number) => {
    setItems((prevItems) => prevItems.filter((item) => item.productoId !== productoId));
  };

  const actualizarCantidad = (productoId: number, cantidad: number) => {
    if (cantidad <= 0) {
      eliminarProducto(productoId);
      return;
    }
    
    setItems((prevItems) =>
      prevItems.map((item) =>
        item.productoId === productoId ? { ...item, cantidad } : item
      )
    );
  };

  const limpiarCarrito = () => {
    setItems([]);
  };

  const getTotal = () => {
    return items.reduce((total, item) => total + item.cantidad * item.precioUnitario, 0);
  };

  const getTotalItems = () => {
    return items.reduce((total, item) => total + item.cantidad, 0);
  };

  return (
    <CarritoContext.Provider
      value={{
        items,
        agregarProducto,
        eliminarProducto,
        actualizarCantidad,
        limpiarCarrito,
        getTotal,
        getTotalItems,
      }}
    >
      {children}
    </CarritoContext.Provider>
  );
};
