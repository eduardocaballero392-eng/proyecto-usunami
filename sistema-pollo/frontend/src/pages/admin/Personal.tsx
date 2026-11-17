import { FormEvent, useState } from 'react';
import { KeyRound, Lock, Pencil, Plus, User } from 'lucide-react';
import api, { mensajeError } from '../../api/cliente';
import { Rol, ROLES } from '../../api/tipos';
import { Aviso, Boton, Campo, Modal, Selector, Spinner, Tarjeta, useDatos } from '../../components/ui';
import { useAuth } from '../../context/AuthContext';

interface UsuarioFila {
  id_usuarios: number;
  nombre: string;
  usuario: string | null;
  rol: Rol;
  activo: boolean;
  tienePin: boolean;
  pedidos: number;
}

const etiquetaRol = (r: Rol) => ROLES.find((x) => x.valor === r)?.etiqueta ?? r;

/** RF-018 / RF-019: un solo módulo para todo el personal. */
const Personal = () => {
  const { usuario: yo } = useAuth();
  const { datos, error, cargando, recargar } = useDatos(() => api.get<UsuarioFila[]>('/admin/usuarios').then((r) => r.data));
  const [filtro, setFiltro] = useState<'todos' | 'MOZO' | 'personal'>('todos');
  const [editando, setEditando] = useState<UsuarioFila | 'nuevo' | null>(null);
  const [cambiandoPin, setCambiandoPin] = useState<UsuarioFila | null>(null);
  const [aviso, setAviso] = useState('');

  const filas = (datos ?? []).filter((u) =>
    filtro === 'todos' || (filtro === 'MOZO' ? u.rol === 'MOZO' : u.rol !== 'MOZO')
  );

  const alternarActivo = async (u: UsuarioFila) => {
    try {
      await api.patch(`/admin/usuarios/${u.id_usuarios}`, { activo: !u.activo });
      recargar(true);
    } catch (e) {
      setAviso(mensajeError(e));
    }
  };

  return (
    <div className="mx-auto max-w-5xl space-y-5">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">Personal</h1>
          <p className="text-sm text-tinta-3">Mozos, cajeros, cocina y administradores</p>
        </div>
        <Boton onClick={() => setEditando('nuevo')}>
          <Plus className="h-4 w-4" /> Agregar
        </Boton>
      </header>

      <div className="flex gap-1" role="group" aria-label="Filtro">
        {[
          { v: 'todos',    t: 'Todos' },
          { v: 'MOZO',     t: 'Mozos' },
          { v: 'personal', t: 'Con usuario' },
        ].map((f) => (
          <button
            key={f.v}
            onClick={() => setFiltro(f.v as typeof filtro)}
            aria-pressed={filtro === f.v}
            className={`h-9 rounded-lg px-3 text-sm font-medium ${
              filtro === f.v ? 'bg-amber-500 text-white' : 'bg-superficie text-tinta-2 hover:bg-fondo'
            }`}
          >
            {f.t}
          </button>
        ))}
      </div>

      {(error || aviso) && <Aviso onCerrar={() => setAviso('')}>{error || aviso}</Aviso>}

      {cargando && !datos ? (
        <Spinner />
      ) : (
        <Tarjeta className="!p-0">
          <ul className="divide-y divide-borde">
            {filas.map((u) => (
              <li
                key={u.id_usuarios}
                className={`flex flex-wrap items-center gap-3 px-4 py-3 ${u.activo ? '' : 'opacity-60'}`}
              >
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-fondo text-tinta-2">
                  <User className="h-5 w-5" />
                </span>

                <div className="min-w-0 flex-1">
                  <p className="font-medium">
                    {u.nombre}
                    {!u.activo && <span className="ml-2 text-xs font-normal text-tinta-3">(inactivo)</span>}
                  </p>
                  <p className="flex flex-wrap items-center gap-x-3 text-sm text-tinta-3">
                    <span>{etiquetaRol(u.rol)}</span>
                    {u.usuario && (
                      <span className="inline-flex items-center gap-1">
                        <KeyRound className="h-3 w-3" /> {u.usuario}
                      </span>
                    )}
                    {u.tienePin && (
                      <span className="inline-flex items-center gap-1">
                        <Lock className="h-3 w-3" /> PIN
                      </span>
                    )}
                    <span>{u.pedidos} pedidos</span>
                  </p>
                </div>

                <div className="flex items-center gap-1">
                  {u.id_usuarios !== yo?.id && (
                    <Boton variante="fantasma" onClick={() => alternarActivo(u)} className="text-sm">
                      {u.activo ? 'Desactivar' : 'Activar'}
                    </Boton>
                  )}
                  {/* Botón PIN — solo el administrador lo ve */}
                  {yo?.rol === 'ADMIN' && (
                    <Boton
                      variante="secundario"
                      onClick={() => setCambiandoPin(u)}
                      aria-label={`PIN de ${u.nombre}`}
                      title={u.tienePin ? 'Cambiar PIN' : 'Asignar PIN'}
                    >
                      <Lock className="h-4 w-4" />
                    </Boton>
                  )}
                  <Boton
                    variante="secundario"
                    onClick={() => setEditando(u)}
                    aria-label={`Editar ${u.nombre}`}
                  >
                    <Pencil className="h-4 w-4" />
                  </Boton>
                </div>
              </li>
            ))}
            {!filas.length && (
              <li className="px-4 py-8 text-center text-sm text-tinta-3">No hay registros</li>
            )}
          </ul>
        </Tarjeta>
      )}

      {editando && (
        <FormUsuario
          usuario={editando === 'nuevo' ? null : editando}
          onCerrar={() => setEditando(null)}
          onGuardado={() => { setEditando(null); recargar(true); }}
        />
      )}

      {cambiandoPin && (
        <ModalPin
          usuario={cambiandoPin}
          onCerrar={() => setCambiandoPin(null)}
          onGuardado={() => { setCambiandoPin(null); recargar(true); }}
        />
      )}
    </div>
  );
};

