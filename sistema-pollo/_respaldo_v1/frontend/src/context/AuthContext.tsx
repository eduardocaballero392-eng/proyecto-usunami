import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { mozosApi } from '../api/mozos.api';
import axios from '../api/axios.config';

interface AuthContextType {
  isAuthenticated: boolean;
  mozoId: number | null;
  login: (mozoId: number) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth debe ser usado dentro de AuthProvider');
  }
  return context;
};

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [mozoId, setMozoId] = useState<number | null>(null);

  useEffect(() => {
    // Recuperar sesión del localStorage
    const token = localStorage.getItem('token');
    const savedMozoId = localStorage.getItem('mozoId');
    
    if (token && savedMozoId) {
      setIsAuthenticated(true);
      setMozoId(parseInt(savedMozoId));
      axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
    }
  }, []);

  const login = async (id: number) => {
    try {
      const { token, mozo } = await mozosApi.getToken(id);
      
      localStorage.setItem('token', token);
      localStorage.setItem('mozoId', mozo.id_usuarios.toString());
      
      axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
      
      setIsAuthenticated(true);
      setMozoId(mozo.id_usuarios);
    } catch (error) {
      console.error('Error en login:', error);
      throw error;
    }
  };

  const logout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('mozoId');
    delete axios.defaults.headers.common['Authorization'];
    setIsAuthenticated(false);
    setMozoId(null);
  };

  return (
    <AuthContext.Provider value={{ isAuthenticated, mozoId, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
};
