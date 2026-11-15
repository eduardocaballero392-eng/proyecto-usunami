import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { pedidosApi } from '../api/pedidos.api';
import { Pedido } from '../types';
import Button from '../components/Button';
import LoadingSpinner from '../components/LoadingSpinner';
import { ArrowLeft, RefreshCw } from 'lucide-react';

const PedidosPage = () => {
  const navigate = useNavigate();
  const [pedidos, setPedidos] = useState<Pedido[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    cargarPedidos();
  }, []);

  const cargarPedidos = async (isRefresh = false) => {
    try {
      if (isRefresh) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }
      
      const data = await pedidosApi.getMisPedidos();
      setPedidos(data);
    } catch (error) {
      console.error('Error cargando pedidos:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleRefresh = () => {
    cargarPedidos(true);
  };

  const getEstadoBadgeColor = (estado: string) => {
    switch (estado) {
      case 'ABIERTO':
        return 'bg-blue-100 text-blue-800';
      case 'ENVIADO':
        return 'bg-yellow-100 text-yellow-800';
      case 'PAGADO':
        return 'bg-green-100 text-green-800';
      case 'ANULADO':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
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
        <div className="max-w-3xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <button
                onClick={() => navigate('/menu')}
                className="p-2 hover:bg-gray-100 rounded-lg"
              >
                <ArrowLeft className="w-6 h-6" />
              </button>
              <h1 className="text-2xl font-bold text-gray-800">Mis Pedidos</h1>
            </div>
            <button
              onClick={handleRefresh}
              disabled={refreshing}
              className="p-2 hover:bg-gray-100 rounded-lg disabled:opacity-50"
            >
              <RefreshCw className={`w-6 h-6 ${refreshing ? 'animate-spin' : ''}`} />
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-3xl mx-auto px-4 py-6">
        {pedidos.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-gray-500 text-lg mb-4">No tienes pedidos</p>
            <Button variant="primary" onClick={() => navigate('/menu')}>
              Crear Pedido
            </Button>
          </div>
        ) : (
          <div className="space-y-4">
            {pedidos.map(pedido => (
              <div key={pedido.id_pedidos} className="bg-white rounded-lg shadow-md p-6">
                {/* Header del Pedido */}
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <h3 className="text-lg font-semibold text-gray-800">
                      Pedido #{pedido.id_pedidos}
                    </h3>
                    <p className="text-sm text-gray-600">
                      {new Date(pedido.creadoEn).toLocaleString('es-PE')}
                    </p>
                  </div>
                  <span
                    className={`px-3 py-1 rounded-full text-sm font-medium ${getEstadoBadgeColor(
                      pedido.estado
                    )}`}
                  >
                    {pedido.estado}
                  </span>
                </div>

                {/* Info del Pedido */}
                <div className="mb-4">
                  <div className="flex items-center gap-2 text-sm text-gray-600 mb-1">
                    <span className="font-medium">Tipo:</span>
                    <span>{pedido.tipo}</span>
                  </div>
                  {pedido.mesaId && (
                    <div className="flex items-center gap-2 text-sm text-gray-600">
                      <span className="font-medium">Mesa:</span>
                      <span>#{pedido.mesaId}</span>
                    </div>
                  )}
                </div>

                {/* Items */}
                {pedido.items && pedido.items.length > 0 && (
                  <div className="border-t pt-4 mb-4">
                    <h4 className="font-medium text-gray-700 mb-2">Productos:</h4>
                    <div className="space-y-2">
                      {pedido.items.map((item, idx) => (
                        <div key={idx} className="flex justify-between text-sm">
                          <span className="text-gray-700">
                            {item.cantidad}x {item.productoNombre || 'Producto'}
                            {item.nota && (
                              <span className="text-gray-500 italic ml-2">({item.nota})</span>
                            )}
                          </span>
                          <span className="font-medium text-gray-800">
                            S/ {(item.cantidad * item.precioUnitario).toFixed(2)}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Total */}
                <div className="border-t pt-4">
                  <div className="flex items-center justify-between">
                    <span className="text-lg font-semibold text-gray-800">Total</span>
                    <span className="text-2xl font-bold text-yellow-600">
                      S/ {pedido.total.toFixed(2)}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default PedidosPage;
