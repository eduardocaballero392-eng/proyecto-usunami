import { ReactNode } from 'react';
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { AuthProvider, inicioPorRol, useAuth } from './context/AuthContext';
import { CarritoProvider } from './context/CarritoContext';
import { Rol } from './api/tipos';
import { Spinner } from './components/ui';
import Login from './pages/Login';
import MozoLayout from './pages/mozo/MozoLayout';
import Menu from './pages/mozo/Menu';
import Carrito from './pages/mozo/Carrito';
import MisPedidos from './pages/mozo/MisPedidos';
import Caja from './pages/caja/Caja';
import Cocina from './pages/cocina/Cocina';
import AdminLayout from './pages/admin/AdminLayout';
import Dashboard from './pages/admin/Dashboard';
import Reportes from './pages/admin/Reportes';
import PedidosAdmin from './pages/admin/PedidosAdmin';
import Personal from './pages/admin/Personal';
import Carta from './pages/admin/Carta';
import Configuracion from './pages/admin/Configuracion';

/** Protege una ruta por rol. ADMIN puede entrar a todo. */
const Protegida = ({ roles, children, login = '/login' }: { roles: Rol[]; children: ReactNode; login?: string }) => {
  const { usuario, cargando } = useAuth();
  if (cargando) return <Spinner texto="Cargando…" />;
  if (!usuario) return <Navigate to={login} replace />;
  if (usuario.rol !== 'ADMIN' && !roles.includes(usuario.rol)) return <Navigate to={inicioPorRol(usuario.rol)} replace />;
  return <>{children}</>;
};

/** "/" → pantalla según sesión; sin sesión, va al login unificado. */
const Inicio = () => {
  const { usuario, cargando } = useAuth();
  if (cargando) return <Spinner />;
  return <Navigate to={usuario ? inicioPorRol(usuario.rol) : '/login'} replace />;
};

const SoloInvitado = ({ children }: { children: ReactNode }) => {
  const { usuario, cargando } = useAuth();
  if (cargando) return <Spinner />;
  return usuario ? <Navigate to={inicioPorRol(usuario.rol)} replace /> : <>{children}</>;
};

const App = () => (
  <BrowserRouter>
    <AuthProvider>
      <CarritoProvider>
        <Routes>
          <Route path="/" element={<Inicio />} />
          <Route path="/login" element={<SoloInvitado><Login /></SoloInvitado>} />
          {/* /mozo ya no existe como pantalla separada — todo entra por /login */}
          <Route path="/mozo" element={<Navigate to="/login" replace />} />

          <Route element={<Protegida roles={['MOZO']} login="/mozo"><MozoLayout /></Protegida>}>
            <Route path="/mozo/menu" element={<Menu />} />
            <Route path="/mozo/carrito" element={<Carrito />} />
            <Route path="/mozo/pedidos" element={<MisPedidos />} />
          </Route>

          <Route path="/caja" element={<Protegida roles={['CAJERO']}><Caja /></Protegida>} />
          <Route path="/cocina" element={<Protegida roles={['COCINERO', 'PARRILLA', 'BROASTER']}><Cocina /></Protegida>} />

          <Route path="/admin" element={<Protegida roles={['ADMIN']}><AdminLayout /></Protegida>}>
            <Route index element={<Dashboard />} />
            <Route path="reportes" element={<Reportes />} />
            <Route path="pedidos" element={<PedidosAdmin />} />
            <Route path="personal" element={<Personal />} />
            <Route path="carta" element={<Carta />} />
            <Route path="configuracion" element={<Configuracion />} />
          </Route>

          <Route path="*" element={<Inicio />} />
        </Routes>
      </CarritoProvider>
    </AuthProvider>
  </BrowserRouter>
);

export default App;
