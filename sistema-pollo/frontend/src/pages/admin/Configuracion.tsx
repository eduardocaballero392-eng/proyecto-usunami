import { FormEvent, useState } from 'react';
import { Pencil, Plus, Printer } from 'lucide-react';
import api, { mensajeError } from '../../api/cliente';
import { Aviso, Boton, Campo, EstadoImpresion, Modal, Selector, Tarjeta, useDatos } from '../../components/ui';

interface Mesa { id_mesas: number; numero: number; activo: number }
interface Area { id_areas: number; nombre: string; activo: number }
interface Impresora { id_impresoras: number; nombre: string; ip: string; puerto: number; areaId: number; area: string; activa: number; ultimoEstado: 'PENDIENTE' | 'IMPRESA' | 'ERROR' | null }

/** RF-016 / RF-017: mesas, áreas e impresoras. */
const Configuracion = () => {
  const mesas = useDatos(() => api.get<Mesa[]>('/admin/mesas').then((r) => r.data));
  const areas = useDatos(() => api.get<Area[]>('/admin/areas').then((r) => r.data));
  const impresoras = useDatos(() => api.get<Impresora[]>('/admin/impresoras').then((r) => r.data));
  const [aviso, setAviso] = useState<{ tipo: 'error' | 'exito'; texto: string } | null>(null);
  const [nuevaMesa, setNuevaMesa] = useState('');
  const [nuevaArea, setNuevaArea] = useState('');
  const [impEditando, setImpEditando] = useState<Impresora | 'nueva' | null>(null);
  const [probando, setProbando] = useState<number | null>(null);

  const accion = async (fn: () => Promise<unknown>, ok?: string, recargar?: () => void) => {
    try {
      await fn();
      if (ok) setAviso({ tipo: 'exito', texto: ok });
      recargar?.();
    } catch (e) {
      setAviso({ tipo: 'error', texto: mensajeError(e) });
    }
  };

  const probar = async (i: Impresora) => {
    setProbando(i.id_impresoras);
    try {
      const { data } = await api.post<{ impresa: boolean }>(`/admin/impresoras/${i.id_impresoras}/probar`);
      setAviso(data.impresa ? { tipo: 'exito', texto: `Ticket de prueba enviado a ${i.nombre}` } : { tipo: 'error', texto: `No se pudo imprimir en ${i.nombre}. Revisa que esté encendida y su IP.` });
      impresoras.recargar(true);
    } finally {
      setProbando(null);
    }
  };

  return (
    <div className="mx-auto max-w-5xl space-y-5">
      <header>
        <h1 className="text-2xl font-bold">Configuración del local</h1>
        <p className="text-sm text-tinta-3">Mesas, áreas de producción e impresoras</p>
      </header>
      {aviso && <Aviso tipo={aviso.tipo} onCerrar={() => setAviso(null)}>{aviso.texto}</Aviso>}

      <Tarjeta>
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <h3 className="font-semibold">Impresoras</h3>
          <Boton variante="secundario" onClick={() => setImpEditando('nueva')}><Plus className="h-4 w-4" /> Impresora</Boton>
        </div>
        <ul className="divide-y divide-borde">
          {impresoras.datos?.map((i) => (
            <li key={i.id_impresoras} className={`flex flex-wrap items-center gap-3 py-3 ${i.activa ? '' : 'opacity-50'}`}>
              <Printer className="h-5 w-5 text-tinta-3" />
              <div className="min-w-0 flex-1">
                <p className="font-medium">{i.nombre} <span className="text-sm font-normal text-tinta-3">· {i.area}</span></p>
                <p className="num text-sm text-tinta-3">{i.ip}:{i.puerto} {!i.activa && '· desactivada'}</p>
              </div>
              {i.ultimoEstado && <EstadoImpresion estado={i.ultimoEstado} />}
              <Boton variante="secundario" cargando={probando === i.id_impresoras} onClick={() => probar(i)} className="text-sm">Probar</Boton>
              <button onClick={() => setImpEditando(i)} className="flex h-11 w-11 items-center justify-center rounded-xl hover:bg-fondo" aria-label={`Editar ${i.nombre}`}>
                <Pencil className="h-4 w-4" />
              </button>
            </li>
          ))}
        </ul>
      </Tarjeta>

      <div className="grid gap-5 md:grid-cols-2">
        <Tarjeta>
          <h3 className="mb-3 font-semibold">Mesas</h3>
          <div className="mb-3 grid grid-cols-5 gap-2 sm:grid-cols-6">
            {mesas.datos?.map((m) => (
              <button
                key={m.id_mesas}
                onClick={() => accion(() => api.patch(`/admin/mesas/${m.id_mesas}`, { activo: !m.activo }), undefined, () => mesas.recargar(true))}
                title={m.activo ? 'Toca para desactivar' : 'Toca para activar'}
                className={`num h-11 rounded-lg border text-sm font-semibold ${m.activo ? 'border-borde bg-fondo' : 'border-dashed border-borde text-tinta-3 line-through'}`}
              >
                {m.numero}
              </button>
            ))}
          </div>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              accion(() => api.post('/admin/mesas', { numero: Number(nuevaMesa) }), `Mesa ${nuevaMesa} creada`, () => {
                setNuevaMesa('');
                mesas.recargar(true);
              });
            }}
            className="flex gap-2"
          >
            <input type="number" min={1} value={nuevaMesa} onChange={(e) => setNuevaMesa(e.target.value)} placeholder="N.º de mesa" className="h-11 min-w-0 flex-1 rounded-xl border border-borde bg-superficie px-3" required />
            <Boton type="submit" variante="secundario"><Plus className="h-4 w-4" /> Agregar</Boton>
          </form>
          <p className="mt-2 text-xs text-tinta-3">Toca una mesa para activarla o desactivarla.</p>
        </Tarjeta>

        <Tarjeta>
          <h3 className="mb-3 font-semibold">Áreas de producción</h3>
          <ul className="mb-3 space-y-1">
            {areas.datos?.map((a) => (
              <li key={a.id_areas} className="flex items-center justify-between rounded-lg px-2 py-1.5 hover:bg-fondo">
                <span className={a.activo ? '' : 'text-tinta-3 line-through'}>{a.nombre}</span>
                {a.nombre !== 'CAJA' && (
                  <button onClick={() => accion(() => api.patch(`/admin/areas/${a.id_areas}`, { activo: !a.activo }), undefined, () => areas.recargar(true))} className="h-8 rounded-lg px-2 text-xs text-tinta-2 hover:bg-borde">
                    {a.activo ? 'Desactivar' : 'Activar'}
                  </button>
                )}
              </li>
            ))}
          </ul>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              accion(() => api.post('/admin/areas', { nombre: nuevaArea }), 'Área creada', () => {
                setNuevaArea('');
                areas.recargar(true);
              });
            }}
            className="flex gap-2"
          >
            <input value={nuevaArea} onChange={(e) => setNuevaArea(e.target.value)} placeholder="Nombre del área" className="h-11 min-w-0 flex-1 rounded-xl border border-borde bg-superficie px-3" required />
            <Boton type="submit" variante="secundario"><Plus className="h-4 w-4" /></Boton>
          </form>
          <p className="mt-2 text-xs text-tinta-3">El área CAJA recibe boletas y cierres de caja.</p>
        </Tarjeta>
      </div>

      {impEditando && (
        <FormImpresora
          impresora={impEditando === 'nueva' ? null : impEditando}
          areas={areas.datos ?? []}
          onCerrar={() => setImpEditando(null)}
          onGuardado={() => {
            setImpEditando(null);
            impresoras.recargar(true);
          }}
        />
      )}
    </div>
  );
};

