import { LogOut, RefreshCw } from 'lucide-react';
import api from '../../api/cliente';
import { Pedido, Rol } from '../../api/tipos';
import { useAuth } from '../../context/AuthContext';
import { Aviso, Spinner, useDatos } from '../../components/ui';
import { minutosDesde, tituloPedido } from '../../utils/formato';

const AREA_POR_ROL: Partial<Record<Rol, string>> = { PARRILLA: 'PARRILLA', BROASTER: 'BROASTER', COCINERO: 'CARTA' };

/** Vista de cocina: comandas abiertas de su área (respaldo de la comanda impresa). */
const Cocina = () => {
  const { usuario, salir } = useAuth();
  const area = usuario ? AREA_POR_ROL[usuario.rol] : undefined;
  const { datos, error, cargando, recargar } = useDatos(() => api.get<Pedido[]>('/pedidos/activos').then((r) => r.data), [], 15_000);

  const pedidos = (datos ?? [])
    .map((p) => ({ ...p, items: p.items.filter((i) => !i.anulado && (!area || i.areaNombre === area)) }))
    .filter((p) => p.items.length);

  return (
    <div className="min-h-screen">
      <header className="sticky top-0 z-10 flex items-center justify-between border-b border-borde bg-superficie px-4 py-2">
        <p className="font-bold">Comandas · {area ?? 'Todas las áreas'}</p>
        <div className="flex">
          <button onClick={() => recargar()} className="flex h-11 w-11 items-center justify-center rounded-xl hover:bg-fondo" aria-label="Actualizar"><RefreshCw className="h-5 w-5" /></button>
          <button onClick={salir} className="flex h-11 w-11 items-center justify-center rounded-xl hover:bg-fondo" aria-label="Salir"><LogOut className="h-5 w-5" /></button>
        </div>
      </header>
      <main className="p-4">
        {error && <Aviso>{error}</Aviso>}
        {cargando && !datos ? <Spinner /> : !pedidos.length ? (
          <p className="py-16 text-center text-tinta-3">Sin comandas pendientes</p>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {pedidos.map((p) => {
              const min = minutosDesde(p.creadoEn);
              return (
                <article key={p.id_pedidos} className="rounded-2xl border border-borde bg-superficie p-4">
                  <header className="mb-2 flex items-baseline justify-between">
                    <h2 className="text-xl font-bold">{tituloPedido(p)}</h2>
                    <span className={`text-sm ${min > 30 ? 'font-semibold text-red-700 dark:text-red-400' : 'text-tinta-3'}`}>{min} min</span>
                  </header>
                  <p className="mb-2 text-sm text-tinta-3">{p.mozoNombre}</p>
                  <ul className="space-y-1.5">
                    {p.items.map((i) => (
                      <li key={i.id_detalle_pedidos}>
                        <p className="text-lg"><b>{i.cantidad}×</b> {i.productoNombre}{i.ronda > 1 && <span className="ml-1 text-xs font-semibold text-amber-700 dark:text-amber-400">AGREGADO</span>}</p>
                        {i.opciones && <p className="pl-6 text-sm text-tinta-2">+ {i.opciones}</p>}
                        {i.nota && <p className="pl-6 text-sm font-medium">Nota: {i.nota}</p>}
                      </li>
                    ))}
                  </ul>
                </article>
              );
            })}
          </div>
        )}
      </main>
    </div>
  );
};

export default Cocina;
