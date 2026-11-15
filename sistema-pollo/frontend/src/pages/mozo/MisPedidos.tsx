import { useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { ArrowLeftRight, Plus } from 'lucide-react';
import api, { mensajeError } from '../../api/cliente';
import { MesaEstado, Pedido } from '../../api/tipos';
import { useCarrito } from '../../context/CarritoContext';
import { Aviso, Boton, EstadoImpresion, Modal, Spinner, useDatos } from '../../components/ui';
import { S, minutosDesde, tituloPedido } from '../../utils/formato';

/** RF-011: pedidos abiertos del mozo — agregar, cambiar mesa, ver impresión. */
const MisPedidos = () => {
  const { datos, error, cargando, recargar } = useDatos(() => api.get<Pedido[]>('/pedidos/activos').then((r) => r.data), [], 15_000);
  const { setPedidoDestino, items } = useCarrito();
  const navegar = useNavigate();
  const estado = useLocation().state as { exito?: string } | null;
  const [exito, setExito] = useState(estado?.exito ?? '');
  const [moviendo, setMoviendo] = useState<Pedido | null>(null);

  const agregarA = (p: Pedido) => {
    if (items.length && !confirm('Los productos que ya están en el carrito se agregarán a este pedido. ¿Continuar?')) return;
    setPedidoDestino({ id: p.id_pedidos, titulo: tituloPedido(p) });
    navegar('/mozo/menu');
  };

  return (
    <div className="mx-auto max-w-2xl space-y-3 px-4 py-4">
      <h1 className="text-xl font-bold">Mis mesas</h1>
      {exito && <Aviso tipo="exito" onCerrar={() => setExito('')}>{exito}</Aviso>}
      {error && <Aviso>{error}</Aviso>}
      {cargando && !datos ? <Spinner /> : !datos?.length ? (
        <p className="py-12 text-center text-tinta-3">No tienes pedidos abiertos</p>
      ) : (
        datos.map((p) => (
          <article key={p.id_pedidos} className="rounded-2xl border border-borde bg-superficie p-4">
            <header className="mb-2 flex items-start justify-between gap-2">
              <div>
                <h2 className="text-lg font-bold">{tituloPedido(p)}</h2>
                <p className="text-sm text-tinta-3">Hace {minutosDesde(p.creadoEn)} min · #{p.id_pedidos}</p>
              </div>
              <p className="num text-lg font-semibold">{S(p.total)}</p>
            </header>
            <ul className="mb-3 space-y-0.5 text-sm">
              {p.items.map((i) => (
                <li key={i.id_detalle_pedidos} className={i.anulado ? 'text-tinta-3 line-through' : ''}>
                  {i.cantidad}× {i.productoNombre}
                  {i.ronda > 1 && <span className="ml-1 text-xs text-tinta-3">· ronda {i.ronda}</span>}
                </li>
              ))}
            </ul>
            <div className="mb-3 flex flex-wrap gap-x-3 gap-y-1">
              {p.impresiones.filter((i) => i.tipo === 'COMANDA').map((i) => (
                <span key={i.id_impresiones} className="text-xs text-tinta-3">{i.area}: <EstadoImpresion estado={i.estado} /></span>
              ))}
            </div>
            <div className="grid grid-cols-2 gap-2">
              <Boton onClick={() => agregarA(p)}><Plus className="h-4 w-4" /> Agregar</Boton>
              {p.tipo === 'MESA' && <Boton variante="secundario" onClick={() => setMoviendo(p)}><ArrowLeftRight className="h-4 w-4" /> Cambiar mesa</Boton>}
            </div>
          </article>
        ))
      )}
      {moviendo && <CambiarMesa pedido={moviendo} onCerrar={() => setMoviendo(null)} onHecho={() => { setMoviendo(null); setExito('Mesa actualizada'); recargar(true); }} />}
    </div>
  );
};

const CambiarMesa = ({ pedido, onCerrar, onHecho }: { pedido: Pedido; onCerrar: () => void; onHecho: () => void }) => {
  const { datos: mesas } = useDatos(() => api.get<MesaEstado[]>('/mesas').then((r) => r.data));
  const actuales = mesas?.filter((m) => m.pedidoId === pedido.id_pedidos).map((m) => m.id_mesas) ?? [];
  const [sel, setSel] = useState<number[] | null>(null);
  const elegidas = sel ?? actuales;
  const [error, setError] = useState('');

  return (
    <Modal abierto titulo={`Mover ${tituloPedido(pedido)}`} onCerrar={onCerrar}>
      {!mesas ? <Spinner /> : (
        <div className="space-y-4">
          {error && <Aviso>{error}</Aviso>}
          <div className="grid grid-cols-5 gap-2">
            {mesas.map((m) => {
              const ocupadaPorOtro = m.ocupada && m.pedidoId !== pedido.id_pedidos;
              const s = elegidas.includes(m.id_mesas);
              return (
                <button key={m.id_mesas} disabled={ocupadaPorOtro} onClick={() => setSel(s ? elegidas.filter((x) => x !== m.id_mesas) : [...elegidas, m.id_mesas])} className={`num h-12 rounded-xl border text-lg font-bold ${s ? 'border-amber-500 bg-amber-500 text-white' : ocupadaPorOtro ? 'border-dashed border-borde text-tinta-3 line-through' : 'border-borde'}`}>
                  {m.numero}
                </button>
              );
            })}
          </div>
          <Boton className="w-full" disabled={!elegidas.length} onClick={async () => {
            try {
              await api.patch(`/pedidos/${pedido.id_pedidos}/mesas`, { mesas: elegidas });
              onHecho();
            } catch (e) { setError(mensajeError(e)); }
          }}>Guardar</Boton>
        </div>
      )}
    </Modal>
  );
};

export default MisPedidos;
