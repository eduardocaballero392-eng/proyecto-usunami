import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { AlertTriangle, Ban, LayoutDashboard, LogOut, Plus, Printer, RefreshCw, Trash2, Wallet } from 'lucide-react';
import api, { mensajeError } from '../../api/cliente';
import { MetodoPago, Pedido, Turno } from '../../api/tipos';
import { useAuth } from '../../context/AuthContext';
import { Aviso, Boton, Campo, EstadoImpresion, Modal, Spinner, Tarjeta, useDatos } from '../../components/ui';
import { S, horaDe, minutosDesde, tituloPedido } from '../../utils/formato';

interface ImpresionCola { id_impresiones: number; pedidoId: number | null; tipo: string; area: string; estado: 'ERROR'; intentos: number; error: string | null; creadoEn: string }

const Caja = () => {
  const { usuario, salir } = useAuth();
  const turno = useDatos(() => api.get<Turno | null>('/caja/turno').then((r) => r.data));
  const pedidos = useDatos(() => api.get<Pedido[]>('/pedidos/activos').then((r) => r.data), [], 15_000);
  const errores = useDatos(() => api.get<ImpresionCola[]>('/admin/impresiones', { params: { estado: 'ERROR' } }).then((r) => r.data), [], 30_000);
  const [seleccionado, setSeleccionado] = useState<number | null>(null);
  const [cobrando, setCobrando] = useState<Pedido | null>(null);
  const [cerrando, setCerrando] = useState(false);
  const [aviso, setAviso] = useState<{ tipo: 'error' | 'exito'; texto: string } | null>(null);

  const refrescar = () => {
    pedidos.recargar(true);
    turno.recargar(true);
    errores.recargar(true);
  };
  const pedidoSel = pedidos.datos?.find((p) => p.id_pedidos === seleccionado) ?? null;

  return (
    <div className="min-h-screen">
      <header className="sticky top-0 z-20 border-b border-borde bg-superficie/95 backdrop-blur">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-2 px-4 py-2">
          <p className="flex items-center gap-2 font-bold"><Wallet className="h-5 w-5 text-amber-500" /> Caja · <span className="font-normal text-tinta-2">{usuario?.nombre}</span></p>
          <div className="flex items-center gap-1">
            {usuario?.rol === 'ADMIN' && (
              <Link to="/admin" className="flex h-11 items-center gap-1 rounded-xl px-3 text-sm text-tinta-2 hover:bg-fondo"><LayoutDashboard className="h-4 w-4" /> Admin</Link>
            )}
            <button onClick={refrescar} className="flex h-11 w-11 items-center justify-center rounded-xl hover:bg-fondo" aria-label="Actualizar"><RefreshCw className="h-5 w-5" /></button>
            <button onClick={salir} className="flex h-11 w-11 items-center justify-center rounded-xl hover:bg-fondo" aria-label="Cerrar sesión"><LogOut className="h-5 w-5" /></button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-7xl space-y-4 px-4 py-5">
        {aviso && <Aviso tipo={aviso.tipo} onCerrar={() => setAviso(null)}>{aviso.texto}</Aviso>}

        {/* Turno */}
        {turno.cargando && !turno.datos ? (
          <Spinner />
        ) : !turno.datos ? (
          <AbrirTurno onAbierto={(t) => { turno.setDatos(t); setAviso({ tipo: 'exito', texto: 'Turno abierto' }); }} />
        ) : (
          <Tarjeta>
            <div className="flex flex-wrap items-center gap-x-8 gap-y-3">
              <div>
                <p className="text-sm text-tinta-3">Turno #{turno.datos.id_turnos_caja} · desde {horaDe(turno.datos.apertura)}</p>
                <p className="text-2xl font-semibold">{S(turno.datos.totalVentas)} <span className="text-sm font-normal text-tinta-3">cobrado · {turno.datos.pedidos} pedidos</span></p>
              </div>
              <dl className="num flex gap-6 text-sm">
                <div><dt className="text-tinta-3">Efectivo</dt><dd className="font-medium">{S(turno.datos.efectivo)}</dd></div>
                <div><dt className="text-tinta-3">Yape</dt><dd className="font-medium">{S(turno.datos.yape)}</dd></div>
                <div><dt className="text-tinta-3">Plin</dt><dd className="font-medium">{S(turno.datos.plin)}</dd></div>
                <div><dt className="text-tinta-3">En caja</dt><dd className="font-medium">{S(turno.datos.montoEsperado)}</dd></div>
              </dl>
              <Boton variante="secundario" className="ml-auto" onClick={() => setCerrando(true)}>Cerrar turno</Boton>
            </div>
          </Tarjeta>
        )}

        {/* Impresiones con error (RF-010) */}
        {!!errores.datos?.length && (
          <Tarjeta className="border-red-300 dark:border-red-900">
            <p className="mb-2 flex items-center gap-2 font-semibold text-red-700 dark:text-red-400"><AlertTriangle className="h-4 w-4" /> Impresiones con error</p>
            <ul className="divide-y divide-borde text-sm">
              {errores.datos.slice(0, 6).map((i) => (
                <li key={i.id_impresiones} className="flex flex-wrap items-center gap-2 py-2">
                  <span className="flex-1">{i.tipo.toLowerCase()} · {i.area}{i.pedidoId ? ` · pedido #${i.pedidoId}` : ''}<span className="block text-xs text-tinta-3">{i.error} ({i.intentos} intentos)</span></span>
                  <Boton variante="secundario" className="text-sm" onClick={async () => {
                    const { data } = await api.post(`/admin/impresiones/${i.id_impresiones}/reintentar`);
                    setAviso(data.impresa ? { tipo: 'exito', texto: 'Impreso correctamente' } : { tipo: 'error', texto: 'Sigue fallando: revisa la impresora' });
                    errores.recargar(true);
                  }}>Reintentar</Boton>
                </li>
              ))}
            </ul>
          </Tarjeta>
        )}

        {/* Pedidos por cobrar */}
        <h2 className="pt-2 text-lg font-semibold">Pedidos por cobrar <span className="font-normal text-tinta-3">({pedidos.datos?.length ?? 0})</span></h2>
        {pedidos.error && <Aviso>{pedidos.error}</Aviso>}
        {pedidos.cargando && !pedidos.datos ? <Spinner /> : !pedidos.datos?.length ? (
          <Tarjeta><p className="py-6 text-center text-tinta-3">No hay pedidos abiertos</p></Tarjeta>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {pedidos.datos.map((p) => {
              const errorImp = p.impresiones.some((i) => i.estado === 'ERROR');
              return (
                <button key={p.id_pedidos} onClick={() => setSeleccionado(p.id_pedidos)} className="rounded-2xl border border-borde bg-superficie p-4 text-left transition hover:border-amber-400 hover:shadow-md">
                  <div className="flex items-start justify-between gap-2">
                    <p className="font-semibold">{tituloPedido(p)}</p>
                    <p className="num font-semibold">{S(p.total)}</p>
                  </div>
                  <p className="text-sm text-tinta-3">{p.mozoNombre} · {minutosDesde(p.creadoEn)} min</p>
                  <p className="mt-1 text-xs text-tinta-3">{p.items.filter((i) => !i.anulado).reduce((s, i) => s + i.cantidad, 0)} productos · #{p.id_pedidos}</p>
                  {errorImp && <p className="mt-1"><EstadoImpresion estado="ERROR" /></p>}
                </button>
              );
            })}
          </div>
        )}
      </main>

      {pedidoSel && (
        <DetallePedido
          pedido={pedidoSel}
          puedeCobrar={!!turno.datos}
          onCerrar={() => setSeleccionado(null)}
          onCambio={() => pedidos.recargar(true)}
          onCobrar={() => setCobrando(pedidoSel)}
          onAviso={setAviso}
        />
      )}
      {cobrando && (
        <Cobro
          pedido={cobrando}
          onCerrar={() => setCobrando(null)}
          onCobrado={(msg) => {
            setCobrando(null);
            setSeleccionado(null);
            setAviso({ tipo: 'exito', texto: msg });
            refrescar();
          }}
        />
      )}
      {cerrando && turno.datos && (
        <CerrarTurno turno={turno.datos} onCerrar={() => setCerrando(false)} onCerrado={(t) => {
          setCerrando(false);
          turno.setDatos(null);
          const d = t.diferencia ?? 0;
          setAviso({ tipo: d === 0 ? 'exito' : 'error', texto: `Turno cerrado. ${d === 0 ? 'La caja cuadra.' : d < 0 ? `Faltan ${S(-d)}.` : `Sobran ${S(d)}.`} Se imprimió el reporte de cierre.` });
        }} />
      )}
    </div>
  );
};