const FormImpresora = ({ impresora, areas, onCerrar, onGuardado }: { impresora: Impresora | null; areas: Area[]; onCerrar: () => void; onGuardado: () => void }) => {
  const [f, setF] = useState({
    nombre: impresora?.nombre ?? '',
    ip: impresora?.ip ?? '192.168.1.',
    puerto: String(impresora?.puerto ?? 9100),
    areaId: String(impresora?.areaId ?? areas[0]?.id_areas ?? ''),
    activa: impresora ? Boolean(impresora.activa) : true,
  });
  const [error, setError] = useState('');

  const guardar = async (e: FormEvent) => {
    e.preventDefault();
    const cuerpo = { nombre: f.nombre, ip: f.ip.trim(), puerto: Number(f.puerto), areaId: Number(f.areaId), activa: f.activa };
    try {
      if (impresora) await api.patch(`/admin/impresoras/${impresora.id_impresoras}`, cuerpo);
      else await api.post('/admin/impresoras', cuerpo);
      onGuardado();
    } catch (err) {
      setError(mensajeError(err));
    }
  };

  return (
    <Modal abierto titulo={impresora ? 'Editar impresora' : 'Nueva impresora'} onCerrar={onCerrar} ancho="max-w-sm">
      <form onSubmit={guardar} className="space-y-4">
        {error && <Aviso>{error}</Aviso>}
        <Campo etiqueta="Nombre" value={f.nombre} onChange={(e) => setF({ ...f, nombre: e.target.value })} required />
        <div className="grid grid-cols-[1fr_100px] gap-2">
          <Campo etiqueta="IP" inputMode="decimal" value={f.ip} onChange={(e) => setF({ ...f, ip: e.target.value })} required />
          <Campo etiqueta="Puerto" type="number" value={f.puerto} onChange={(e) => setF({ ...f, puerto: e.target.value })} required />
        </div>
        <Selector etiqueta="Área" value={f.areaId} onChange={(e) => setF({ ...f, areaId: e.target.value })}>
          {areas.map((a) => <option key={a.id_areas} value={a.id_areas}>{a.nombre}</option>)}
        </Selector>
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" checked={f.activa} onChange={(e) => setF({ ...f, activa: e.target.checked })} className="h-4 w-4" /> Activa
        </label>
        <div className="flex justify-end gap-2">
          <Boton type="button" variante="secundario" onClick={onCerrar}>Cancelar</Boton>
          <Boton type="submit">Guardar</Boton>
        </div>
      </form>
    </Modal>
  );
};

export default Configuracion;
