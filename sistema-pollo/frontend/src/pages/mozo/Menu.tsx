import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Minus, Plus, Search, X } from 'lucide-react';
import api from '../../api/cliente';
import { CategoriaMenu, Opcion, ProductoMenu } from '../../api/tipos';
import { useCarrito } from '../../context/CarritoContext';
import { Aviso, Boton, Modal, Spinner, useDatos } from '../../components/ui';
import { S } from '../../utils/formato';

/** RF-003 / RF-004: menú por categorías con buscador, opciones y notas. */
const Menu = () => {
  const { datos: categorias, error, cargando, recargar } = useDatos(() => api.get<CategoriaMenu[]>('/menu').then((r) => r.data));
  const { agregar, items, totalUnidades, subtotal, pedidoDestino, setPedidoDestino } = useCarrito();
  const [categoria, setCategoria] = useState<number | null>(null);
  const [buscar, setBuscar] = useState('');
  const [elegido, setElegido] = useState<ProductoMenu | null>(null);

  const visibles = useMemo(() => {
    const q = buscar.trim().toLowerCase();
    return (categorias ?? [])
      .filter((c) => q || categoria === null || c.id_categorias === categoria)
      .map((c) => ({ ...c, productos: c.productos.filter((p) => !q || p.nombre.toLowerCase().includes(q)) }))
      .filter((c) => c.productos.length);
  }, [categorias, categoria, buscar]);

  const enCarrito = (id: number) => items.filter((i) => i.producto.id_productos === id).reduce((s, i) => s + i.cantidad, 0);

  if (cargando) return <Spinner texto="Cargando carta…" />;
  if (error) return <div className="p-4"><Aviso>{error}</Aviso><Boton className="mt-3 w-full" variante="secundario" onClick={() => recargar()}>Reintentar</Boton></div>;

  return (
    <div>
      {pedidoDestino && (
        <div className="flex items-center justify-between gap-2 bg-amber-100 px-4 py-2 text-sm text-amber-900 dark:bg-amber-950 dark:text-amber-200">
          <span>Agregando a <b>{pedidoDestino.titulo}</b></span>
          <button onClick={() => setPedidoDestino(null)} className="flex h-9 items-center gap-1 rounded-lg px-2 font-medium"><X className="h-4 w-4" /> Cancelar</button>
        </div>
      )}
      <div className="sticky top-[57px] z-10 space-y-2 border-b border-borde bg-fondo/95 px-4 py-3 backdrop-blur">
        <label className="flex items-center gap-2 rounded-xl border border-borde bg-superficie px-3">
          <Search className="h-4 w-4 text-tinta-3" />
          <input value={buscar} onChange={(e) => setBuscar(e.target.value)} placeholder="Buscar plato o bebida" className="h-11 w-full bg-transparent outline-none" />
          {buscar && <button onClick={() => setBuscar('')} aria-label="Limpiar búsqueda"><X className="h-4 w-4" /></button>}
        </label>
        {!buscar && (
          <div className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1">
            {[{ id_categorias: null as number | null, nombre: 'Todo' }, ...(categorias ?? [])].map((c) => (
              <button key={c.id_categorias ?? 0} onClick={() => setCategoria(c.id_categorias)} className={`h-10 shrink-0 rounded-full px-4 text-sm font-medium ${categoria === c.id_categorias ? 'bg-amber-500 text-white' : 'bg-superficie text-tinta-2'}`}>
                {c.nombre}
              </button>
            ))}
          </div>
        )}
      </div>

      <div className="space-y-6 px-4 py-4">
        {visibles.map((c) => (
          <section key={c.id_categorias}>
            <h2 className="mb-2 text-sm font-semibold uppercase tracking-wide text-tinta-3">{c.nombre}</h2>
            <ul className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
              {c.productos.map((p) => {
                const n = enCarrito(p.id_productos);
                return (
                  <li key={p.id_productos}>
                    <button onClick={() => (p.opciones.length ? setElegido(p) : agregar(p))} className={`flex w-full items-center gap-3 rounded-2xl border bg-superficie p-3 text-left transition active:scale-[0.99] ${n ? 'border-amber-400' : 'border-borde'}`}>
                      {p.foto && <img src={p.foto} alt="" className="h-16 w-16 shrink-0 rounded-xl object-cover" loading="lazy" />}
                      <div className="min-w-0 flex-1">
                        <p className="font-semibold leading-tight">{p.nombre}</p>
                        {p.descripcion && <p className="line-clamp-2 text-sm text-tinta-3">{p.descripcion}</p>}
                        <p className="num mt-1 font-semibold text-amber-700 dark:text-amber-400">{S(p.precio)}</p>
                      </div>
                      <span className={`flex h-11 min-w-[44px] items-center justify-center rounded-xl font-bold ${n ? 'bg-amber-500 text-white' : 'bg-fondo text-tinta-2'}`}>
                        {n ? n : <Plus className="h-5 w-5" />}
                      </span>
                    </button>
                    <button onClick={() => setElegido(p)} className="mt-1 px-1 text-xs text-tinta-3 underline-offset-2 hover:underline">
                      Agregar con nota{p.opciones.length ? ' u opciones' : ''}
                    </button>
                  </li>
                );
              })}
            </ul>
          </section>
        ))}
        {!visibles.length && <p className="py-10 text-center text-tinta-3">No se encontraron productos</p>}
      </div>

      {totalUnidades > 0 && (
        <Link to="/mozo/carrito" className="fixed inset-x-4 bottom-[84px] z-20 flex min-h-[52px] items-center justify-between rounded-2xl bg-amber-500 px-4 font-semibold text-white shadow-lg">
          <span>Ver pedido · {totalUnidades}</span>
          <span className="num">{S(subtotal)}</span>
        </Link>
      )}

      {elegido && <ModalProducto producto={elegido} onCerrar={() => setElegido(null)} onAgregar={(ops, nota, cant) => { agregar(elegido, ops, nota, cant); setElegido(null); }} />}
    </div>
  );
};