// --- Abrir turno (RF-020) ---
const AbrirTurno = ({ onAbierto }: { onAbierto: (t: Turno) => void }) => {
  const [monto, setMonto] = useState('');
  const [error, setError] = useState('');
  const [enviando, setEnviando] = useState(false);
  return (
    <Tarjeta className="mx-auto max-w-md">
      <h2 className="mb-1 text-lg font-semibold">Abrir turno de caja</h2>
      <p className="mb-4 text-sm text-tinta-3">Cuenta el efectivo con el que empiezas.</p>
      {error && <div className="mb-3"><Aviso>{error}</Aviso></div>}
      <form className="flex items-end gap-2" onSubmit={async (e) => {
        e.preventDefault();
        setEnviando(true);
        try {
          const { data } = await api.post<Turno>('/caja/turno/abrir', { montoInicial: Number(monto || 0) });
          onAbierto(data);
        } catch (err) { setError(mensajeError(err)); } finally { setEnviando(false); }
      }}>
        <Campo etiqueta="Monto inicial (S/)" type="number" min="0" step="0.10" inputMode="decimal" value={monto} onChange={(e) => setMonto(e.target.value)} className="flex-1" required />
        <Boton type="submit" cargando={enviando}>Abrir</Boton>
      </form>
    </Tarjeta>
  );
};

