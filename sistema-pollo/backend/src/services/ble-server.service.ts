/**
 * SERVIDOR BLE PERSISTENTE PARA IMPRESORAS TÉRMICAS
 * 
 * Este servicio mantiene conexiones Bluetooth activas y persistentes
 * con las impresoras térmicas, eliminando la latencia de reconexión.
 * 
 * VENTAJAS:
 * - Impresión rápida (100-200ms vs 3-5 segundos)
 * - No depende de puertos COM que cambian
 * - Mantiene la impresora "despierta"
 * - Reconexión automática si se pierde señal
 * 
 * USO:
 * - Se inicia automáticamente con el backend
 * - printer.service.ts usa las conexiones de este servidor
 */

import noble from '@abandonware/noble';
import { EventEmitter } from 'events';
import logger from '../utils/logger';

// UUIDs estándar para impresoras térmicas BLE
const PRINTER_SERVICE_UUID = '000018f0-0000-1000-8000-00805f9b34fb';
const PRINTER_WRITE_CHAR_UUID = '00002af1-0000-1000-8000-00805f9b34fb';

interface BLEPrinterConnection {
  deviceName: string;
  peripheral: noble.Peripheral | null;
  writeCharacteristic: noble.Characteristic | null;
  isConnected: boolean;
  isConnecting: boolean;
  lastUsed: Date;
  reconnectAttempts: number;
}

class BLEServerService extends EventEmitter {
  private connections: Map<string, BLEPrinterConnection> = new Map();
  private isScanning: boolean = false;
  private keepAliveInterval: NodeJS.Timeout | null = null;

  constructor() {
    super();
    this.initNoble();
  }

  /**
   * Inicializa noble y configura event listeners
   */
  private initNoble() {
    noble.on('stateChange', async (state) => {
      logger.info(`[BLE Server] Estado Bluetooth: ${state}`);
      
      if (state === 'poweredOn') {
        this.emit('ready');
      } else {
        logger.warn(`[BLE Server] Bluetooth no disponible: ${state}`);
        this.emit('notReady', state);
      }
    });

    noble.on('discover', (peripheral) => {
      this.handleDiscoveredDevice(peripheral);
    });

    // Keep-alive cada 30 segundos
    this.keepAliveInterval = setInterval(() => {
      this.keepConnectionsAlive();
    }, 30000);
  }

  /**
   * Maneja dispositivo descubierto durante escaneo
   */
  private handleDiscoveredDevice(peripheral: noble.Peripheral) {
    const deviceName = peripheral.advertisement.localName || peripheral.id;
    
    // Solo procesar si alguien está esperando esta impresora
    for (const [name, conn] of this.connections.entries()) {
      if (conn.deviceName === deviceName && !conn.isConnected && !conn.isConnecting) {
        logger.info(`[BLE Server] Impresora encontrada: ${deviceName}`);
        this.connectToPrinter(name, peripheral);
        break;
      }
    }
  }

