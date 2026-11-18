import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { ChevronDown, Minus, Plus, Search, X } from 'lucide-react';
import api from '../../api/cliente';
import { CategoriaMenu, Opcion, ProductoMenu } from '../../api/tipos';
import { useCarrito } from '../../context/CarritoContext';
import { Aviso, Boton, Modal, Spinner, useDatos } from '../../components/ui';
import { S } from '../../utils/formato';

/** RF-003 / RF-004: menú por categorías con buscador, opciones y notas. */
const Menu = () => {
  const { datos: categorias, error, cargando, recargar } = useDatos(() => api.get<CategoriaMenu[]>('/menu').then((r) => r.data));
  const { agregar, cambiarCantidad, items, totalUnidades, subtotal, pedidoDestino, setPedidoDestino } = useCarrito();
  const [categoria, setCategoria] = useState<number | null>(null);
  const [buscar, setBuscar] = useState('');
  const [elegido, setElegido] = useState<ProductoMenu | null>(null);

  // Panel inline por producto
  const [panelAbierto, setPanelAbierto] = useState<number | null>(null);
  const [conPapa, setConPapa] = useState(false);
  const [conArroz, setConArroz] = useState(false);
  const [cantPanel, setCantPanel] = useState(1);
  // Paso 2: cremas expandidas (solo Broaster)
  const [cremasAbiertas, setCremasAbiertas] = useState(false);
  const [cremasSeleccionadas, setCremasSeleccionadas] = useState<Opcion[]>([]);
  // Nota del panel inline
  const [notaPanel, setNotaPanel] = useState('');

  const visibles = useMemo(() => {
    const q = buscar.trim().toLowerCase();
    return (categorias ?? [])
      .filter((c) => q || categoria === null || c.id_categorias === categoria)
      .map((c) => ({ ...c, productos: c.productos.filter((p) => !q || p.nombre.toLowerCase().includes(q)) }))
      .filter((c) => c.productos.length);
  }, [categorias, categoria, buscar]);

  const enCarrito = (id: number) => items.filter((i) => i.producto.id_productos === id).reduce((s, i) => s + i.cantidad, 0);

  // 'papa+arroz' → Parrilla | 'arroz+cremas' → todos los platos Broaster | 'modal' → Sopas | 'ninguno' → resto
  const tipoPanel = (p: ProductoMenu, categoriaId: number): 'papa+arroz' | 'arroz+cremas' | 'modal' | 'ninguno' => {
    if (categoriaId === 1) return 'papa+arroz';
    if (categoriaId === 2) return 'arroz+cremas';
    if (categoriaId === 4) return 'modal'; // Sopas → siempre abrir modal con nota
    return 'ninguno';
  };

  const abrirPanel = (p: ProductoMenu, categoriaId: number) => {
    const tipo = tipoPanel(p, categoriaId);
    if (tipo === 'ninguno') {
      if (p.opciones.length > 0) { setElegido(p); return; }
      agregar(p);
      return;
    }
    if (tipo === 'modal') { setElegido(p); return; }
    if (panelAbierto === p.id_productos) { cerrarPanel(); return; }
    setPanelAbierto(p.id_productos);
    setConPapa(false);
    setConArroz(false);
    setCantPanel(1);
    setCremasAbiertas(false);
    setCremasSeleccionadas([]);
  };

  const cerrarPanel = () => {
    setPanelAbierto(null);
    setConPapa(false);
    setConArroz(false);
    setCantPanel(1);
    setCremasAbiertas(false);
    setCremasSeleccionadas([]);
    setNotaPanel('');
  };

  const toggleCrema = (o: Opcion) => {
    setCremasSeleccionadas((prev) =>
      prev.some((x) => x.id_opciones_producto === o.id_opciones_producto)
        ? prev.filter((x) => x.id_opciones_producto !== o.id_opciones_producto)
        : [...prev, o]
    );
  };

  const confirmarAgregar = (p: ProductoMenu) => {
    const partes = [conPapa && 'papa', conArroz && 'arroz'].filter(Boolean) as string[];
    const nota = [partes.join(' + '), notaPanel.trim()].filter(Boolean).join(' | ');
    agregar(p, cremasSeleccionadas, nota, cantPanel);
    cerrarPanel();
  };

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
              <button key={c.id_categorias ?? 0} onClick={() => setCategoria(c.id_categorias)}
                className={`h-10 shrink-0 rounded-full px-4 text-sm font-medium ${categoria === c.id_categorias ? 'bg-amber-500 text-white' : 'bg-superficie text-tinta-2'}`}>
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
                const panelVisible = panelAbierto === p.id_productos;
                const tipoPan = tipoPanel(p, c.id_categorias);
                const usaPanel = tipoPan === 'papa+arroz' || tipoPan === 'arroz+cremas';

                return (
                  <li key={p.id_productos}>
                    <div className={`rounded-2xl border bg-superficie transition ${n ? 'border-amber-400' : 'border-borde'}`}>

                      {/* Fila principal */}
                      <div className="flex w-full items-center gap-3 p-3">
                        {p.foto && <img src={p.foto} alt="" className="h-16 w-16 shrink-0 rounded-xl object-cover" loading="lazy" />}
                        <button onClick={() => p.opciones.length && tipoPan === 'ninguno' ? setElegido(p) : abrirPanel(p, c.id_categorias)}
                          className="min-w-0 flex-1 text-left active:scale-[0.99]">
                          <p className="font-semibold leading-tight">{p.nombre}</p>
                          {p.descripcion && <p className="line-clamp-2 text-sm text-tinta-3">{p.descripcion}</p>}
                          <p className="num mt-1 font-semibold text-amber-700 dark:text-amber-400">{S(p.precio)}</p>
                        </button>
                        {n > 0 ? (
                          <div className="flex shrink-0 items-center gap-1">
                            <button onClick={() => { const u = [...items].reverse().find((i) => i.producto.id_productos === p.id_productos); if (u) cambiarCantidad(u.clave, u.cantidad - 1); }}
                              className="flex h-9 w-9 items-center justify-center rounded-xl bg-fondo text-tinta-2 active:scale-95" aria-label="Quitar uno">
                              <Minus className="h-4 w-4" />
                            </button>
                            <span className="num w-7 text-center font-bold text-amber-500">{n}</span>
                            <button onClick={() => usaPanel ? abrirPanel(p, c.id_categorias) : (p.opciones.length ? setElegido(p) : agregar(p))}
                              className="flex h-9 w-9 items-center justify-center rounded-xl bg-amber-500 text-white active:scale-95" aria-label="Agregar uno">
                              <Plus className="h-4 w-4" />
                            </button>
                          </div>
                        ) : (
                          <button onClick={() => p.opciones.length && tipoPan === 'ninguno' ? setElegido(p) : abrirPanel(p, c.id_categorias)}
                            className="flex h-11 min-w-[44px] shrink-0 items-center justify-center rounded-xl bg-fondo text-tinta-2 active:scale-95" aria-label="Agregar">
                            <Plus className="h-5 w-5" />
                          </button>
                        )}
                      </div>

                      {/* Panel inline */}
                      {panelVisible && (
                        <div className="border-t border-borde px-3 pb-3 pt-2 space-y-3">

                          {/* Paso 1: acompañamientos */}
                          <div>
                            <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-tinta-3">Acompañamientos</p>
                            <div className="flex gap-2">
                              {tipoPan === 'papa+arroz' && (
                                <button onClick={() => setConPapa((v) => !v)}
                                  className={`flex h-10 flex-1 items-center justify-center rounded-xl border text-sm font-semibold transition ${conPapa ? 'border-amber-500 bg-amber-500 text-white' : 'border-borde bg-fondo text-tinta-2'}`}>
                                  🥔 Papa
                                </button>
                              )}
                              <button onClick={() => setConArroz((v) => !v)}
                                className={`flex h-10 flex-1 items-center justify-center rounded-xl border text-sm font-semibold transition ${conArroz ? 'border-amber-500 bg-amber-500 text-white' : 'border-borde bg-fondo text-tinta-2'}`}>
                                🍚 Arroz
                              </button>
                            </div>
                          </div>

                          {/* Paso 2: cremas (solo Broaster con opciones) */}
                          {tipoPan === 'arroz+cremas' && p.opciones.length > 0 && (
                            <div>
                              <button onClick={() => setCremasAbiertas((v) => !v)}
                                className="flex w-full items-center justify-between rounded-xl border border-borde bg-fondo px-3 py-2 text-sm font-medium text-tinta-2">
                                <span>🫙 Cremas {cremasSeleccionadas.length > 0 && <span className="ml-1 rounded-full bg-amber-500 px-1.5 py-0.5 text-xs text-white">{cremasSeleccionadas.length}</span>}</span>
                                <ChevronDown className={`h-4 w-4 transition-transform ${cremasAbiertas ? 'rotate-180' : ''}`} />
                              </button>
                              {cremasAbiertas && (
                                <div className="mt-2 grid grid-cols-2 gap-1.5">
                                  {p.opciones.map((o) => {
                                    const sel = cremasSeleccionadas.some((x) => x.id_opciones_producto === o.id_opciones_producto);
                                    return (
                                      <button key={o.id_opciones_producto} onClick={() => toggleCrema(o)}
                                        className={`flex h-9 items-center justify-center rounded-xl border text-sm font-medium transition ${sel ? 'border-amber-500 bg-amber-500 text-white' : 'border-borde bg-fondo text-tinta-2'}`}>
                                        {o.nombre}
                                      </button>
                                    );
                                  })}
                                </div>
                              )}
                            </div>
                          )}

                          {/* Campo de nota */}
                          <div>
                            <input
                              value={notaPanel}
                              onChange={(e) => setNotaPanel(e.target.value)}
                              maxLength={120}
                              placeholder="Nota para cocina (opcional)"
                              className="h-10 w-full rounded-xl border border-borde bg-fondo px-3 text-sm"
                            />
                          </div>

                          {/* Contador de cantidad */}
                          <div className="flex items-center justify-center gap-4">
                            <button onClick={() => setCantPanel((v) => Math.max(1, v - 1))}
                              className="flex h-10 w-10 items-center justify-center rounded-xl bg-fondo text-tinta-2 active:scale-95" aria-label="Menos">
                              <Minus className="h-4 w-4" />
                            </button>
                            <span className="num w-10 text-center text-xl font-bold">{cantPanel}</span>
                            <button onClick={() => setCantPanel((v) => Math.min(99, v + 1))}
                              className="flex h-10 w-10 items-center justify-center rounded-xl bg-fondo text-tinta-2 active:scale-95" aria-label="Más">
                              <Plus className="h-4 w-4" />
                            </button>
                          </div>

                          {/* Botones de acción */}
                          <div className="flex gap-2">
                            <button onClick={cerrarPanel}
                              className="flex h-10 flex-1 items-center justify-center rounded-xl border border-borde bg-fondo text-sm text-tinta-2">
                              Cancelar
                            </button>
                            <button onClick={() => confirmarAgregar(p)}
                              className="flex h-10 flex-1 items-center justify-center rounded-xl bg-amber-500 text-sm font-semibold text-white">
                              Agregar {cantPanel > 1 ? `${cantPanel} × ` : ''}{S(p.precio * cantPanel)}
                            </button>
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Enlace de nota / opciones solo para productos sin panel (otras categorías) */}
                    {!panelVisible && tipoPan === 'ninguno' && (
                      <button onClick={() => setElegido(p)} className="mt-1 px-1 text-xs text-tinta-3 underline-offset-2 hover:underline">
                        Agregar con nota{p.opciones.length ? ' u opciones' : ''}
                      </button>
                    )}
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
  // Opciones tipo checkbox (precioExtra = 0)
  const [opsCheck, setOpsCheck] = useState<Opcion[]>([]);
  // Opciones tipo contador (precioExtra > 0): guardamos {opcion, cantidad}
  const [opsCont, setOpsCont] = useState<{ opcion: Opcion; cantidad: number }[]>(() =>
    producto.opciones.filter((o) => o.precioExtra > 0).map((o) => ({ opcion: o, cantidad: 0 }))
  );
  const [nota, setNota] = useState('');
  const [cant, setCant] = useState(1);

  const opcionesCheck = producto.opciones.filter((o) => o.precioExtra === 0);
  const opcionesCont = producto.opciones.filter((o) => o.precioExtra > 0);

  // Total de extras contables
  const extraCont = opsCont.reduce((s, x) => s + x.cantidad * x.opcion.precioExtra, 0);
  const unit = producto.precio + extraCont;

  const cambiarCont = (id: number, delta: number) =>
    setOpsCont((prev) => prev.map((x) => x.opcion.id_opciones_producto === id ? { ...x, cantidad: Math.max(0, x.cantidad + delta) } : x));

  // Construir array de opciones para el carrito: checkboxes marcados + contables repetidos
  const buildOps = (): Opcion[] => {
    const checks = opsCheck;
    const conts = opsCont.flatMap((x) => Array(x.cantidad).fill(x.opcion));
    return [...checks, ...conts];
  };

  const sugerencias = ['Sin cebolla', 'Sin ají', 'Bien cocido', 'Término medio', 'Poca sal'];

  return (
    <Modal abierto titulo={producto.nombre} onCerrar={onCerrar}>
      <div className="space-y-4">
        {producto.descripcion && <p className="text-sm text-tinta-2">{producto.descripcion}</p>}

        {/* Opciones contables (precio > 0) — con spinner */}
        {opcionesCont.length > 0 && (
          <div>
            <p className="mb-2 text-sm font-medium">Extras</p>
            <div className="space-y-2">
              {opsCont.map((x) => (
                <div key={x.opcion.id_opciones_producto} className={`flex min-h-[48px] items-center gap-3 rounded-xl border px-3 ${x.cantidad > 0 ? 'border-amber-500 bg-amber-50 dark:bg-amber-950/30' : 'border-borde'}`}>
                  <span className="flex-1 text-sm">{x.opcion.nombre}</span>
                  <span className="num text-sm text-tinta-2">+{S(x.opcion.precioExtra)}</span>
                  <div className="flex items-center gap-2">
                    <button onClick={() => cambiarCont(x.opcion.id_opciones_producto, -1)}
                      className="flex h-8 w-8 items-center justify-center rounded-lg bg-fondo text-tinta-2 active:scale-95">
                      <Minus className="h-3.5 w-3.5" />
                    </button>
                    <span className="num w-5 text-center font-bold">{x.cantidad}</span>
                    <button onClick={() => cambiarCont(x.opcion.id_opciones_producto, 1)}
                      className="flex h-8 w-8 items-center justify-center rounded-lg bg-amber-500 text-white active:scale-95">
                      <Plus className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Opciones checkbox (precio = 0) */}
        {opcionesCheck.length > 0 && (
          <fieldset>
            <legend className="mb-2 text-sm font-medium">Opciones</legend>
            <div className="space-y-1">
              {opcionesCheck.map((o) => {
                const sel = opsCheck.some((x) => x.id_opciones_producto === o.id_opciones_producto);
                return (
                  <label key={o.id_opciones_producto} className={`flex min-h-[48px] items-center gap-3 rounded-xl border px-3 ${sel ? 'border-amber-500 bg-amber-50 dark:bg-amber-950/30' : 'border-borde'}`}>
                    <input type="checkbox" checked={sel}
                      onChange={() => setOpsCheck((x) => sel ? x.filter((y) => y.id_opciones_producto !== o.id_opciones_producto) : [...x, o])}
                      className="h-5 w-5 accent-amber-500" />
                    <span className="flex-1">{o.nombre}</span>
                  </label>
                );
              })}
            </div>
          </fieldset>
        )}

        {/* Nota */}
        <div>
          <label className="mb-1 block text-sm font-medium" htmlFor="nota">Nota para cocina</label>
          <input id="nota" value={nota} onChange={(e) => setNota(e.target.value)} maxLength={120}
            placeholder="Ej. sin cebolla" className="h-11 w-full rounded-xl border border-borde bg-superficie px-3" />
          <div className="mt-2 flex flex-wrap gap-1">
            {sugerencias.map((s) => (
              <button key={s} onClick={() => setNota((n) => (n ? `${n}, ${s.toLowerCase()}` : s))}
                className="h-8 rounded-full bg-fondo px-3 text-xs text-tinta-2">{s}</button>
            ))}
          </div>
        </div>

        {/* Cantidad + Agregar */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button onClick={() => setCant((c) => Math.max(1, c - 1))} className="flex h-11 w-11 items-center justify-center rounded-xl bg-fondo" aria-label="Menos"><Minus className="h-5 w-5" /></button>
            <span className="num w-8 text-center text-xl font-bold">{cant}</span>
            <button onClick={() => setCant((c) => Math.min(99, c + 1))} className="flex h-11 w-11 items-center justify-center rounded-xl bg-fondo" aria-label="Más"><Plus className="h-5 w-5" /></button>
          </div>
          <Boton onClick={() => onAgregar(buildOps(), nota, cant)}>Agregar {S(unit * cant)}</Boton>
        </div>
      </div>
    </Modal>
  );
};

export default Menu;
