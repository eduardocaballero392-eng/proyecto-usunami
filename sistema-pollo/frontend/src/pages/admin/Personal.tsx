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

/**
 * RF-018 / RF-019: un solo módulo para todo el personal.
 * Los mozos son usuarios con rol MOZO (sin contraseña, PIN opcional).
 */
const Personal = () => {
  const { usuario: yo } = useAuth();
  const { datos, error, cargando, recargar } = useDatos(() => api.get<UsuarioFila[]>('/admin/usuarios').then((r) => r.data));
  const [filtro, setFiltro] = useState<'todos' | 'MOZO' | 'personal'>('todos');
  const [editando, setEditando] = useState<UsuarioFila | 'nuevo' | null>(null);
  const [aviso, setAviso] = useState('');

  const filas = (datos ?? []).filter((u) => filtro === 'todos' || (filtro === 'MOZO' ? u.rol === 'MOZO' : u.rol !== 'MOZO'));

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
          { v: 'todos', t: 'Todos' },
          { v: 'MOZO', t: 'Mozos' },
          { v: 'personal', t: 'Con usuario' },
        ].map((f) => (
          <button
            key={f.v}
            onClick={() => setFiltro(f.v as typeof filtro)}
            aria-pressed={filtro === f.v}
            className={`h-9 rounded-lg px-3 text-sm font-medium ${filtro === f.v ? 'bg-amber-500 text-white' : 'bg-superficie text-tinta-2 hover:bg-fondo'}`}
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
              <li key={u.id_usuarios} className={`flex flex-wrap items-center gap-3 px-4 py-3 ${u.activo ? '' : 'opacity-60'}`}>
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
                  <Boton variante="secundario" onClick={() => setEditando(u)} aria-label={`Editar ${u.nombre}`}>
                    <Pencil className="h-4 w-4" />
                  </Boton>
                </div>
              </li>
            ))}
            {!filas.length && <li className="px-4 py-8 text-center text-sm text-tinta-3">No hay registros</li>}
          </ul>
        </Tarjeta>
      )}

      {editando && (
        <FormUsuario
          usuario={editando === 'nuevo' ? null : editando}
          onCerrar={() => setEditando(null)}
          onGuardado={() => {
            setEditando(null);
            recargar(true);
          }}
        />
      )}
    </div>
  );
};

const FormUsuario = ({ usuario, onCerrar, onGuardado }: { usuario: UsuarioFila | null; onCerrar: () => void; onGuardado: () => void }) => {
  const [nombre, setNombre] = useState(usuario?.nombre ?? '');
  const [rol, setRol] = useState<Rol>(usuario?.rol ?? 'MOZO');
  const [login, setLogin] = useState(usuario?.usuario ?? '');
  const [password, setPassword] = useState('');
  const [pin, setPin] = useState('');
  const [quitarPin, setQuitarPin] = useState(false);
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
    } else {
      if (pin) cuerpo.pin = pin;
      else if (quitarPin) cuerpo.pin = '';
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
        <Campo etiqueta="Nombre completo" value={nombre} onChange={(e) => setNombre(e.target.value)} required maxLength={100} />
        <Selector etiqueta="Rol" value={rol} onChange={(e) => setRol(e.target.value as Rol)}>
          {ROLES.map((r) => (
            <option key={r.valor} value={r.valor}>
              {r.etiqueta}
            </option>
          ))}
        </Selector>

        {esMozo ? (
          <div className="space-y-2 rounded-xl bg-fondo p-3">
            <p className="text-sm text-tinta-2">Los mozos no usan contraseña: eligen su nombre en el celular.</p>
            <Campo
              etiqueta={usuario?.tienePin ? 'Nuevo PIN (opcional)' : 'PIN de 4 dígitos (opcional)'}
              inputMode="numeric"
              pattern="\d{4}"
              maxLength={4}
              value={pin}
              onChange={(e) => setPin(e.target.value.replace(/\D/g, ''))}
              ayuda="Evita que otra persona use su nombre"
            />
            {usuario?.tienePin && (
              <label className="flex items-center gap-2 text-sm">
                <input type="checkbox" checked={quitarPin} onChange={(e) => setQuitarPin(e.target.checked)} className="h-4 w-4" />
                Quitar el PIN actual
              </label>
            )}
          </div>
        ) : (
          <>
            <Campo etiqueta="Usuario para ingresar" autoCapitalize="none" value={login} onChange={(e) => setLogin(e.target.value)} required pattern="[a-zA-Z0-9._\-]{3,50}" />
            <Campo
              etiqueta={usuario ? 'Nueva contraseña (dejar vacío para no cambiar)' : 'Contraseña'}
              type="password"
              autoComplete="new-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required={!usuario || !usuario.usuario}
              minLength={6}
            />
          </>
        )}
        <div className="flex justify-end gap-2 pt-2">
          <Boton type="button" variante="secundario" onClick={onCerrar}>
            Cancelar
          </Boton>
          <Boton type="submit" cargando={guardando}>
            Guardar
          </Boton>
        </div>
      </form>
    </Modal>
  );
};

export default Personal;
