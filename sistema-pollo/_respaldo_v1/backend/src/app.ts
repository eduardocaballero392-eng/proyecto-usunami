import express, { Application } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import { errorHandler } from './middlewares/errorHandler.middleware';

// Routes
import authRoutes from './routes/auth.routes';
import mozosRoutes from './routes/mozos.routes';
import productosRoutes from './routes/productos.routes';
import pedidosRoutes from './routes/pedidos.routes';
import cajaRoutes from './routes/caja.routes';
import cocinaRoutes from './routes/cocina.routes';
import reportesRoutes from './routes/reportes.routes';
import adminRoutes from './routes/admin.routes';

const app: Application = express();

// Middlewares globales
app.use(helmet());
app.use(cors({
  origin: '*', // En producción, especificar origen exacto de la red local
  credentials: true
}));
app.use(compression());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'OK', timestamp: new Date().toISOString() });
});

// Rutas API
app.use('/api/auth', authRoutes);
app.use('/api/mozos', mozosRoutes);
app.use('/api/productos', productosRoutes);
app.use('/api/pedidos', pedidosRoutes);
app.use('/api/caja', cajaRoutes);
app.use('/api/cocina', cocinaRoutes);
app.use('/api/reportes', reportesRoutes);
app.use('/api/admin', adminRoutes);

// Manejo de errores
app.use(errorHandler);

export default app;
