import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { mozosApi } from '../api/mozos.api';
import { useAuth } from '../context/AuthContext';
import { Mozo } from '../types';
import LoadingSpinner from '../components/LoadingSpinner';
import { User } from 'lucide-react';

const MozoSelectPage = () => {
  const navigate = useNavigate();
  const { login } = useAuth();
  const [mozos, setMozos] = useState<Mozo[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    cargarMozos();
  }, []);

  const cargarMozos = async () => {
    try {
      const data = await mozosApi.getAll();
      setMozos(data);
    } catch (error) {
      console.error('Error cargando mozos:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSelectMozo = async (mozo: Mozo) => {
    setLoading(true);
    try {
      await login(mozo.id_usuarios);
      navigate('/menu');
    } catch (error) {
      console.error('Error al seleccionar mozo:', error);
      alert('Error al iniciar sesión');
    } finally {
      setLoading(false);
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
    <div className="min-h-screen bg-gradient-to-br from-yellow-400 via-yellow-500 to-orange-500 flex items-center justify-center p-4">
      <div className="max-w-4xl w-full">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-white mb-2">Sistema de Pedidos</h1>
          <p className="text-white text-lg">Selecciona tu nombre para continuar</p>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {mozos.length === 0 ? (
            <div className="col-span-full text-center py-12">
              <p className="text-white text-lg">No hay mozos disponibles</p>
            </div>
          ) : (
            mozos.map((mozo) => (
              <button
                key={mozo.id_usuarios}
                onClick={() => handleSelectMozo(mozo)}
                disabled={loading}
                className="bg-white p-6 rounded-lg shadow-md hover:shadow-lg transition-shadow disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <div className="flex flex-col items-center">
                  <div className="w-20 h-20 bg-yellow-500 rounded-full flex items-center justify-center mb-4">
                    <User className="w-10 h-10 text-white" />
                  </div>
                  <p className="text-lg font-semibold text-gray-800">{mozo.nombre}</p>
                </div>
              </button>
            ))
          )}
        </div>
      </div>
    </div>
  );
};

export default MozoSelectPage;
