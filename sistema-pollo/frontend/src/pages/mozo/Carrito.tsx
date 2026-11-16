import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ArrowLeft, Bike, Minus, Plus, ShoppingBag, Trash2, UtensilsCrossed } from 'lucide-react';
import api, { mensajeError } from '../../api/cliente';
import { MesaEstado, TipoPedido } from '../../api/tipos';
import { precioItem, useCarrito } from '../../context/CarritoContext';
import { Aviso, Boton, Spinner, useDatos } from '../../components/ui';
import { S } from '../../utils/formato';

/** RF-005 / RF-006 / RF-007: tipo de servicio, mesas y envío. */
const Carrito = () => {
  const { items, cambiarCantidad, quitar, vaciar, subtotal, pedidoDestino } = useCarrito();
  const navegar = useNavigate();
  const [tipo, setTipo] = useState<TipoPedido>('MESA');
  const [mesas, setMesas] = useState<number[]>([]);
  const [observacion, setObservacion] = useState('');
  const [conTaper, setConTaper] = useState(false);
  const [error, setError] = useState('');
  const [enviando, setEnviando] = useState(false);
  const estadoMesas = useDatos(() => api.get<MesaEstado[]>('/mesas').then((r) => r.data), [], 15_000);

  const recargo = conTaper && tipo !== 'MESA' && !pedidoDestino ? 1.00 : 0;
  const listo = items.length > 0 && (pedidoDestino || tipo !== 'MESA' || mesas.length > 0);

  const enviar = async () => {
    setEnviando(true);
    setError('');
    const payload = items.map((i) => ({
      productoId: i.producto.id_productos,
      cantidad: i.cantidad,
      nota: i.nota || undefined,
      opciones: i.opciones.map((o) => o.id_opciones_producto),
    }));
    try {
      if (pedidoDestino) await api.post(`/pedidos/${pedidoDestino.id}/items`, { items: payload });
      else await api.post('/pedidos', { tipo, mesas: tipo === 'MESA' ? mesas : undefined, observacion: observacion || undefined, items: payload });
      vaciar();
      navegar('/mozo/pedidos', { state: { exito: pedidoDestino ? 'Productos agregados y enviados a cocina' : 'Pedido enviado a cocina' } });
    } catch (e) {
      setError(mensajeError(e));
      estadoMesas.recargar(true);
    } finally {
      setEnviando(false);
    }
  };

  if (!items.length) {
    return (
      <div className="px-4 py-16 text-center">
        <p className="mb-4 text-tinta-3">Aún no agregaste productos</p>
        <Link to="/mozo/menu" className="inline-flex min-h-[44px] items-center rounded-xl bg-amber-500 px-5 font-semibold text-white">Ir al menú</Link>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl space-y-5 px-4 py-4">
      <section>
        <div className="mb-2 flex items-center justify-between">
          <h2 className="font-semibold">{pedidoDestino ? `Agregar a ${pedidoDestino.titulo}` : 'Productos'}</h2>
          <div className="flex gap-2">
            <Link
              to="/mozo/menu"
              className="flex h-9 items-center gap-1.5 rounded-xl border border-borde bg-superficie px-3 text-sm text-tinta-2"
            >
              <ArrowLeft className="h-4 w-4" /> Volver
            </Link>
            <Link
              to="/mozo/menu"
              className="flex h-9 items-center gap-1.5 rounded-xl bg-amber-500 px-3 text-sm font-semibold text-white"
            >
              <Plus className="h-4 w-4" /> Agregar más
            </Link>
          </div>
        </div>
        <ul className="divide-y divide-borde rounded-2xl border border-borde bg-superficie">
          {items.map((i) => (
            <li key={i.clave} className="flex items-center gap-3 p-3">
              <div className="min-w-0 flex-1">
                <p className="font-medium leading-tight">{i.producto.nombre}</p>
                {i.opciones.length > 0 && <p className="text-xs text-tinta-3">+ {i.opciones.map((o) => o.nombre).join(', ')}</p>}
                {i.nota && <p className="text-xs text-tinta-3">Nota: {i.nota}</p>}
                <p className="num text-sm text-tinta-2">{S(precioItem(i) * i.cantidad)}</p>
              </div>
              <div className="flex items-center gap-1">
                <button onClick={() => cambiarCantidad(i.clave, i.cantidad - 1)} className="flex h-11 w-11 items-center justify-center rounded-xl bg-fondo" aria-label="Menos">
                  {i.cantidad === 1 ? <Trash2 className="h-4 w-4 text-red-600" /> : <Minus className="h-4 w-4" />}
                </button>
                <span className="num w-7 text-center font-bold">{i.cantidad}</span>
                <button onClick={() => cambiarCantidad(i.clave, i.cantidad + 1)} className="flex h-11 w-11 items-center justify-center rounded-xl bg-fondo" aria-label="Más"><Plus className="h-4 w-4" /></button>
              </div>
            </li>
          ))}
        </ul>
        <button onClick={() => items.forEach((i) => quitar(i.clave))} className="mt-2 text-sm text-tinta-3 underline-offset-2 hover:underline">Vaciar</button>
      </section>

      {!pedidoDestino && (
        <section>
          <h2 className="mb-2 font-semibold">¿Dónde se sirve?</h2>
          <div className="grid grid-cols-3 gap-2">
            {[
              { v: 'MESA' as const, t: 'Mesa', I: UtensilsCrossed },
              { v: 'LLEVAR' as const, t: 'Para llevar', I: ShoppingBag },
              { v: 'DELIVERY' as const, t: 'Delivery', I: Bike },
            ].map(({ v, t, I }) => (
              <button key={v} onClick={() => setTipo(v)} aria-pressed={tipo === v} className={`flex min-h-[64px] flex-col items-center justify-center gap-1 rounded-2xl border text-sm font-medium ${tipo === v ? 'border-amber-500 bg-amber-50 text-amber-800 dark:bg-amber-950/40 dark:text-amber-300' : 'border-borde bg-superficie'}`}>
                <I className="h-5 w-5" /> {t}
              </button>
            ))}
          </div>

          {tipo === 'MESA' && (
            <div className="mt-3">
              <p className="mb-2 text-sm text-tinta-2">Toca una o varias mesas (cuenta compartida)</p>
              {estadoMesas.cargando && !estadoMesas.datos ? <Spinner /> : (
                <div className="grid grid-cols-5 gap-2 sm:grid-cols-8">
                  {estadoMesas.datos?.map((m) => {
                    const sel = mesas.includes(m.id_mesas);
                    return (
                      <button
                        key={m.id_mesas}
                        disabled={m.ocupada}
                        onClick={() => setMesas((x) => (sel ? x.filter((y) => y !== m.id_mesas) : [...x, m.id_mesas]))}
                        aria-pressed={sel}
                        aria-label={`Mesa ${m.numero}${m.ocupada ? ', ocupada' : ''}`}
                        className={`num h-12 rounded-xl border text-lg font-bold ${sel ? 'border-amber-500 bg-amber-500 text-white' : m.ocupada ? 'cursor-not-allowed border-dashed border-borde text-tinta-3 line-through' : 'border-borde bg-superficie'}`}
                      >
                        {m.numero}
                      </button>
                    );
                  })}
                </div>
              )}
              <p className="mt-2 text-xs text-tinta-3">Las mesas tachadas tienen un pedido abierto.</p>
            </div>
          )}
          {tipo !== 'MESA' && (
            <div className="mt-3 space-y-2">
              <label className="block">
                <span className="mb-1 block text-sm text-tinta-2">{tipo === 'DELIVERY' ? 'Dirección / referencia' : 'Nombre del cliente (opcional)'}</span>
                <input value={observacion} onChange={(e) => setObservacion(e.target.value)} maxLength={200} className="h-11 w-full rounded-xl border border-borde bg-superficie px-3" />
              </label>
              {/* Toggle taper */}
              <button
                onClick={() => setConTaper((v) => !v)}
                aria-pressed={conTaper}
                className={`flex w-full items-center justify-between rounded-xl border px-4 py-3 text-sm font-medium transition ${conTaper ? 'border-amber-500 bg-amber-50 text-amber-800 dark:bg-amber-950/40 dark:text-amber-300' : 'border-borde bg-superficie text-tinta-2'}`}
              >
                <span>🥡 Taper</span>
                <span className={`flex h-6 w-11 items-center rounded-full transition-colors ${conTaper ? 'bg-amber-500' : 'bg-tinta-3/30'}`}>
                  <span className={`mx-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform ${conTaper ? 'translate-x-5' : 'translate-x-0'}`} />
                </span>
              </button>
              {conTaper && <p className="text-right text-xs text-tinta-3">+S/ 1.00 por taper</p>}
            </div>
          )}
        </section>
      )}

      {error && <Aviso>{error}</Aviso>}

      <section className="rounded-2xl border border-borde bg-superficie p-4">
        <dl className="num space-y-1 text-sm">
          <div className="flex justify-between"><dt className="text-tinta-2">Subtotal</dt><dd>{S(subtotal)}</dd></div>
          {recargo > 0 && <div className="flex justify-between"><dt className="text-tinta-2">Taper</dt><dd>+{S(recargo)}</dd></div>}
          <div className="flex justify-between pt-1 text-lg font-bold"><dt>Total</dt><dd>{S(subtotal + recargo)}</dd></div>
        </dl>
        <Boton className="mt-3 w-full text-lg" disabled={!listo} cargando={enviando} onClick={enviar}>
          {pedidoDestino ? 'Agregar y enviar a cocina' : 'Enviar a cocina'}
        </Boton>
        {!listo && tipo === 'MESA' && !pedidoDestino && <p className="mt-2 text-center text-xs text-tinta-3">Elige la mesa</p>}
      </section>
    </div>
  );
};

export default Carrito;