// --- Cerrar turno (RF-021) ---
const CerrarTurno = ({ turno, onCerrar, onCerrado }: { turno: Turno; onCerrar: () => void; onCerrado: (t: Turno) => void }) => {
  const [monto, setMonto] = useState('');
  const [error, setError] = useState('');
  const [enviando, setEnviando] = useState(false);
  const dif = monto === '' ? null : Math.round((Number(monto) - turno.montoEsperado) * 100) / 100;
  return (
    <Modal abierto titulo="Cerrar turno" onCerrar={onCerrar}>
      <div className="space-y-4">
        <dl className="num grid grid-cols-2 gap-y-1 text-sm">
          <dt className="text-tinta-3">Monto inicial</dt><dd className="text-right">{S(turno.montoInicial)}</dd>
          <dt className="text-tinta-3">+ Ventas en efectivo</dt><dd className="text-right">{S(turno.efectivo)}</dd>
          <dt className="font-semibold">Efectivo esperado</dt><dd className="text-right font-semibold">{S(turno.montoEsperado)}</dd>
          <dt className="text-tinta-3">Yape / Plin (no van en caja)</dt><dd className="text-right">{S(turno.yape + turno.plin)}</dd>
        </dl>
        {error && <Aviso>{error}</Aviso>}
        <Campo etiqueta="Efectivo contado (S/)" type="number" min="0" step="0.10" inputMode="decimal" value={monto} onChange={(e) => setMonto(e.target.value)} autoFocus />
        {dif !== null && (
          <p className={`text-sm font-medium ${dif === 0 ? 'text-green-700 dark:text-green-400' : dif < 0 ? 'text-red-700 dark:text-red-400' : 'text-tinta'}`}>
            {dif === 0 ? '✓ La caja cuadra' : dif < 0 ? `▼ Faltan ${S(-dif)}` : `▲ Sobran ${S(dif)}`}
          </p>
        )}
        <div className="flex justify-end gap-2">
          <Boton variante="secundario" onClick={onCerrar}>Cancelar</Boton>
          <Boton disabled={monto === ''} cargando={enviando} onClick={async () => {
            setEnviando(true);
            setError('');
            try {
              const { data } = await api.post<Turno>('/caja/turno/cerrar', { montoFinal: Number(monto) });
              onCerrado(data);
            } catch (err) { setError(mensajeError(err)); } finally { setEnviando(false); }
          }}>Cerrar e imprimir</Boton>
        </div>
      </div>
    </Modal>
  );
};

