import { query } from './database';

export interface PrinterConfig {
  id: number;
  nombre: string;
  ip: string;
  puerto: number;
  areaId: number;
}

// 'mock' (por defecto) imprime en consola; 'produccion' usa impresora física
export const getModoImpresion = (): 'mock' | 'produccion' =>
  process.env.PRINT_MODE === 'produccion' ? 'produccion' : 'mock';

export const obtenerConfiguracionImpresora = async (areaId: number): Promise<PrinterConfig | null> => {
  const rows = await query<PrinterConfig[]>(
    'SELECT id, nombre, ip, puerto, areaId FROM impresoras WHERE areaId = ? AND activa = 1 LIMIT 1',
    [areaId]
  );
  return rows.length > 0 ? rows[0] : null;
};

export const imprimirMock = (contenido: string, nombreImpresora: string): void => {
  console.log(`\n===== [MOCK] Impresora: ${nombreImpresora} =====`);
  console.log(contenido);
  console.log('===== [FIN MOCK] =====\n');
};

// TODO: implementar con una librería ESC/POS (p. ej. node-thermal-printer) para modo 'produccion'
export const crearInstanciaPrinter = (_ip: string, _puerto: number): any => {
  throw new Error('Impresión física no implementada. Usa PRINT_MODE=mock.');
};
