import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useCarrito } from '../context/CarritoContext';
import { pedidosApi } from '../api/pedidos.api';
import Button from '../components/Button';
import Input from '../components/Input';
import Modal from '../components/Modal';
import { ArrowLeft, Trash2, Plus, Minus, Send } from 'lucide-react';

const CartPage = () => {
  const navigate = useNavigate();
  const { items, actualizarCantidad, eliminarProducto, limpiarCarrito, getTotal } = useCarrito();
  
  const [tipoPedido, setTipoPedido] = useState<'MESA' | 'LLEVAR' | 'DELIVERY'>('MESA');
  const [mesaNumero, setMesaNumero] = useState('');
  const [notas, setNotas] = useState<{ [key: number]: string }>({});
  const [loading, setLoading] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  const handleActualizarCantidad = (productoId: number, cantidad: number) => {
    if (cantidad <= 0) {
      eliminarProducto(productoId);
    } else {
      actualizarCantidad(productoId, cantidad);
    }
  };

  const handleEnviarPedido = async () => {
    if (items.length === 0) return;

    if (tipoPedido === 'MESA' && !mesaNumero) {
      alert('Por favor ingrese el número de mesa');
      return;
    }

    setLoading(true);
    try {
      const itemsConNotas = items.map(item => ({
        productoId: item.productoId,
        cantidad: item.cantidad,
        nota: notas[item.productoId] || undefined,
      }));

      await pedidosApi.create({
        tipo: tipoPedido,
        mesaNumero: tipoPedido === 'MESA' ? parseInt(mesaNumero) : undefined,
        items: itemsConNotas,
      });

      limpiarCarrito();
      setShowConfirm(true);
      
      // Redirigir después de 2 segundos
      setTimeout(() => {
        navigate('/menu');
      }, 2000);
    } catch (error) {
      console.error('Error enviando pedido:', error);
      alert('Error al enviar el pedido');
    } finally {
      setLoading(false);
    }
  };

  if (items.length === 0) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center p-4">
        <div className="text-center">
          <p className="text-2xl text-gray-600 mb-6">El carrito está vacío</p>
          <Button variant="primary" onClick={() => navigate('/menu')}>
            Ir al Menú
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 pb-32">
      {/* Header */}
      <div className="bg-white shadow-sm sticky top-0 z-10">
        <div className="max-w-3xl mx-auto px-4 py-4">
          <div className="flex items-center gap-4">
            <button
              onClick={() => navigate('/menu')}
              className="p-2 hover:bg-gray-100 rounded-lg"
            >
              <ArrowLeft className="w-6 h-6" />
            </button>
            <h1 className="text-2xl font-bold text-gray-800">Carrito</h1>
          </div>
        </div>
      </div>

      <div className="max-w-3xl mx-auto px-4 py-6">
        {/* Tipo de Pedido */}
        <div className="bg-white rounded-lg shadow-md p-6 mb-4">
          <h2 className="text-lg font-semibold text-gray-800 mb-4">Tipo de Pedido</h2>
          <div className="grid grid-cols-3 gap-3">
            {(['MESA', 'LLEVAR', 'DELIVERY'] as const).map(tipo => (
              <button
                key={tipo}
                onClick={() => setTipoPedido(tipo)}
                className={`py-3 px-4 rounded-lg font-medium transition-colors ${
                  tipoPedido === tipo
                    ? 'bg-yellow-500 text-white'
                    : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                }`}
              >
                {tipo}
              </button>
            ))}
          </div>

          {tipoPedido === 'MESA' && (
            <div className="mt-4">
              <Input
                label="Número de Mesa"
                type="number"
                value={mesaNumero}
                onChange={(e) => setMesaNumero(e.target.value)}
                placeholder="Ej: 5"
              />
            </div>
          )}
        </div>

        {/* Items del Carrito */}
        <div className="bg-white rounded-lg shadow-md p-6 mb-4">
          <h2 className="text-lg font-semibold text-gray-800 mb-4">Productos</h2>
          <div className="space-y-4">
            {items.map(item => (
              <div key={item.productoId} className="border-b pb-4 last:border-b-0">
                <div className="flex items-start justify-between mb-2">
                  <div className="flex-1">
                    <h3 className="font-semibold text-gray-800">{item.productoNombre}</h3>
                    <p className="text-yellow-600 font-bold">
                      S/ {item.precioUnitario.toFixed(2)}
                    </p>
                  </div>

                  <button
                    onClick={() => eliminarProducto(item.productoId)}
                    className="p-2 text-red-500 hover:bg-red-50 rounded-lg"
                  >
                    <Trash2 className="w-5 h-5" />
                  </button>
                </div>

                {/* Cantidad */}
                <div className="flex items-center gap-3 mb-3">
                  <button
                    onClick={() => handleActualizarCantidad(item.productoId, item.cantidad - 1)}
                    className="p-2 bg-red-500 text-white rounded-lg hover:bg-red-600"
                  >
                    <Minus className="w-4 h-4" />
                  </button>
                  <span className="text-xl font-bold text-gray-800 min-w-[3rem] text-center">
                    {item.cantidad}
                  </span>
                  <button
                    onClick={() => handleActualizarCantidad(item.productoId, item.cantidad + 1)}
                    className="p-2 bg-green-500 text-white rounded-lg hover:bg-green-600"
                  >
                    <Plus className="w-4 h-4" />
                  </button>
                  <span className="ml-auto text-lg font-bold text-gray-800">
                    S/ {(item.cantidad * item.precioUnitario).toFixed(2)}
                  </span>
                </div>

                {/* Notas */}
                <Input
                  label="Nota (opcional)"
                  value={notas[item.productoId] || ''}
                  onChange={(e) => setNotas({ ...notas, [item.productoId]: e.target.value })}
                  placeholder="Ej: sin cebolla"
                />
              </div>
            ))}
          </div>
        </div>

        {/* Total */}
        <div className="bg-white rounded-lg shadow-md p-6">
          <div className="flex items-center justify-between text-2xl font-bold">
            <span className="text-gray-800">Total</span>
            <span className="text-yellow-600">S/ {getTotal().toFixed(2)}</span>
          </div>
        </div>
      </div>

      {/* Botón Flotante Enviar */}
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t p-4 shadow-lg">
        <div className="max-w-3xl mx-auto">
          <Button
            variant="primary"
            size="lg"
            fullWidth
            onClick={handleEnviarPedido}
            disabled={loading}
          >
            {loading ? (
              'Enviando...'
            ) : (
              <>
                <Send className="w-5 h-5 mr-2" />
                Enviar Pedido
              </>
            )}
          </Button>
        </div>
      </div>

      {/* Modal de Confirmación */}
      <Modal
        isOpen={showConfirm}
        onClose={() => setShowConfirm(false)}
        title="¡Pedido Enviado!"
      >
        <div className="text-center py-4">
          <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <Send className="w-8 h-8 text-green-600" />
          </div>
          <p className="text-lg text-gray-700">
            El pedido ha sido enviado exitosamente
          </p>
        </div>
      </Modal>
    </div>
  );
};

export default CartPage;