// --- Detalle de pedido ---
const DetallePedido = ({ pedido, puedeCobrar, onCerrar, onCambio, onCobrar, onAviso }: {
  pedido: Pedido; puedeCobrar: boolean; onCerrar: () => void; onCambio: () => void; onCobrar: () => void;
  onAviso: (a: { tipo: 'error' | 'exito'; texto: string }) => void;
}) => {
  const [anulandoItem, setAnulandoItem] = useState<number | null>(null);
  const [motivo, setMotivo] = useState('');
  const [error, setError] = useState('');

  const ejecutar = async (fn: () => Promise<unknown>, ok: string) => {
    setError('');
    try {
      await fn();
      onAviso({ tipo: 'exito', texto: ok });
      onCambio();
    } catch (e) {
      setError(mensajeError(e));
    }
  };

  return (
    <Modal abierto titulo={`${tituloPedido(pedido)} · #${pedido.id_pedidos}`} onCerrar={onCerrar} ancho="max-w-lg">
      <p className="mb-3 text-sm text-tinta-3">Mozo: {pedido.mozoNombre} · tomado a las {horaDe(pedido.creadoEn)}{pedido.observacion ? ` · ${pedido.observacion}` : ''}</p>
      {error && <div className="mb-3"><Aviso>{error}</Aviso></div>}
      <ul className="mb-4 divide-y divide-borde">
        {pedido.items.map((i) => (
          <li key={i.id_detalle_pedidos} className={`py-2 ${i.anulado ? 'opacity-50' : ''}`}>
            <div className="flex items-start gap-2">
              <div className="min-w-0 flex-1">
                <p className={i.anulado ? 'line-through' : ''}>
                  <b>{i.cantidad}×</b> {i.productoNombre}
                  {i.ronda > 1 && <span className="ml-1 text-xs text-tinta-3">(ronda {i.ronda})</span>}
                </p>
                {i.opciones && <p className="text-xs text-tinta-3">+ {i.opciones}</p>}
                {i.nota && <p className="text-xs text-tinta-3">Nota: {i.nota}</p>}
                {i.recargoUnitario > 0 && !i.anulado && <p className="text-xs text-tinta-3">Envase: +{S(i.cantidad * i.recargoUnitario)}</p>}
                {i.anulado && <p className="text-xs text-red-700 dark:text-red-400">Anulado: {i.motivoAnulacion}</p>}
              </div>
              <p className="num shrink-0">{S(i.cantidad * (i.precioUnitario + i.recargoUnitario))}</p>
              {!i.anulado && (
                <div className="flex shrink-0 gap-1">
                  {i.recargoUnitario > 0 && (
                    <button title="Quitar recargo (trae su envase)" onClick={() => ejecutar(() => api.post(`/pedidos/${pedido.id_pedidos}/items/${i.id_detalle_pedidos}/quitar-recargo`), 'Recargo retirado')} className="h-9 rounded-lg px-2 text-xs text-tinta-2 hover:bg-fondo">
                      Sin envase
                    </button>
                  )}
                  <button onClick={() => { setAnulandoItem(i.id_detalle_pedidos); setMotivo(''); }} className="flex h-9 w-9 items-center justify-center rounded-lg text-red-700 hover:bg-fondo dark:text-red-400" aria-label={`Anular ${i.productoNombre}`}>
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              )}
            </div>
            {anulandoItem === i.id_detalle_pedidos && (
              <div className="mt-2 flex gap-2 rounded-xl bg-fondo p-2">
                <input autoFocus value={motivo} onChange={(e) => setMotivo(e.target.value)} placeholder="Motivo de anulación" className="h-10 min-w-0 flex-1 rounded-lg border border-borde bg-superficie px-2 text-sm" />
                <Boton variante="peligro" disabled={motivo.trim().length < 3} className="text-sm" onClick={() => ejecutar(() => api.post(`/pedidos/${pedido.id_pedidos}/items/${i.id_detalle_pedidos}/anular`, { motivo }), 'Ítem anulado; se imprimió el aviso en cocina').then(() => setAnulandoItem(null))}>
                  <Ban className="h-4 w-4" /> Anular
                </Boton>
              </div>
            )}
          </li>
        ))}
      </ul>
      <div className="mb-4 flex flex-wrap gap-x-4 gap-y-1">
        {pedido.impresiones.filter((i) => i.tipo === 'COMANDA').map((i) => (
          <span key={i.id_impresiones} className="text-xs text-tinta-3">{i.area}{i.ronda && i.ronda > 1 ? ` r${i.ronda}` : ''}: <EstadoImpresion estado={i.estado} /></span>
        ))}
      </div>
      <div className="flex items-center justify-between border-t border-borde pt-3">
        <p className="text-sm text-tinta-3">Total</p>
        <p className="num text-2xl font-bold">{S(pedido.total)}</p>
      </div>
      <div className="mt-4 flex flex-wrap justify-end gap-2">
        <Boton variante="secundario" onClick={() => ejecutar(() => api.post(`/pedidos/${pedido.id_pedidos}/reimprimir`), 'Reimprimiendo comandas')}>
          <Printer className="h-4 w-4" /> Reimprimir
        </Boton>
        <Boton onClick={onCobrar} disabled={!puedeCobrar || pedido.total <= 0} title={!puedeCobrar ? 'Abre tu turno primero' : undefined}>
          <Wallet className="h-4 w-4" /> Cobrar {S(pedido.total)}
        </Boton>
      </div>
      {!puedeCobrar && <p className="mt-2 text-right text-xs text-tinta-3">Abre tu turno de caja para cobrar</p>}
    </Modal>
  );
};