// ── Modal exclusivo para cambiar / asignar / quitar PIN ────────────────────
const ModalPin = ({
  usuario,
  onCerrar,
  onGuardado,
}: {
  usuario: UsuarioFila;
  onCerrar: () => void;
  onGuardado: () => void;
}) => {
  const [pin, setPin] = useState('');
  const [quitar, setQuitar] = useState(false);
  const [error, setError] = useState('');
  const [guardando, setGuardando] = useState(false);

  const guardar = async (e: FormEvent) => {
    e.preventDefault();
    if (!quitar && pin.length !== 4) {
      setError('El PIN debe tener exactamente 4 dígitos');
      return;
    }
    setGuardando(true);
    setError('');
    try {
      await api.patch(`/admin/usuarios/${usuario.id_usuarios}`, { pin: quitar ? '' : pin });
      onGuardado();
    } catch (err) {
      setError(mensajeError(err));
    } finally {
      setGuardando(false);
    }
  };

  return (
    <Modal abierto titulo={`PIN — ${usuario.nombre}`} onCerrar={onCerrar}>
      <form onSubmit={guardar} className="space-y-4">
        {error && <Aviso>{error}</Aviso>}

        <p className="text-sm text-tinta-2">
          {usuario.tienePin
            ? 'Este usuario ya tiene un PIN. Puedes cambiarlo o quitarlo.'
            : 'Este usuario no tiene PIN. Asígnale uno para que deba ingresarlo al seleccionar su nombre.'}
        </p>

        {!quitar && (
          <Campo
            etiqueta={usuario.tienePin ? 'Nuevo PIN de 4 dígitos' : 'PIN de 4 dígitos'}
            inputMode="numeric"
            pattern="\d{4}"
            maxLength={4}
            placeholder="••••"
            value={pin}
            onChange={(e) => setPin(e.target.value.replace(/\D/g, ''))}
            ayuda="Solo el administrador puede cambiar este PIN"
            autoFocus
          />
        )}

        {usuario.tienePin && (
          <label className="flex cursor-pointer items-center gap-2 rounded-xl border border-borde bg-fondo px-3 py-2.5 text-sm">
            <input
              type="checkbox"
              checked={quitar}
              onChange={(e) => { setQuitar(e.target.checked); setPin(''); }}
              className="h-4 w-4 accent-amber-500"
            />
            <span>Quitar el PIN actual (el usuario podrá entrar sin PIN)</span>
          </label>
        )}

        <div className="flex justify-end gap-2 pt-2">
          <Boton type="button" variante="secundario" onClick={onCerrar}>Cancelar</Boton>
          <Boton type="submit" cargando={guardando}>
            {quitar ? 'Quitar PIN' : usuario.tienePin ? 'Cambiar PIN' : 'Asignar PIN'}
          </Boton>
        </div>
      </form>
    </Modal>
  );
};

