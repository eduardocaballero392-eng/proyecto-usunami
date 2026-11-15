import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { CarritoProvider } from './context/CarritoContext';
import MozoSelectPage from './pages/MozoSelectPage';
import MenuPage from './pages/MenuPage';
import CartPage from './pages/CartPage';
import PedidosPage from './pages/PedidosPage';

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <CarritoProvider>
          <Routes>
            <Route path="/" element={<Navigate to="/mozo-select" replace />} />
            <Route path="/mozo-select" element={<MozoSelectPage />} />
            <Route path="/menu" element={<MenuPage />} />
            <Route path="/carrito" element={<CartPage />} />
            <Route path="/pedidos" element={<PedidosPage />} />
          </Routes>
        </CarritoProvider>
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App;
