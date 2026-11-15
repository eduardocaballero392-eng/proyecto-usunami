import os from 'os';
import { env } from './config/env';
import app from './app';
import { cerrarPool, probarConexion } from './config/database';
import { detenerWorker, iniciarWorker } from './services/impresion.service';
import logger from './utils/logger';

const ipsLocales = () =>
  Object.values(os.networkInterfaces())
    .flat()
    .filter((i) => i && i.family === 'IPv4' && !i.internal)
    .map((i) => i!.address);

const iniciar = async () => {
  try {
    await probarConexion();
  } catch (e) {
    logger.error('No se pudo conectar a la base de datos. ¿Está encendido MySQL en XAMPP?', { error: (e as Error).message });
    process.exit(1);
  }

  const servidor = app.listen(env.puerto, '0.0.0.0', () => {
    logger.info(`Servidor escuchando en el puerto ${env.puerto}`, {
      entorno: env.esProduccion ? 'production' : 'development',
      red: ipsLocales().map((ip) => `http://${ip}:${env.puerto}`),
    });
  });
  iniciarWorker();

  const apagar = (senal: string) => {
    logger.info(`Recibido ${senal}, cerrando…`);
    detenerWorker();
    servidor.close(() => {
      cerrarPool().finally(() => process.exit(0));
    });
    setTimeout(() => process.exit(1), 10_000).unref();
  };
  process.on('SIGINT', () => apagar('SIGINT'));
  process.on('SIGTERM', () => apagar('SIGTERM'));
};

process.on('unhandledRejection', (e) => logger.error('Promesa rechazada sin manejar', { error: String(e) }));

iniciar();
