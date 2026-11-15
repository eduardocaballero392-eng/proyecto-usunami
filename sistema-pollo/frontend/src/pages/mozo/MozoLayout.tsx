import { NavLink, Outlet } from 'react-router-dom';
import { ClipboardList, LogOut, ShoppingCart, UtensilsCrossed } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useCarrito } from '../../context/CarritoContext';

const MozoLayout = () => {
  const { usuario, salir } = useAuth();
  const { totalUnidades, vaciar } = useCarrito();
  const tab = ({ isActive }: { isActive: boolean }) =>
    `relative flex min-h-[56px] flex-1 flex-col items-center justify-center gap-0.5 text-xs font-medium ${isActive ? 'text-amber-600 dark:text-amber-400' : 'text-tinta-3'}`;

  return (
    <div className="min-h-screen pb-[72px]">
      <header className="sticky top-0 z-20 flex items-center justify-between border-b border-borde bg-superficie/95 px-4 py-2 backdrop-blur">
        <p className="font-semibold">Hola, {usuario?.nombre.split(' ')[0]}</p>
        <button
          onClick={() => {
            if (totalUnidades && !confirm('Tienes productos en el carrito sin enviar. ¿Salir de todos modos?')) return;
            vaciar();
            salir();
          }}
          className="flex h-11 items-center gap-1 rounded-xl px-3 text-sm text-tinta-2 hover:bg-fondo"
        >
          <LogOut className="h-4 w-4" /> Salir
        </button>
      </header>
      <Outlet />
      <nav className="fixed inset-x-0 bottom-0 z-30 flex border-t border-borde bg-superficie pb-[env(safe-area-inset-bottom)]">
        <NavLink to="/mozo/menu" className={tab}><UtensilsCrossed className="h-6 w-6" /> Menú</NavLink>
        <NavLink to="/mozo/carrito" className={tab}>
          <ShoppingCart className="h-6 w-6" /> Pedido
          {totalUnidades > 0 && <span className="absolute right-[calc(50%-22px)] top-1.5 flex h-5 min-w-[20px] items-center justify-center rounded-full bg-red-600 px-1 text-[11px] font-bold text-white">{totalUnidades}</span>}
        </NavLink>
        <NavLink to="/mozo/pedidos" className={tab}><ClipboardList className="h-6 w-6" /> Mis mesas</NavLink>
      </nav>
    </div>
  );
};

export default MozoLayout;