  /**
   * Conecta a una impresora y mantiene la conexión
   */
  private async connectToPrinter(deviceName: string, peripheral: noble.Peripheral) {
    const conn = this.connections.get(deviceName);
    if (!conn || conn.isConnecting) return;

    conn.isConnecting = true;
    conn.peripheral = peripheral;

    try {
      logger.info(`[BLE Server] Conectando a ${deviceName}...`);

      // Conectar al periférico
      await new Promise<void>((resolve, reject) => {
        peripheral.connect((error) => {
          if (error) reject(error);
          else resolve();
        });
      });

      logger.info(`[BLE Server] Conectado a ${deviceName}, descubriendo servicios...`);

      // Descubrir servicios y características
      const { services, characteristics } = await new Promise<{
        services: noble.Service[];
        characteristics: noble.Characteristic[];
      }>((resolve, reject) => {
        peripheral.discoverAllServicesAndCharacteristics((error, services, chars) => {
          if (error) reject(error);
          else resolve({ services: services || [], characteristics: chars || [] });
        });
      });

      // Buscar característica de escritura
      let writeChar: noble.Characteristic | null = null;

      // Intentar UUID estándar primero
      writeChar = characteristics.find(
        (c) => c.uuid === PRINTER_WRITE_CHAR_UUID.replace(/-/g, '')
      ) || null;

      // Si no encontramos el estándar, buscar cualquier característica escribible
      if (!writeChar) {
        writeChar = characteristics.find(
          (c) => c.properties.includes('write') || c.properties.includes('writeWithoutResponse')
        ) || null;
      }

      if (!writeChar) {
        throw new Error('No se encontró característica de escritura en la impresora');
      }

      conn.writeCharacteristic = writeChar;
      conn.isConnected = true;
      conn.isConnecting = false;
      conn.reconnectAttempts = 0;
      conn.lastUsed = new Date();

      logger.info(`[BLE Server] ✅ Conexión establecida con ${deviceName}`);
      this.emit('connected', deviceName);

      // Manejar desconexión
      peripheral.once('disconnect', () => {
        logger.warn(`[BLE Server] Desconectado de ${deviceName}`);
        conn.isConnected = false;
        conn.writeCharacteristic = null;
        this.emit('disconnected', deviceName);
        
        // Intentar reconectar
        this.scheduleReconnect(deviceName);
      });

    } catch (error) {
      conn.isConnecting = false;
      conn.reconnectAttempts++;
      
      const errorMsg = error instanceof Error ? error.message : String(error);
      logger.error(`[BLE Server] Error conectando a ${deviceName}: ${errorMsg}`);
      this.emit('error', { deviceName, error: errorMsg });

      // Reintentar si no hemos superado el límite
      if (conn.reconnectAttempts < 5) {
        this.scheduleReconnect(deviceName);
      }
    }
  }

  /**
   * Programa un reintento de reconexión
   */
  private scheduleReconnect(deviceName: string) {
    const conn = this.connections.get(deviceName);
    if (!conn) return;

    const delay = Math.min(5000 * Math.pow(2, conn.reconnectAttempts), 60000);
    logger.info(`[BLE Server] Reintentando conexión a ${deviceName} en ${delay}ms...`);

    setTimeout(() => {
      this.ensureConnection(deviceName);
    }, delay);
  }

  /**
   * Mantiene las conexiones vivas enviando keep-alive
   */
  private keepConnectionsAlive() {
    for (const [name, conn] of this.connections.entries()) {
      if (conn.isConnected && conn.peripheral) {
        // Verificar si la conexión sigue viva
        const timeSinceLastUse = Date.now() - conn.lastUsed.getTime();
        
        // Si no se ha usado en 5 minutos, verificar estado
        if (timeSinceLastUse > 300000) {
          logger.debug(`[BLE Server] Verificando conexión con ${name}...`);
          
          // Intentar leer estado (esto mantiene la conexión activa)
          if (conn.writeCharacteristic) {
            conn.writeCharacteristic.read((error) => {
              if (error) {
                logger.warn(`[BLE Server] Conexión perdida con ${name}, reconectando...`);
                conn.isConnected = false;
                this.ensureConnection(name);
              }
            });
          }
        }
      }
    }
  }

