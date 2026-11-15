import { NavLink, Outlet } from 'react-router-dom';
import { BarChart3, Flame, LayoutDashboard, LogOut, Settings, ShoppingBag, UtensilsCrossed, Users, Wallet } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

const enlaces = [
  { a: '/admin', texto: 'Dashboard', Icono: LayoutDashboard, fin: true },
  { a: '/admin/reportes', texto: 'Reportes', Icono: BarChart3 },
  { a: '/admin/pedidos', texto: 'Pedidos', Icono: ShoppingBag },
  { a: '/admin/personal', texto: 'Personal', Icono: Users },
  { a: '/admin/carta', texto: 'Carta', Icono: UtensilsCrossed },
  { a: '/admin/configuracion', texto: 'Local', Icono: Settings },
  { a: '/caja', texto: 'Caja', Icono: Wallet },
];

const AdminLayout = () => {
  const { usuario, salir } = useAuth();
  const clase = ({ isActive }: { isActive: boolean }) =>
    `flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors ${
      isActive ? 'bg-amber-500/15 text-amber-800 dark:text-amber-300' : 'text-tinta-2 hover:bg-fondo'
    }`;

  return (
    <div className="min-h-screen lg:flex">
      {/* Barra lateral (escritorio) */}
      <aside className="sticky top-0 hidden h-screen w-60 shrink-0 flex-col border-r border-borde bg-superficie p-4 lg:flex">
        <div className="mb-6 flex items-center gap-2 px-2">
          <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-amber-500 text-white">
            <Flame className="h-5 w-5" />
          </span>
          <div>
            <p className="font-bold leading-tight">La Parrillita</p>
            <p className="text-xs text-tinta-3">Administración</p>
          </div>
        </div>
        <nav className="flex flex-1 flex-col gap-1">
          {enlaces.map(({ a, texto, Icono, fin }) => (
            <NavLink key={a} to={a} end={fin} className={clase}>
              <Icono className="h-4 w-4" /> {texto}
            </NavLink>
          ))}
        </nav>
        <div className="border-t border-borde pt-3">
          <p className="truncate px-3 text-sm font-medium">{usuario?.nombre}</p>
          <button onClick={salir} className="mt-1 flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm text-tinta-2 hover:bg-fondo">
            <LogOut className="h-4 w-4" /> Cerrar sesión
          </button>
        </div>
      </aside>

      {/* Navegación superior (celular / tablet) */}
      <header className="sticky top-0 z-20 border-b border-borde bg-superficie/95 backdrop-blur lg:hidden">
        <div className="flex items-center justify-between px-4 py-2">
          <p className="flex items-center gap-2 font-bold">
            <Flame className="h-5 w-5 text-amber-500" /> La Parrillita
          </p>
          <button onClick={salir} className="flex h-11 w-11 items-center justify-center rounded-xl text-tinta-2 hover:bg-fondo" aria-label="Cerrar sesión">
            <LogOut className="h-5 w-5" />
          </button>
        </div>
        <nav className="flex gap-1 overflow-x-auto px-2 pb-2">
          {enlaces.map(({ a, texto, Icono, fin }) => (
            <NavLink key={a} to={a} end={fin} className={(p) => `${clase(p)} shrink-0`}>
              <Icono className="h-4 w-4" /> {texto}
            </NavLink>
          ))}
        </nav>
      </header>

      <main className="min-w-0 flex-1 px-4 py-5 sm:px-6 lg:px-8 lg:py-8">
        <Outlet />
      </main>
    </div>
  );
};

export default AdminLayout;
