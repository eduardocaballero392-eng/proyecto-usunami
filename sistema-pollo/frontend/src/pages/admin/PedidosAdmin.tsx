import { useState } from 'react';
import { Ban } from 'lucide-react';
import api, { mensajeError } from '../../api/cliente';
import { Pedido } from '../../api/tipos';
import { Aviso, Boton, Campo, Modal, Spinner, Tarjeta, useDatos } from '../../components/ui';
import { S, horaDe, minutosDesde, tituloPedido } from '../../utils/formato';

/** Pedidos en curso + RF-025: anulación de un pedido completo (sólo ADMIN). */
const PedidosAdmin = () => {
  const { datos, error, cargando, recargar } = useDatos(() => api.get<Pedido[]>('/pedidos/activos').then((r) => r.data), [], 20_000);
  const [anulando, setAnulando] = useState<Pedido | null>(null);
  const [motivo, setMotivo] = useState('');
  const [errorModal, setErrorModal] = useState('');
  const [enviando, setEnviando] = useState(false);

  const anular = async () => {
    if (!anulando) return;
    setEnviando(true);
    setErrorModal('');
    try {
      await api.post(`/pedidos/${anulando.id_pedidos}/anular`, { motivo });
      setAnulando(null);
      setMotivo('');
      recargar(true);
    } catch (e) {
      setErrorModal(mensajeError(e));
    } finally {
      setEnviando(false);
    }
  };

  return (
    <div className="mx-auto max-w-5xl space-y-5">
      <header>
        <h1 className="text-2xl font-bold">Pedidos en curso</h1>
        <p className="text-sm text-tinta-3">Para cobrar, ve a Caja. Aquí puedes anular un pedido completo.</p>
      </header>
      {error && <Aviso>{error}</Aviso>}
      {cargando && !datos ? (
        <Spinner />
      ) : !datos?.length ? (
        <Tarjeta><p className="py-6 text-center text-tinta-3">No hay pedidos abiertos</p></Tarjeta>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {datos.map((p) => (
            <Tarjeta key={p.id_pedidos}>
              <div className="mb-2 flex items-start justify-between gap-2">
                <div>
                  <p className="font-semibold">{tituloPedido(p)} <span className="text-sm font-normal text-tinta-3">#{p.id_pedidos}</span></p>
                  <p className="text-sm text-tinta-3">{p.mozoNombre} · {horaDe(p.creadoEn)} ({minutosDesde(p.creadoEn)} min)</p>
                </div>
                <p className="num text-lg font-semibold">{S(p.total)}</p>
              </div>
              <ul className="mb-3 space-y-0.5 text-sm">
                {p.items.map((i) => (
                  <li key={i.id_detalle_pedidos} className={i.anulado ? 'text-tinta-3 line-through' : ''}>
                    {i.cantidad}× {i.productoNombre}
                  </li>
                ))}
              </ul>
              <Boton variante="secundario" onClick={() => setAnulando(p)} className="text-sm text-red-700 dark:text-red-400">
                <Ban className="h-4 w-4" /> Anular pedido
              </Boton>
            </Tarjeta>
          ))}
        </div>
      )}

      <Modal abierto={!!anulando} titulo={`Anular ${anulando ? tituloPedido(anulando) : ''}`} onCerrar={() => setAnulando(null)}>
        <div className="space-y-4">
          <p className="text-sm text-tinta-2">El pedido quedará ANULADO, no sumará en ventas y sus mesas se liberarán. Queda registrado quién lo anuló.</p>
          {errorModal && <Aviso>{errorModal}</Aviso>}
          <Campo etiqueta="Motivo (obligatorio)" value={motivo} onChange={(e) => setMotivo(e.target.value)} placeholder="Ej. Cliente se retiró sin consumir" />
          <div className="flex justify-end gap-2">
            <Boton variante="secundario" onClick={() => setAnulando(null)}>Cancelar</Boton>
            <Boton variante="peligro" disabled={motivo.trim().length < 3} cargando={enviando} onClick={anular}>Anular pedido</Boton>
          </div>
        </div>
      </Modal>
    </div>
  );
};

export default PedidosAdmin;