  /**
   * Inicia el servidor BLE (llamar desde app.ts)
   */
  async start(): Promise<void> {
    logger.info('[BLE Server] Iniciando servidor BLE persistente...');

    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        reject(new Error('Timeout esperando que Bluetooth esté listo'));
      }, 10000);

      if ((noble as any).state === 'poweredOn' || noble._state === 'poweredOn') {
        clearTimeout(timeout);
        logger.info('[BLE Server] ✅ Servidor BLE listo');
        resolve();
      } else {
        this.once('ready', () => {
          clearTimeout(timeout);
          logger.info('[BLE Server] ✅ Servidor BLE listo');
          resolve();
        });

        this.once('notReady', (state) => {
          clearTimeout(timeout);
          reject(new Error(`Bluetooth no disponible: ${state}`));
        });
      }
    });
  }

  /**
   * Detiene el servidor BLE
   */
  async stop(): Promise<void> {
    logger.info('[BLE Server] Deteniendo servidor BLE...');

    if (this.keepAliveInterval) {
      clearInterval(this.keepAliveInterval);
      this.keepAliveInterval = null;
    }

    if (this.isScanning) {
      await noble.stopScanningAsync();
      this.isScanning = false;
    }

    // Desconectar todas las impresoras
    for (const [name, conn] of this.connections.entries()) {
      if (conn.peripheral && conn.isConnected) {
        await new Promise<void>((resolve) => {
          conn.peripheral!.disconnect(() => {
            logger.info(`[BLE Server] Desconectado de ${name}`);
            resolve();
          });
        });
      }
    }

    this.connections.clear();
    logger.info('[BLE Server] ✅ Servidor BLE detenido');
  }

  /**
   * Registra una impresora para mantener conexión persistente
   */
  registerPrinter(deviceName: string): void {
    if (this.connections.has(deviceName)) {
      logger.debug(`[BLE Server] Impresora ${deviceName} ya registrada`);
      return;
    }

    logger.info(`[BLE Server] Registrando impresora: ${deviceName}`);

    this.connections.set(deviceName, {
      deviceName,
      peripheral: null,
      writeCharacteristic: null,
      isConnected: false,
      isConnecting: false,
      lastUsed: new Date(),
      reconnectAttempts: 0,
    });

    // Iniciar conexión
    this.ensureConnection(deviceName);
  }

  /**
   * Asegura que hay conexión con una impresora (conecta si no está)
   */
  async ensureConnection(deviceName: string): Promise<void> {
    const conn = this.connections.get(deviceName);
    
    if (!conn) {
      throw new Error(`Impresora ${deviceName} no registrada. Llamar registerPrinter() primero.`);
    }

    if (conn.isConnected) {
      logger.debug(`[BLE Server] Ya conectado a ${deviceName}`);
      return;
    }

    if (conn.isConnecting) {
      logger.debug(`[BLE Server] Ya conectando a ${deviceName}...`);
      return;
    }

    // Iniciar escaneo si no está activo
    if (!this.isScanning) {
      logger.info(`[BLE Server] Iniciando escaneo BLE para ${deviceName}...`);
      this.isScanning = true;
      
      try {
        await noble.startScanningAsync([], true); // Permitir duplicados
      } catch (error) {
        this.isScanning = false;
        throw error;
      }
    }
  }

  /**
   * Envía datos a una impresora (usado por printer.service.ts)
   */
  async write(deviceName: string, data: Buffer): Promise<void> {
    const conn = this.connections.get(deviceName);
    
    if (!conn) {
      throw new Error(`Impresora ${deviceName} no registrada`);
    }

    if (!conn.isConnected || !conn.writeCharacteristic) {
      throw new Error(`Impresora ${deviceName} no conectada`);
    }

    // Actualizar último uso
    conn.lastUsed = new Date();

    // Dividir en chunks de 20 bytes (MTU típico de BLE)
    const MTU = 20;
    for (let i = 0; i < data.length; i += MTU) {
      const chunk = data.slice(i, Math.min(i + MTU, data.length));
      
      await new Promise<void>((resolve, reject) => {
        conn.writeCharacteristic!.write(chunk, false, (error) => {
          if (error) reject(error);
          else resolve();
        });
      });

      // Pequeña pausa entre chunks para no saturar
      if (i + MTU < data.length) {
        await new Promise(resolve => setTimeout(resolve, 10));
      }
    }

    logger.debug(`[BLE Server] Enviados ${data.length} bytes a ${deviceName}`);
  }

  /**
   * Verifica si una impresora está conectada
   */
  isConnected(deviceName: string): boolean {
    const conn = this.connections.get(deviceName);
    return conn ? conn.isConnected : false;
  }

  /**
   * Obtiene el estado de todas las conexiones
   */
  getStatus(): Record<string, { connected: boolean; lastUsed: Date; reconnectAttempts: number }> {
    const status: Record<string, any> = {};
    
    for (const [name, conn] of this.connections.entries()) {
      status[name] = {
        connected: conn.isConnected,
        lastUsed: conn.lastUsed,
        reconnectAttempts: conn.reconnectAttempts,
      };
    }

    return status;
  }
}

// Singleton
export const bleServer = new BLEServerService();
