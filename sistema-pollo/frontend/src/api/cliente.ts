import axios, { AxiosError } from 'axios';

const CLAVE_TOKEN = 'parrillita.token';

export const tokenGuardado = {
  leer: (): string | null => {
    try {
      return localStorage.getItem(CLAVE_TOKEN);
    } catch {
      return null;
    }
  },
  guardar: (t: string) => {
    try {
      localStorage.setItem(CLAVE_TOKEN, t);
    } catch {
      /* modo privado: la sesión dura lo que la pestaña */
    }
  },
  borrar: () => {
    try {
      localStorage.removeItem(CLAVE_TOKEN);
    } catch {
      /* ignorar */
    }
  },
};

/** Cliente HTTP. Ruta relativa: funciona igual en desarrollo (proxy de Vite) y en producción. */
const api = axios.create({ baseURL: '/api', timeout: 15000 });

api.interceptors.request.use((config) => {
  const token = tokenGuardado.leer();
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

let alExpirar: (() => void) | null = null;
export const registrarAlExpirar = (fn: () => void) => {
  alExpirar = fn;
};

api.interceptors.response.use(
  (r) => r,
  (error: AxiosError) => {
    if (error.response?.status === 401 && tokenGuardado.leer() && !error.config?.url?.startsWith('/auth/')) {
      tokenGuardado.borrar();
      alExpirar?.();
    }
    return Promise.reject(error);
  }
);

/** Mensaje legible para mostrar al usuario. */
export const mensajeError = (e: unknown): string => {
  const err = e as AxiosError<{ error?: string }>;
  if (err.response?.data?.error) return err.response.data.error;
  if (err.code === 'ECONNABORTED') return 'El servidor tardó demasiado. Intenta de nuevo.';
  if (!err.response) return 'Sin conexión con el servidor. Revisa el WiFi.';
  return 'Ocurrió un error inesperado';
};

export default api;
