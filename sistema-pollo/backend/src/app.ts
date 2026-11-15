import fs from 'fs';
import path from 'path';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import { env } from './config/env';
import { manejarErrores, noEncontrado } from './middlewares/comunes';
import authRoutes from './routes/auth.routes';
import pedidosRoutes from './routes/pedidos.routes';
import cajaRoutes from './routes/caja.routes';
import reportesRoutes from './routes/reportes.routes';
import adminRoutes from './routes/admin.routes';

const app = express();
app.set('trust proxy', false);
app.disable('x-powered-by');

// Red local sin HTTPS: desactivamos las cabeceras que obligan a HTTPS
app.use(
  helmet({
    contentSecurityPolicy: {
      useDefaults: true,
      directives: { 'upgrade-insecure-requests': null, 'img-src': ["'self'", 'data:', 'blob:'] },
    },
    hsts: false,
    crossOriginOpenerPolicy: false,
    originAgentCluster: false,
  })
);
app.use(cors({ origin: env.corsOrigenes.length ? env.corsOrigenes : true }));
app.use(compression());
app.use(express.json({ limit: '200kb' }));

app.get('/api/salud', (_req, res) => res.json({ estado: 'OK', hora: new Date().toISOString() }));

app.use('/api/auth', authRoutes);
app.use('/api', pedidosRoutes); // /api/menu, /api/mesas, /api/pedidos/*
app.use('/api/caja', cajaRoutes);
app.use('/api/reportes', reportesRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api', noEncontrado);

// En producción el mismo servidor entrega la app web (frontend/dist) → un solo puerto, sin internet
const dist = path.resolve(__dirname, '../../frontend/dist');
if (fs.existsSync(path.join(dist, 'index.html'))) {
  app.use(express.static(dist, { maxAge: '7d', index: false }));
  app.get('*', (_req, res) => res.sendFile(path.join(dist, 'index.html')));
}

app.use(manejarErrores);

export default app;
