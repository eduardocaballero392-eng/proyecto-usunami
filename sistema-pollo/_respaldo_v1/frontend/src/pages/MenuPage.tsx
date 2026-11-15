import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { productosApi } from '../api/productos.api';
import { useCarrito } from '../context/CarritoContext';
import { Producto, Categoria } from '../types';
import Button from '../components/Button';
import LoadingSpinner from '../components/LoadingSpinner';
import { ShoppingCart, Plus, Minus } from 'lucide-react';

const MenuPage = () => {
  const navigate = useNavigate();
  const { items, agregarProducto, actualizarCantidad, getTotalItems } = useCarrito();
  
  const [productos, setProductos] = useState<Producto[]>([]);
  const [categorias, setCategorias] = useState<Categoria[]>([]);
  const [categoriaSeleccionada, setCategoriaSeleccionada] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    cargarDatos();
  }, []);

  const cargarDatos = async () => {
    try {
      setLoading(true);
      const [prodData, catData] = await Promise.all([
        productosApi.getAll(),
        productosApi.getCategorias()
      ]);
      setProductos(prodData);
      setCategorias(catData);
    } catch (error) {
      console.error('Error cargando datos:', error);
    } finally {
      setLoading(false);
    }
  };

  const productosFiltrados = categoriaSeleccionada
    ? productos.filter(p => p.categoriaId === categoriaSeleccionada)
    : productos;

  const getCantidadEnCarrito = (productoId: number) => {
    const item = items.find(i => i.productoId === productoId);
    return item?.cantidad || 0;
  };

  const handleAgregar = (producto: Producto) => {
    agregarProducto(producto);
  };

  const handleIncrementar = (productoId: number) => {
    const cantidad = getCantidadEnCarrito(productoId);
    actualizarCantidad(productoId, cantidad + 1);
  };

  const handleDecrementar = (productoId: number) => {
    const cantidad = getCantidadEnCarrito(productoId);
    if (cantidad > 0) {
      actualizarCantidad(productoId, cantidad - 1);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <h1 className="text-2xl font-bold text-gray-800">Menú</h1>
            <button
              onClick={() => navigate('/carrito')}
              className="relative p-2 bg-yellow-500 text-white rounded-full hover:bg-yellow-600"
            >
              <ShoppingCart className="w-6 h-6" />
              {getTotalItems() > 0 && (
                <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs font-bold rounded-full w-5 h-5 flex items-center justify-center">
                  {getTotalItems()}
                </span>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Categorías */}
      <div className="bg-white border-b">
        <div className="max-w-7xl mx-auto px-4 py-3">
          <div className="flex gap-2 overflow-x-auto">
            <button
              onClick={() => setCategoriaSeleccionada(null)}
              className={`px-4 py-2 rounded-full whitespace-nowrap ${
                categoriaSeleccionada === null
                  ? 'bg-yellow-500 text-white'
                  : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
              }`}
            >
              Todos
            </button>
            {categorias.map(cat => (
              <button
                key={cat.id_categorias}
                onClick={() => setCategoriaSeleccionada(cat.id_categorias)}
                className={`px-4 py-2 rounded-full whitespace-nowrap ${
                  categoriaSeleccionada === cat.id_categorias
                    ? 'bg-yellow-500 text-white'
                    : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                }`}
              >
                {cat.nombre}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Productos Grid */}
      <div className="max-w-7xl mx-auto px-4 py-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {productosFiltrados.map(producto => {
            const cantidadEnCarrito = getCantidadEnCarrito(producto.id_productos);
            
            return (
              <div key={producto.id_productos} className="bg-white rounded-lg shadow-md p-4">
                <h3 className="text-lg font-semibold text-gray-800 mb-2">
                  {producto.nombre}
                </h3>
                <p className="text-2xl font-bold text-yellow-600 mb-4">
                  S/ {producto.precio.toFixed(2)}
                </p>

                {cantidadEnCarrito === 0 ? (
                  <Button
                    variant="primary"
                    fullWidth
                    onClick={() => handleAgregar(producto)}
                  >
                    Agregar
                  </Button>
                ) : (
                  <div className="flex items-center justify-between gap-2">
                    <button
                      onClick={() => handleDecrementar(producto.id_productos)}
                      className="p-2 bg-red-500 text-white rounded-lg hover:bg-red-600"
                    >
                      <Minus className="w-5 h-5" />
                    </button>
                    <span className="text-xl font-bold text-gray-800 min-w-[3rem] text-center">
                      {cantidadEnCarrito}
                    </span>
                    <button
                      onClick={() => handleIncrementar(producto.id_productos)}
                      className="p-2 bg-green-500 text-white rounded-lg hover:bg-green-600"
                    >
                      <Plus className="w-5 h-5" />
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {productosFiltrados.length === 0 && (
          <div className="text-center py-12">
            <p className="text-gray-500 text-lg">No hay productos disponibles</p>
          </div>
        )}
      </div>

      {/* Botón flotante para ir al carrito */}
      {getTotalItems() > 0 && (
        <div className="fixed bottom-6 right-6">
          <Button
            variant="primary"
            size="lg"
            onClick={() => navigate('/carrito')}
            className="shadow-lg"
          >
            <ShoppingCart className="w-5 h-5 mr-2" />
            Ver Carrito ({getTotalItems()})
          </Button>
        </div>
      )}
    </div>
  );
};

export default MenuPage;