// ── Formulario de crear / editar usuario ──────────────────────────────────
const FormUsuario = ({
  usuario,
  onCerrar,
  onGuardado,
}: {
  usuario: UsuarioFila | null;
  onCerrar: () => void;
  onGuardado: () => void;
}) => {
  const [nombre, setNombre] = useState(usuario?.nombre ?? '');
  const [rol, setRol] = useState<Rol>(usuario?.rol ?? 'MOZO');
  const [login, setLogin] = useState(usuario?.usuario ?? '');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [guardando, setGuardando] = useState(false);
  const esMozo = rol === 'MOZO';

  const guardar = async (e: FormEvent) => {
    e.preventDefault();
    setGuardando(true);
    setError('');
    const cuerpo: Record<string, unknown> = { nombre, rol };
    if (!esMozo) {
      cuerpo.usuario = login.trim();
      if (password) cuerpo.password = password;
    }
    try {
      if (usuario) await api.patch(`/admin/usuarios/${usuario.id_usuarios}`, cuerpo);
      else await api.post('/admin/usuarios', cuerpo);
      onGuardado();
    } catch (err) {
      setError(mensajeError(err));
    } finally {
      setGuardando(false);
    }
  };

  return (
    <Modal abierto titulo={usuario ? 'Editar persona' : 'Agregar persona'} onCerrar={onCerrar}>
      <form onSubmit={guardar} className="space-y-4">
        {error && <Aviso>{error}</Aviso>}
        <Campo
          etiqueta="Nombre completo"
          value={nombre}
          onChange={(e) => setNombre(e.target.value)}
          required
          maxLength={100}
        />
        <Selector etiqueta="Rol" value={rol} onChange={(e) => setRol(e.target.value as Rol)}>
          {ROLES.map((r) => (
            <option key={r.valor} value={r.valor}>{r.etiqueta}</option>
          ))}
        </Selector>

        {esMozo ? (
          <div className="rounded-xl bg-fondo p-3">
            <p className="text-sm text-tinta-2">Los mozos no usan contraseña: eligen su nombre en el celular.</p>
            <p className="mt-1 text-xs text-tinta-3">
              Para asignar o cambiar el PIN usa el botón <Lock className="inline h-3 w-3" /> en la lista.
            </p>
          </div>
        ) : (
          <>
            <Campo
              etiqueta="Usuario para ingresar"
              autoCapitalize="none"
              value={login}
              onChange={(e) => setLogin(e.target.value)}
              required
              pattern="[a-zA-Z0-9._\-]{3,50}"
            />
            <Campo
              etiqueta={usuario ? 'Nueva contraseña (dejar vacío para no cambiar)' : 'Contraseña'}
              type="password"
              autoComplete="new-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required={!usuario || !usuario.usuario}
              minLength={6}
            />
            <div className="rounded-xl bg-fondo p-3">
              <p className="text-sm text-tinta-2">
                Para asignar o cambiar el PIN de acceso rápido usa el botón{' '}
                <Lock className="inline h-3 w-3" /> en la lista.
              </p>
            </div>
          </>
        )}

        <div className="flex justify-end gap-2 pt-2">
          <Boton type="button" variante="secundario" onClick={onCerrar}>Cancelar</Boton>
          <Boton type="submit" cargando={guardando}>Guardar</Boton>
        </div>
      </form>
    </Modal>
  );
};

export default Personal;