// --- Cobro (RF-022) ---
interface LineaPago { metodo: MetodoPago; monto: string; recibido: string }
const METODOS: MetodoPago[] = ['EFECTIVO', 'YAPE', 'PLIN'];
const centimos = (s: string) => Math.round(Number(s || 0) * 100);

const Cobro = ({ pedido, onCerrar, onCobrado }: { pedido: Pedido; onCerrar: () => void; onCobrado: (msg: string) => void }) => {
  const [pagos, setPagos] = useState<LineaPago[]>([{ metodo: 'EFECTIVO', monto: pedido.total.toFixed(2), recibido: '' }]);
  const [error, setError] = useState('');
  const [enviando, setEnviando] = useState(false);

  const totalC = Math.round(pedido.total * 100);
  const sumaC = pagos.reduce((s, p) => s + centimos(p.monto), 0);
  const faltaC = totalC - sumaC;
  const vueltoC = pagos.reduce((s, p) => (p.metodo === 'EFECTIVO' && p.recibido ? s + Math.max(0, centimos(p.recibido) - centimos(p.monto)) : s), 0);
  const efectivoInsuficiente = pagos.some((p) => p.metodo === 'EFECTIVO' && p.recibido !== '' && centimos(p.recibido) < centimos(p.monto));
  const valido = faltaC === 0 && !efectivoInsuficiente && pagos.every((p) => centimos(p.monto) > 0);

  const cambiar = (i: number, cambio: Partial<LineaPago>) => setPagos((ps) => ps.map((p, j) => (j === i ? { ...p, ...cambio } : p)));
  const billetes = useMemo(() => {
    const t = pedido.total;
    return [...new Set([Math.ceil(t), Math.ceil(t / 10) * 10, Math.ceil(t / 50) * 50, Math.ceil(t / 100) * 100])].filter((b) => b >= t).slice(0, 4);
  }, [pedido.total]);

  const cobrar = async () => {
    setEnviando(true);
    setError('');
    try {
      const { data } = await api.post('/caja/cobrar', {
        pedidoId: pedido.id_pedidos,
        pagos: pagos.map((p) => ({ metodo: p.metodo, monto: Number(p.monto), montoRecibido: p.metodo === 'EFECTIVO' && p.recibido ? Number(p.recibido) : undefined })),
      });
      onCobrado(`${data.comprobante} cobrado${data.vuelto > 0 ? ` · Vuelto ${S(data.vuelto)}` : ''}`);
    } catch (e) {
      setError(mensajeError(e));
    } finally {
      setEnviando(false);
    }
  };

  return (
    <Modal abierto titulo={`Cobrar ${tituloPedido(pedido)}`} onCerrar={onCerrar}>
      <div className="space-y-4">
        <p className="text-center"><span className="text-sm text-tinta-3">Total a cobrar</span><br /><span className="num text-4xl font-bold">{S(pedido.total)}</span></p>
        {error && <Aviso>{error}</Aviso>}
        {pagos.map((p, i) => (
          <div key={i} className="space-y-2 rounded-xl bg-fondo p-3">
            <div className="flex gap-1">
              {METODOS.map((m) => (
                <button key={m} onClick={() => cambiar(i, { metodo: m })} aria-pressed={p.metodo === m} className={`h-10 flex-1 rounded-lg text-sm font-semibold ${p.metodo === m ? 'bg-amber-500 text-white' : 'bg-superficie text-tinta-2'}`}>
                  {m === 'EFECTIVO' ? 'Efectivo' : m === 'YAPE' ? 'Yape' : 'Plin'}
                </button>
              ))}
              {pagos.length > 1 && (
                <button onClick={() => setPagos((ps) => ps.filter((_, j) => j !== i))} className="flex h-10 w-10 items-center justify-center rounded-lg hover:bg-borde" aria-label="Quitar pago"><Trash2 className="h-4 w-4" /></button>
              )}
            </div>
            <div className="grid grid-cols-2 gap-2">
              <Campo etiqueta="Monto" type="number" min="0" step="0.10" inputMode="decimal" value={p.monto} onChange={(e) => cambiar(i, { monto: e.target.value })} />
              {p.metodo === 'EFECTIVO' && (
                <Campo etiqueta="Recibe" type="number" min="0" step="0.10" inputMode="decimal" value={p.recibido} placeholder={p.monto} onChange={(e) => cambiar(i, { recibido: e.target.value })} />
              )}
            </div>
            {p.metodo === 'EFECTIVO' && pagos.length === 1 && (
              <div className="flex flex-wrap gap-1">
                {billetes.map((b) => (
                  <button key={b} onClick={() => cambiar(i, { recibido: String(b) })} className="num h-9 rounded-lg border border-borde bg-superficie px-3 text-sm">S/ {b}</button>
                ))}
              </div>
            )}
          </div>
        ))}
        {pagos.length < 3 && (
          <button onClick={() => setPagos((ps) => [...ps, { metodo: 'YAPE', monto: faltaC > 0 ? (faltaC / 100).toFixed(2) : '', recibido: '' }])} className="flex items-center gap-1 text-sm font-medium text-amber-700 dark:text-amber-400">
            <Plus className="h-4 w-4" /> Pago mixto
          </button>
        )}
        <div className="num space-y-1 border-t border-borde pt-3 text-sm">
          {faltaC !== 0 && (
            <p className="flex items-center gap-1 font-medium text-red-700 dark:text-red-400">
              <AlertTriangle className="h-4 w-4" /> {faltaC > 0 ? `Faltan ${S(faltaC / 100)}` : `Excede en ${S(-faltaC / 100)}`}
            </p>
          )}
          {efectivoInsuficiente && <p className="font-medium text-red-700 dark:text-red-400">El efectivo recibido es menor al monto</p>}
          {vueltoC > 0 && <p className="text-xl font-semibold">Vuelto: {S(vueltoC / 100)}</p>}
        </div>
        <Boton className="w-full" disabled={!valido} cargando={enviando} onClick={cobrar}>Confirmar cobro e imprimir boleta</Boton>
      </div>
    </Modal>
  );
};

export default Caja;
