import { FormEvent, useState } from 'react';
import { History, Pencil, Plus, Search } from 'lucide-react';
import api, { mensajeError } from '../../api/cliente';
import { Aviso, Boton, Campo, Modal, Selector, Spinner, Tarjeta, useDatos } from '../../components/ui';
import { S, fechaHora } from '../../utils/formato';

interface Opcion { id_opciones_producto: number; nombre: string; precioExtra: number; activa: boolean }
interface Producto {
  id_productos: number; nombre: string; descripcion: string | null; precio: number; recargoLlevar: number;
  foto: string | null; categoriaId: number; areaId: number; activo: boolean; categoria: string; area: string; opciones: Opcion[];
}
interface Categoria { id_categorias: number; nombre: string; orden: number; activo: number; productos: number }
interface Area { id_areas: number; nombre: string; activo: number }

/** RF-014 / RF-015 */
const Carta = () => {
  const productos = useDatos(() => api.get<Producto[]>('/admin/productos').then((r) => r.data));
  const categorias = useDatos(() => api.get<Categoria[]>('/admin/categorias').then((r) => r.data));
  const areas = useDatos(() => api.get<Area[]>('/admin/areas').then((r) => r.data));
  const [buscar, setBuscar] = useState('');
  const [editando, setEditando] = useState<Producto | 'nuevo' | null>(null);
  const [historial, setHistorial] = useState<Producto | null>(null);
  const [catEditando, setCatEditando] = useState<Categoria | 'nueva' | null>(null);
  const [aviso, setAviso] = useState('');
  const [pagina, setPagina] = useState(1);

  const ITEMS_POR_PAGINA = 10;
  const lista = (productos.datos ?? []).filter((p) => p.nombre.toLowerCase().includes(buscar.toLowerCase()));
  const totalPaginas = Math.ceil(lista.length / ITEMS_POR_PAGINA);
  const inicio = (pagina - 1) * ITEMS_POR_PAGINA;
  const fin = inicio + ITEMS_POR_PAGINA;
  const listaVisible = buscar ? lista : lista.slice(inicio, fin);
  const hayMas = pagina < totalPaginas && !buscar;

  const alternar = async (p: Producto) => {
    try {
      await api.patch(`/admin/productos/${p.id_productos}`, { activo: !p.activo });
      productos.recargar(true);
    } catch (e) {
      setAviso(mensajeError(e));
    }
  };

  return (
    <div className="mx-auto max-w-6xl space-y-5">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">Carta</h1>
          <p className="text-sm text-tinta-3">Productos, precios, recargos y categorías</p>
        </div>
        <Boton onClick={() => setEditando('nuevo')}>
          <Plus className="h-4 w-4" /> Producto
        </Boton>
      </header>
      {aviso && <Aviso onCerrar={() => setAviso('')}>{aviso}</Aviso>}

      <div className="grid gap-5 lg:grid-cols-[1fr_300px]">
        <Tarjeta className="!p-0">
          <div className="border-b border-borde p-3">
            <label className="flex items-center gap-2 rounded-xl border border-borde bg-fondo px-3">
              <Search className="h-4 w-4 text-tinta-3" />
              <input value={buscar} onChange={(e) => setBuscar(e.target.value)} placeholder="Buscar producto" className="h-10 w-full bg-transparent outline-none" />
            </label>
          </div>
          {productos.cargando && !productos.datos ? (
            <Spinner />
          ) : (
            <>
              {/* Vista Desktop - Tabla */}
              <div className="hidden md:block overflow-x-auto">
                <table className="w-full min-w-[640px] text-sm">
                  <thead className="text-left text-tinta-3">
                    <tr className="border-b border-borde">
                      <th className="px-3 py-2 font-medium">Producto</th>
                      <th className="px-3 py-2 font-medium">Categoría / Área</th>
                      <th className="px-3 py-2 text-right font-medium">Precio</th>
                      <th className="px-3 py-2 text-right font-medium">Llevar</th>
                      <th className="px-3 py-2" />
                    </tr>
                  </thead>
                  <tbody>
                    {listaVisible.map((p) => (
                      <tr key={p.id_productos} className={`border-b border-borde/60 ${p.activo ? '' : 'opacity-50'}`}>
                        <td className="px-3 py-2">
                          <p className="font-medium">{p.nombre}</p>
                          {p.opciones.length > 0 && <p className="text-xs text-tinta-3">{p.opciones.length} opción(es)</p>}
                        </td>
                        <td className="px-3 py-2 text-tinta-2">
                          {p.categoria}
                          <span className="block text-xs text-tinta-3">{p.area}</span>
                        </td>
                        <td className="num px-3 py-2 text-right">{S(p.precio)}</td>
                        <td className="num px-3 py-2 text-right text-tinta-2">{p.recargoLlevar ? `+${S(p.recargoLlevar)}` : '—'}</td>
                        <td className="px-3 py-2">
                          <div className="flex justify-end gap-1">
                            <button onClick={() => alternar(p)} className="h-9 rounded-lg px-2 text-xs text-tinta-2 hover:bg-fondo">
                              {p.activo ? 'Ocultar' : 'Mostrar'}
                            </button>
                            <button onClick={() => setHistorial(p)} className="flex h-9 w-9 items-center justify-center rounded-lg hover:bg-fondo" aria-label="Historial de precios">
                              <History className="h-4 w-4" />
                            </button>
                            <button onClick={() => setEditando(p)} className="flex h-9 w-9 items-center justify-center rounded-lg hover:bg-fondo" aria-label={`Editar ${p.nombre}`}>
                              <Pencil className="h-4 w-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                    {listaVisible.length === 0 && (
                      <tr>
                        <td colSpan={5} className="px-3 py-8 text-center text-sm text-tinta-3">
                          {buscar ? 'No se encontraron productos' : 'No hay productos registrados'}
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>

              {/* Vista Móvil - Cards */}
              <div className="md:hidden divide-y divide-borde">
                {listaVisible.length === 0 ? (
                  <div className="px-4 py-8 text-center text-sm text-tinta-3">
                    {buscar ? 'No se encontraron productos' : 'No hay productos registrados'}
                  </div>
                ) : (
                  listaVisible.map((p) => (
                    <div key={p.id_productos} className={`p-4 ${p.activo ? '' : 'opacity-50'}`}>
                      <div className="mb-3 flex items-start justify-between gap-3">
                        <div className="flex-1 min-w-0">
                          <h3 className="font-medium text-base mb-1">{p.nombre}</h3>
                          <p className="text-sm text-tinta-3 mb-1">{p.categoria} · {p.area}</p>
                          {p.opciones.length > 0 && (
                            <p className="text-xs text-tinta-3">{p.opciones.length} opción(es)</p>
                          )}
                        </div>
                        <div className="text-right">
                          <p className="text-lg font-semibold num">{S(p.precio)}</p>
                          {p.recargoLlevar > 0 && (
                            <p className="text-sm text-tinta-3 num">+{S(p.recargoLlevar)}</p>
                          )}
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <button 
                          onClick={() => alternar(p)} 
                          className="flex-1 h-10 rounded-lg border border-borde bg-superficie text-sm font-medium hover:bg-fondo"
                        >
                          {p.activo ? 'Ocultar' : 'Mostrar'}
                        </button>
                        <button 
                          onClick={() => setHistorial(p)} 
                          className="h-10 w-10 flex items-center justify-center rounded-lg border border-borde bg-superficie hover:bg-fondo"
                          aria-label="Historial"
                        >
                          <History className="h-5 w-5" />
                        </button>
                        <button 
                          onClick={() => setEditando(p)} 
                          className="h-10 w-10 flex items-center justify-center rounded-lg border border-borde bg-superficie hover:bg-fondo"
                          aria-label="Editar"
                        >
                          <Pencil className="h-5 w-5" />
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>

              {hayMas && (
                <div className="border-t border-borde bg-fondo p-4">
                  <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
                    <button
                      onClick={() => setPagina(p => Math.max(1, p - 1))}
                      disabled={pagina === 1}
                      className="w-full sm:w-auto inline-flex items-center justify-center gap-2 rounded-lg px-4 py-2.5 text-sm font-medium text-tinta-2 transition-colors hover:bg-superficie disabled:opacity-40 disabled:cursor-not-allowed"
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
                      className="w-full sm:w-auto inline-flex items-center justify-center gap-2 rounded-lg bg-amber-500 px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-amber-600"
                    >
                      Siguiente
                      <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                      </svg>
                    </button>
                  </div>
                </div>
              )}

              {!hayMas && totalPaginas > 1 && (
                <div className="border-t border-borde bg-fondo p-4">
                  <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
                    <button
                      onClick={() => setPagina(p => Math.max(1, p - 1))}
                      className="w-full sm:w-auto inline-flex items-center justify-center gap-2 rounded-lg px-4 py-2.5 text-sm font-medium text-tinta-2 transition-colors hover:bg-superficie"
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
                      disabled
                      className="w-full sm:w-auto inline-flex items-center justify-center gap-2 rounded-lg px-4 py-2.5 text-sm font-medium text-tinta-3 opacity-40 cursor-not-allowed"
                    >
                      Siguiente
                      <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                      </svg>
                    </button>
                  </div>
                </div>
              )}
            </>
          )}
        </Tarjeta>

        <Tarjeta>
          <div className="mb-3 flex items-center justify-between">
            <h3 className="font-semibold">Categorías</h3>
            <button onClick={() => setCatEditando('nueva')} className="flex h-9 w-9 items-center justify-center rounded-lg hover:bg-fondo" aria-label="Nueva categoría">
              <Plus className="h-4 w-4" />
            </button>
          </div>
          <ul className="space-y-1">
            {categorias.datos?.map((c) => (
              <li key={c.id_categorias} className={`flex items-center gap-2 rounded-lg px-2 py-1.5 hover:bg-fondo ${c.activo ? '' : 'opacity-50'}`}>
                <span className="num w-6 text-xs text-tinta-3">{c.orden}</span>
                <span className="flex-1">{c.nombre}</span>
                <span className="text-xs text-tinta-3">{c.productos}</span>
                <button onClick={() => setCatEditando(c)} className="flex h-8 w-8 items-center justify-center rounded-lg hover:bg-borde" aria-label={`Editar ${c.nombre}`}>
                  <Pencil className="h-3.5 w-3.5" />
                </button>
              </li>
            ))}
          </ul>
          <p className="mt-3 text-xs text-tinta-3">El número indica el orden en el menú del mozo.</p>
        </Tarjeta>
      </div>

      {editando && (
        <FormProducto
          producto={editando === 'nuevo' ? null : editando}
          categorias={categorias.datos ?? []}
          areas={areas.datos ?? []}
          onCerrar={() => setEditando(null)}
          onGuardado={() => {
            setEditando(null);
            productos.recargar(true);
          }}
        />
      )}
      {catEditando && (
        <FormCategoria
          categoria={catEditando === 'nueva' ? null : catEditando}
          onCerrar={() => setCatEditando(null)}
          onGuardado={() => {
            setCatEditando(null);
            categorias.recargar(true);
          }}
        />
      )}
      {historial && <HistorialPrecios producto={historial} onCerrar={() => setHistorial(null)} />}
    </div>
  );
};

const FormProducto = ({ producto, categorias, areas, onCerrar, onGuardado }: {
  producto: Producto | null; categorias: Categoria[]; areas: Area[]; onCerrar: () => void; onGuardado: () => void;
}) => {
  const [f, setF] = useState({
    nombre: producto?.nombre ?? '',
    descripcion: producto?.descripcion ?? '',
    precio: String(producto?.precio ?? ''),
    recargoLlevar: String(producto?.recargoLlevar ?? '0'),
    categoriaId: String(producto?.categoriaId ?? categorias[0]?.id_categorias ?? ''),
    areaId: String(producto?.areaId ?? areas[0]?.id_areas ?? ''),
  });
  const [opciones, setOpciones] = useState<Opcion[]>(producto?.opciones ?? []);
  const [nuevaOp, setNuevaOp] = useState({ nombre: '', precioExtra: '' });
  const [error, setError] = useState('');
  const [guardando, setGuardando] = useState(false);
  const set = (k: keyof typeof f) => (e: { target: { value: string } }) => setF((x) => ({ ...x, [k]: e.target.value }));

  const guardar = async (e: FormEvent) => {
    e.preventDefault();
    setGuardando(true);
    setError('');
    const cuerpo = {
      nombre: f.nombre,
      descripcion: f.descripcion || null,
      precio: Number(f.precio),
      recargoLlevar: Number(f.recargoLlevar || 0),
      categoriaId: Number(f.categoriaId),
      areaId: Number(f.areaId),
    };
    try {
      if (producto) await api.patch(`/admin/productos/${producto.id_productos}`, cuerpo);
      else await api.post('/admin/productos', cuerpo);
      onGuardado();
    } catch (err) {
      setError(mensajeError(err));
    } finally {
      setGuardando(false);
    }
  };

  const agregarOpcion = async () => {
    if (!producto || !nuevaOp.nombre.trim()) return;
    try {
      const { data } = await api.post(`/admin/productos/${producto.id_productos}/opciones`, { nombre: nuevaOp.nombre, precioExtra: Number(nuevaOp.precioExtra || 0) });
      setOpciones((o) => [...o, { id_opciones_producto: data.id_opciones_producto, nombre: nuevaOp.nombre, precioExtra: Number(nuevaOp.precioExtra || 0), activa: true }]);
      setNuevaOp({ nombre: '', precioExtra: '' });
    } catch (err) {
      setError(mensajeError(err));
    }
  };

  const alternarOpcion = async (o: Opcion) => {
    try {
      await api.patch(`/admin/opciones/${o.id_opciones_producto}`, { activa: !o.activa });
      setOpciones((ops) => ops.map((x) => (x.id_opciones_producto === o.id_opciones_producto ? { ...x, activa: !x.activa } : x)));
    } catch (err) {
      setError(mensajeError(err));
    }
  };

  return (
    <Modal abierto titulo={producto ? 'Editar producto' : 'Nuevo producto'} onCerrar={onCerrar} ancho="max-w-lg">
      <form onSubmit={guardar} className="space-y-4">
        {error && <Aviso>{error}</Aviso>}
        <Campo etiqueta="Nombre" value={f.nombre} onChange={set('nombre')} required maxLength={100} />
        <Campo etiqueta="Descripción" value={f.descripcion} onChange={set('descripcion')} maxLength={255} />
        <div className="grid grid-cols-2 gap-3">
          <Campo etiqueta="Precio (S/)" type="number" step="0.10" min="0" inputMode="decimal" value={f.precio} onChange={set('precio')} required />
          <Campo etiqueta="Recargo para llevar" type="number" step="0.10" min="0" inputMode="decimal" value={f.recargoLlevar} onChange={set('recargoLlevar')} ayuda="Taper / botella" />
          <Selector etiqueta="Categoría" value={f.categoriaId} onChange={set('categoriaId')}>
            {categorias.map((c) => (
              <option key={c.id_categorias} value={c.id_categorias}>{c.nombre}</option>
            ))}
          </Selector>
          <Selector etiqueta="Se prepara en" value={f.areaId} onChange={set('areaId')}>
            {areas.map((a) => (
              <option key={a.id_areas} value={a.id_areas}>{a.nombre}</option>
            ))}
          </Selector>
        </div>
        {producto?.precio !== undefined && Number(f.precio) !== producto.precio && (
          <p className="text-xs text-tinta-3">El cambio de precio quedará en el historial. Los pedidos ya tomados conservan su precio.</p>
        )}

        {producto && (
          <div className="rounded-xl bg-fondo p-3">
            <p className="mb-2 text-sm font-medium">Opciones</p>
            <ul className="mb-2 space-y-1 text-sm">
              {opciones.map((o) => (
                <li key={o.id_opciones_producto} className={`flex items-center gap-2 ${o.activa ? '' : 'opacity-50'}`}>
                  <span className="flex-1">{o.nombre}</span>
                  <span className="num text-tinta-2">+{S(o.precioExtra)}</span>
                  <button type="button" onClick={() => alternarOpcion(o)} className="h-8 rounded-lg px-2 text-xs hover:bg-borde">
                    {o.activa ? 'Quitar' : 'Activar'}
                  </button>
                </li>
              ))}
              {!opciones.length && <li className="text-tinta-3">Sin opciones</li>}
            </ul>
            <div className="flex gap-2">
              <input value={nuevaOp.nombre} onChange={(e) => setNuevaOp((x) => ({ ...x, nombre: e.target.value }))} placeholder="Ej. Con papas fritas" className="h-10 min-w-0 flex-1 rounded-lg border border-borde bg-superficie px-2 text-sm" />
              <input value={nuevaOp.precioExtra} onChange={(e) => setNuevaOp((x) => ({ ...x, precioExtra: e.target.value }))} placeholder="+ S/" type="number" step="0.10" min="0" className="h-10 w-20 rounded-lg border border-borde bg-superficie px-2 text-sm" />
              <Boton type="button" variante="secundario" onClick={agregarOpcion}>
                <Plus className="h-4 w-4" />
              </Boton>
            </div>
          </div>
        )}

        <div className="flex justify-end gap-2 pt-2">
          <Boton type="button" variante="secundario" onClick={onCerrar}>Cancelar</Boton>
          <Boton type="submit" cargando={guardando}>Guardar</Boton>
        </div>
      </form>
    </Modal>
  );
};

const FormCategoria = ({ categoria, onCerrar, onGuardado }: { categoria: Categoria | null; onCerrar: () => void; onGuardado: () => void }) => {
  const [nombre, setNombre] = useState(categoria?.nombre ?? '');
  const [orden, setOrden] = useState(String(categoria?.orden ?? 0));
  const [activo, setActivo] = useState(categoria ? Boolean(categoria.activo) : true);
  const [error, setError] = useState('');

  const guardar = async (e: FormEvent) => {
    e.preventDefault();
    try {
      if (categoria) await api.patch(`/admin/categorias/${categoria.id_categorias}`, { nombre, orden: Number(orden), activo });
      else await api.post('/admin/categorias', { nombre, orden: Number(orden) });
      onGuardado();
    } catch (err) {
      setError(mensajeError(err));
    }
  };

  const eliminar = async () => {
    if (!categoria || !confirm(`¿Eliminar la categoría "${categoria.nombre}"?`)) return;
    try {
      await api.delete(`/admin/categorias/${categoria.id_categorias}`);
      onGuardado();
    } catch (err) {
      setError(mensajeError(err));
    }
  };

  return (
    <Modal abierto titulo={categoria ? 'Editar categoría' : 'Nueva categoría'} onCerrar={onCerrar} ancho="max-w-sm">
      <form onSubmit={guardar} className="space-y-4">
        {error && <Aviso>{error}</Aviso>}
        <Campo etiqueta="Nombre" value={nombre} onChange={(e) => setNombre(e.target.value)} required maxLength={50} />
        <Campo etiqueta="Orden en el menú" type="number" value={orden} onChange={(e) => setOrden(e.target.value)} />
        {categoria && (
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" checked={activo} onChange={(e) => setActivo(e.target.checked)} className="h-4 w-4" /> Visible en el menú
          </label>
        )}
        <div className="flex justify-between gap-2 pt-2">
          {categoria && categoria.productos === 0 ? (
            <Boton type="button" variante="fantasma" onClick={eliminar} className="text-red-700">Eliminar</Boton>
          ) : <span />}
          <Boton type="submit">Guardar</Boton>
        </div>
      </form>
    </Modal>
  );
};

const HistorialPrecios = ({ producto, onCerrar }: { producto: Producto; onCerrar: () => void }) => {
  const { datos, cargando } = useDatos(
    () => api.get<{ precioAnterior: string; precioNuevo: string; creadoEn: string; usuario: string }[]>(`/admin/productos/${producto.id_productos}/historial-precios`).then((r) => r.data),
    [producto.id_productos]
  );
  return (
    <Modal abierto titulo={`Precios · ${producto.nombre}`} onCerrar={onCerrar} ancho="max-w-sm">
      {cargando ? (
        <Spinner />
      ) : !datos?.length ? (
        <p className="py-4 text-center text-sm text-tinta-3">Sin cambios de precio registrados</p>
      ) : (
        <ul className="space-y-2 text-sm">
          {datos.map((h, i) => (
            <li key={i} className="flex justify-between gap-2 border-b border-borde pb-2">
              <span className="text-tinta-3">{fechaHora(h.creadoEn)} · {h.usuario}</span>
              <span className="num">{S(Number(h.precioAnterior))} → <b>{S(Number(h.precioNuevo))}</b></span>
            </li>
          ))}
        </ul>
      )}
    </Modal>
  );
};

export default Carta;
