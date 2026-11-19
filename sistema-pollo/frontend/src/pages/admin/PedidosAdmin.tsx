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
  const [pagina, setPagina] = useState(1);

  const ITEMS_POR_PAGINA = 6;
  const totalPaginas = Math.ceil((datos?.length ?? 0) / ITEMS_POR_PAGINA);
  const inicio = (pagina - 1) * ITEMS_POR_PAGINA;
  const fin = inicio + ITEMS_POR_PAGINA;
  const pedidosVisibles = datos?.slice(inicio, fin);
  const hayMas = pagina < totalPaginas;

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
        <>
          <div className="grid gap-4 sm:grid-cols-2">
            {pedidosVisibles?.map((p) => (
              <Tarjeta key={p.id_pedidos}>
                <div className="mb-3 flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-base">{tituloPedido(p)} <span className="text-sm font-normal text-tinta-3">#{p.id_pedidos}</span></p>
                    <p className="text-sm text-tinta-3">{p.mozoNombre} · {horaDe(p.creadoEn)} ({minutosDesde(p.creadoEn)} min)</p>
                  </div>
                  <p className="num text-xl font-semibold whitespace-nowrap">{S(p.total)}</p>
                </div>
                <ul className="mb-4 space-y-1 text-sm">
                  {p.items.map((i) => (
                    <li key={i.id_detalle_pedidos} className={i.anulado ? 'text-tinta-3 line-through' : ''}>
                      {i.cantidad}× {i.productoNombre}
                    </li>
                  ))}
                </ul>
                <Boton variante="secundario" onClick={() => setAnulando(p)} className="w-full sm:w-auto text-sm text-red-700 dark:text-red-400">
                  <Ban className="h-4 w-4" /> Anular pedido
                </Boton>
              </Tarjeta>
            ))}
          </div>

          {totalPaginas > 1 && (
            <Tarjeta>
              <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
                <button
                  onClick={() => setPagina(p => Math.max(1, p - 1))}
                  disabled={pagina === 1}
                  className="w-full sm:w-auto inline-flex items-center justify-center gap-2 rounded-lg px-4 py-2.5 text-sm font-medium text-tinta-2 transition-colors hover:bg-fondo disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
                  </svg>
                  Anterior
                </button>
                
                <span className="text-sm text-tinta-2">
                  Página <span className="font-semibold text-tinta-1">{pagina}</span> de <span className="font-semibold text-tinta-1">{totalPaginas}</span>
                </span>
                
                <button
                  onClick={() => setPagina(p => p + 1)}
                  disabled={!hayMas}
                  className="w-full sm:w-auto inline-flex items-center justify-center gap-2 rounded-lg bg-amber-500 px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-amber-600 disabled:opacity-40 disabled:cursor-not-allowed disabled:bg-amber-500"
                >
                  Siguiente
                  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                  </svg>
                </button>
              </div>
            </Tarjeta>
          )}
        </>
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
