import net from 'net';

/**
 * Documento de impresión independiente de la impresora.
 * Se guarda como JSON en impresiones.contenido, así cualquier reintento imprime exactamente lo mismo.
 */
export type Linea =
  | { texto: string; negrita?: boolean; grande?: boolean; alinear?: 'izq' | 'centro' | 'der' }
  | { separador: '=' | '-' }
  | { columnas: [string, string]; negrita?: boolean }
  | { vacia: true };

export interface Documento {
  lineas: Linea[];
}

/** Las térmicas no siempre traen la página de códigos correcta: quitamos tildes y símbolos. */
const aAscii = (s: string): string =>
  s
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[ñÑ]/g, (c) => (c === 'ñ' ? 'n' : 'N'))
    .replace(/[^\x20-\x7E]/g, '');

/** Parte el texto en líneas del ancho del papel, conservando la sangría inicial en cada línea. */
const ajustar = (texto: string, ancho: number): string[] => {
  const sangria = texto.match(/^\s*/)![0];
  const util = Math.max(10, ancho - sangria.length);
  const palabras = texto.trim().split(/\s+/);
  const lineas: string[] = [];
  let actual = '';
  for (const p of palabras) {
    if (actual && (actual + ' ' + p).length > util) {
      lineas.push(actual);
      actual = p.slice(0, util);
    } else {
      actual = actual ? `${actual} ${p}` : p.slice(0, util);
    }
  }
  if (actual) lineas.push(actual);
  return (lineas.length ? lineas : ['']).map((l) => sangria + l);
};

const alinear = (t: string, ancho: number, modo: 'izq' | 'centro' | 'der' = 'izq'): string => {
  if (modo === 'centro') return ' '.repeat(Math.max(0, Math.floor((ancho - t.length) / 2))) + t;
  if (modo === 'der') return t.padStart(ancho);
  return t;
};

const columnas = ([izq, der]: [string, string], ancho: number): string => {
  const espacio = Math.max(1, ancho - izq.length - der.length);
  return (izq + ' '.repeat(espacio) + der).slice(0, Math.max(ancho, izq.length + der.length + 1));
};

/** Texto plano (modo mock, logs y vista previa en pantalla). */
export const aTexto = (doc: Documento, ancho: number): string =>
  doc.lineas
    .flatMap((l) => {
      if ('vacia' in l) return [''];
      if ('separador' in l) return [l.separador.repeat(ancho)];
      if ('columnas' in l) return [columnas(l.columnas, ancho)];
      return ajustar(l.texto, ancho).map((t) => alinear(l.grande ? t.toUpperCase() : t, ancho, l.alinear));
    })
    .join('\n');

// --- ESC/POS ---------------------------------------------------------------
const ESC = 0x1b;
const GS = 0x1d;
const CMD = {
  iniciar: [ESC, 0x40],
  alinear: (n: 0 | 1 | 2) => [ESC, 0x61, n],
  negrita: (on: boolean) => [ESC, 0x45, on ? 1 : 0],
  tamano: (dobleAlto: boolean) => [GS, 0x21, dobleAlto ? 0x01 : 0x00],
  avanzar: (n: number) => [ESC, 0x64, n],
  cortar: [GS, 0x56, 0x42, 0x00],
};

/** Convierte el documento a bytes ESC/POS. */
export const aEscPos = (doc: Documento, ancho: number): Buffer => {
  const partes: number[] = [...CMD.iniciar];
  const texto = (s: string) => partes.push(...Buffer.from(aAscii(s) + '\n', 'ascii'));

  for (const l of doc.lineas) {
    if ('vacia' in l) {
      texto('');
    } else if ('separador' in l) {
      partes.push(...CMD.alinear(0));
      texto(l.separador.repeat(ancho));
    } else if ('columnas' in l) {
      partes.push(...CMD.alinear(0), ...CMD.negrita(!!l.negrita));
      texto(columnas(l.columnas, ancho));
      partes.push(...CMD.negrita(false));
    } else {
      const modo = l.alinear === 'centro' ? 1 : l.alinear === 'der' ? 2 : 0;
      partes.push(...CMD.alinear(modo), ...CMD.negrita(!!l.negrita), ...CMD.tamano(!!l.grande));
      ajustar(l.texto, ancho).forEach(texto);
      partes.push(...CMD.tamano(false), ...CMD.negrita(false));
    }
  }
  partes.push(...CMD.avanzar(4), ...CMD.cortar);
  return Buffer.from(partes);
};

/** Envía bytes crudos a una impresora de red (RAW / JetDirect, puerto 9100). */
export const enviarAImpresora = (ip: string, puerto: number, datos: Buffer, timeoutMs: number): Promise<void> =>
  new Promise((resolve, reject) => {
    const socket = new net.Socket();
    let terminado = false;
    const fin = (err?: Error) => {
      if (terminado) return;
      terminado = true;
      socket.destroy();
      err ? reject(err) : resolve();
    };
    socket.setTimeout(timeoutMs);
    socket.once('timeout', () => fin(new Error(`Sin respuesta de ${ip}:${puerto}`)));
    socket.once('error', (e) => fin(new Error(`No se pudo conectar a ${ip}:${puerto} (${e.message})`)));
    socket.connect(puerto, ip, () => {
      socket.write(datos, (err) => {
        if (err) return fin(err);
        socket.end(() => fin());
      });
    });
  });
