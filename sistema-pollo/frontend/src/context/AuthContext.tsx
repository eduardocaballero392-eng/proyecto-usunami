import { createContext, ReactNode, useCallback, useContext, useEffect, useState } from 'react';
import api, { registrarAlExpirar, tokenGuardado } from '../api/cliente';
import { Rol, UsuarioSesion } from '../api/tipos';

interface AuthContexto {
  usuario: UsuarioSesion | null;
  cargando: boolean;
  loginPersonal: (usuario: string, password: string) => Promise<UsuarioSesion>;
  loginMozo: (id: number, pin?: string) => Promise<UsuarioSesion>;
  loginPorPin: (id: number, pin?: string) => Promise<UsuarioSesion>;
  salir: () => void;
}

const Ctx = createContext<AuthContexto | null>(null);

export const useAuth = () => {
  const c = useContext(Ctx);
  if (!c) throw new Error('useAuth fuera de AuthProvider');
  return c;
};

/** Pantalla de inicio según el rol. */
export const inicioPorRol = (rol: Rol): string =>
  ({ ADMIN: '/admin', CAJERO: '/caja', MOZO: '/mozo/menu', PARRILLA: '/cocina', BROASTER: '/cocina', COCINERO: '/cocina' })[rol];

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [usuario, setUsuario] = useState<UsuarioSesion | null>(null);
  const [cargando, setCargando] = useState(true);

  const salir = useCallback(() => {
    tokenGuardado.borrar();
    setUsuario(null);
  }, []);

  // Recupera la sesión guardada y la valida con el servidor
  useEffect(() => {
    registrarAlExpirar(() => setUsuario(null));
    if (!tokenGuardado.leer()) {
      setCargando(false);
      return;
    }
    api
      .get<{ usuario: UsuarioSesion }>('/auth/yo')
      .then((r) => setUsuario(r.data.usuario))
      .catch(() => tokenGuardado.borrar())
      .finally(() => setCargando(false));
  }, []);

  const iniciar = (token: string, u: UsuarioSesion) => {
    tokenGuardado.guardar(token);
    setUsuario(u);
    return u;
  };

  const loginPersonal = async (u: string, password: string) => {
    const { data } = await api.post('/auth/login', { usuario: u, password });
    return iniciar(data.token, data.usuario);
  };

  const loginMozo = async (id: number, pin?: string) => {
    const { data } = await api.post('/auth/mozo', { id_usuarios: id, pin });
    return iniciar(data.token, data.usuario);
  };

  const loginPorPin = async (id: number, pin?: string) => {
    const { data } = await api.post('/auth/pin', { id_usuarios: id, pin });
    return iniciar(data.token, data.usuario);
  };

  return <Ctx.Provider value={{ usuario, cargando, loginPersonal, loginMozo, loginPorPin, salir }}>{children}</Ctx.Provider>;
};