const ModalProducto = ({ producto, onCerrar, onAgregar }: { producto: ProductoMenu; onCerrar: () => void; onAgregar: (o: Opcion[], nota: string, cant: number) => void }) => {
  const [ops, setOps] = useState<Opcion[]>([]);
  const [nota, setNota] = useState('');
  const [cant, setCant] = useState(1);
  const unit = producto.precio + ops.reduce((s, o) => s + o.precioExtra, 0);
  const sugerencias = ['Sin cebolla', 'Sin ají', 'Bien cocido', 'Término medio', 'Poca sal'];

  return (
    <Modal abierto titulo={producto.nombre} onCerrar={onCerrar}>
      <div className="space-y-4">
        {producto.descripcion && <p className="text-sm text-tinta-2">{producto.descripcion}</p>}
        {producto.opciones.length > 0 && (
          <fieldset>
            <legend className="mb-2 text-sm font-medium">Opciones</legend>
            <div className="space-y-1">
              {producto.opciones.map((o) => {
                const sel = ops.some((x) => x.id_opciones_producto === o.id_opciones_producto);
                return (
                  <label key={o.id_opciones_producto} className={`flex min-h-[48px] items-center gap-3 rounded-xl border px-3 ${sel ? 'border-amber-500 bg-amber-50 dark:bg-amber-950/30' : 'border-borde'}`}>
                    <input type="checkbox" checked={sel} onChange={() => setOps((x) => (sel ? x.filter((y) => y.id_opciones_producto !== o.id_opciones_producto) : [...x, o]))} className="h-5 w-5 accent-amber-500" />
                    <span className="flex-1">{o.nombre}</span>
                    {o.precioExtra > 0 && <span className="num text-sm text-tinta-2">+{S(o.precioExtra)}</span>}
                  </label>
                );
              })}
            </div>
          </fieldset>
        )}
        <div>
          <label className="mb-1 block text-sm font-medium" htmlFor="nota">Nota para cocina</label>
          <input id="nota" value={nota} onChange={(e) => setNota(e.target.value)} maxLength={120} placeholder="Ej. sin cebolla" className="h-11 w-full rounded-xl border border-borde bg-superficie px-3" />
          <div className="mt-2 flex flex-wrap gap-1">
            {sugerencias.map((s) => (
              <button key={s} onClick={() => setNota((n) => (n ? `${n}, ${s.toLowerCase()}` : s))} className="h-8 rounded-full bg-fondo px-3 text-xs text-tinta-2">{s}</button>
            ))}
          </div>
        </div>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button onClick={() => setCant((c) => Math.max(1, c - 1))} className="flex h-11 w-11 items-center justify-center rounded-xl bg-fondo" aria-label="Menos"><Minus className="h-5 w-5" /></button>
            <span className="num w-8 text-center text-xl font-bold">{cant}</span>
            <button onClick={() => setCant((c) => Math.min(99, c + 1))} className="flex h-11 w-11 items-center justify-center rounded-xl bg-fondo" aria-label="Más"><Plus className="h-5 w-5" /></button>
          </div>
          <Boton onClick={() => onAgregar(ops, nota, cant)}>Agregar {S(unit * cant)}</Boton>
        </div>
      </div>
    </Modal>
  );
};

export default Menu;
