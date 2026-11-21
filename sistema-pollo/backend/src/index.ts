import os from 'os';
import { env } from './config/env';
import app from './app';
import { cerrarPool, probarConexion } from './config/database';
import { detenerWorker, iniciarWorker } from './services/impresion.service';
import { bleServer } from './services/ble-server.service';
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

  // Iniciar servidor BLE si el modo es bluetooth
  if (env.impresion.modo === 'bluetooth') {
    try {
      logger.info('[BLE Server] Iniciando servidor BLE persistente...');
      await bleServer.start();
      logger.info('[BLE Server] ✅ Servidor BLE iniciado correctamente');
    } catch (e) {
      logger.warn('[BLE Server] No se pudo iniciar servidor BLE (Bluetooth no disponible)', { 
        error: (e as Error).message 
      });
      logger.warn('[BLE Server] Las impresoras Bluetooth no funcionarán. Verifica que Bluetooth esté activo.');
    }
  }

  const servidor = app.listen(env.puerto, '0.0.0.0', () => {
    logger.info(`Servidor escuchando en el puerto ${env.puerto}`, {
      entorno: env.esProduccion ? 'production' : 'development',
      red: ipsLocales().map((ip) => `http://${ip}:${env.puerto}`),
      printerMode: env.impresion.modo,
    });
  });
  iniciarWorker();

  const apagar = async (senal: string) => {
    logger.info(`Recibido ${senal}, cerrando…`);
    detenerWorker();
    
    // Detener servidor BLE
    if (env.impresion.modo === 'bluetooth') {
      try {
        await bleServer.stop();
      } catch (e) {
        logger.warn('[BLE Server] Error al detener servidor BLE', { error: (e as Error).message });
      }
    }
    
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
