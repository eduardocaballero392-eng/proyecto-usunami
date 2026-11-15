/**
 * DATOS DE DEMOSTRACIÓN — sólo para desarrollo / capacitación.
 * Crea personal de prueba y simula ~60 días de ventas para ver el dashboard con datos.
 *
 *   npm run datos-demo
 *
 * Se niega a correr en producción o si ya existen pedidos.
 */
import bcrypt from 'bcrypt';
import { RowDataPacket } from 'mysql2';
import pool, { cerrarPool, consultar, consultarUno, enTransaccion } from '../src/config/database';
import { hoyLima, sumarDias } from '../src/utils/fechas';

const DIAS = Number(process.argv[2] ?? 60);
const azar = (min: number, max: number) => Math.floor(Math.random() * (max - min + 1)) + min;
const elegir = <T>(lista: T[]) => lista[azar(0, lista.length - 1)];
const pad = (n: number) => String(n).padStart(2, '0');

const main = async () => {
  if (process.env.NODE_ENV === 'production') throw new Error('No se permiten datos demo en producción');
  const hay = await consultarUno<{ n: number }>('SELECT COUNT(*) AS n FROM pedidos');
  if (Number(hay?.n)) throw new Error('La base ya tiene pedidos. Los datos demo sólo se cargan en una base vacía.');

  // Personal de prueba - Mozos solo con PIN, otros roles con usuario/pass
  const pass = await bcrypt.hash('demo1234', 10);
  const pin = await bcrypt.hash('1234', 10);
  const personal: [string, string | null, string | null, string | null, string][] = [
    ['Rosa Quispe', 'rosa', pass, null, 'CAJERO'],
    ['Luis Mamani', 'luis', pass, pin, 'PARRILLA'],
    ['Juan Pérez', null, null, pin, 'MOZO'],
    ['María López', null, null, pin, 'MOZO'],
    ['Carlos Ramírez', null, null, pin, 'MOZO'],
    ['Lucía Torres', null, null, pin, 'MOZO'],
    ['Pedro Sánchez', 'pedro', pass, pin, 'PARRILLA'],
    ['Ana Flores', 'ana', pass, pin, 'BROASTER'],
    ['José Vargas', 'jose', pass, pin, 'COCINERO'],
  ];
  for (const p of personal) {
    await pool.query('INSERT IGNORE INTO usuarios (nombre, usuario, password, pinHash, rol) VALUES (?, ?, ?, ?, ?)', p);
  }

  const mozos = await consultar<{ id_usuarios: number }>("SELECT id_usuarios FROM usuarios WHERE rol = 'MOZO' AND activo = 1");
  const cajero = await consultarUno<{ id_usuarios: number }>("SELECT id_usuarios FROM usuarios WHERE usuario = 'rosa'");
  const productos = await consultar<RowDataPacket>('SELECT id_productos, precio, recargoLlevar, areaId FROM productos WHERE activo = 1');
  const mesas = await consultar<{ id_mesas: number }>('SELECT id_mesas FROM mesas WHERE activo = 1');
  if (!mozos.length || !productos.length || !mesas.length || !cajero) throw new Error('Faltan datos base: ejecuta database/seed.sql');

  // Popularidad desigual para que el ranking sea realista
  const pesos = productos.map((_, i) => Math.max(1, 12 - i));
  const elegirProducto = () => {
    let r = azar(1, pesos.reduce((a, b) => a + b, 0));
    for (let i = 0; i < productos.length; i++) if ((r -= pesos[i]) <= 0) return productos[i];
    return productos[0];
  };
  // Más pedidos al mediodía y en la noche
  const horas = [12, 12, 13, 13, 13, 14, 14, 15, 18, 19, 19, 20, 20, 20, 21, 21, 22];

  const hoy = hoyLima();
  let numero = 1;
  let total = 0;

  for (let d = DIAS; d >= 1; d--) {
    const fecha = sumarDias(hoy, -d);
    const finDeSemana = [0, 5, 6].includes(new Date(`${fecha}T12:00:00Z`).getUTCDay());
    const pedidosDia = azar(finDeSemana ? 45 : 22, finDeSemana ? 75 : 40);

    await enTransaccion(async (conn) => {
      const [t] = await conn.query<import('mysql2').ResultSetHeader>(
        'INSERT INTO turnos_caja (usuarioId, montoInicial, apertura) VALUES (?, 200, ?)',
        [cajero.id_usuarios, `${fecha} 11:30:00`]
      );
      const turnoId = t.insertId;
      let efectivo = 0;

      for (let k = 0; k < pedidosDia; k++) {
        const tipo = elegir(['MESA', 'MESA', 'MESA', 'MESA', 'LLEVAR', 'LLEVAR', 'DELIVERY']);
        const creado = `${fecha} ${pad(elegir(horas))}:${pad(azar(0, 59))}:${pad(azar(0, 59))}`;
        const anulado = Math.random() < 0.02;
        const [p] = await conn.query<import('mysql2').ResultSetHeader>(
          'INSERT INTO pedidos (usuarioId, tipo, estado, creadoEn) VALUES (?, ?, ?, ?)',
          [elegir(mozos).id_usuarios, tipo, anulado ? 'ANULADO' : 'PAGADO', creado]
        );
        const pedidoId = p.insertId;
        if (tipo === 'MESA') await conn.query('INSERT INTO pedido_mesas VALUES (?, ?)', [pedidoId, elegir(mesas).id_mesas]);

        let cent = 0;
        for (let i = 0; i < azar(1, 5); i++) {
          const pr = elegirProducto();
          const cant = azar(1, 3);
          const precio = Number(pr.precio);
          const recargo = tipo === 'LLEVAR' ? Number(pr.recargoLlevar) : 0;
          cent += Math.round(cant * (precio + recargo) * 100);
          await conn.query(
            'INSERT INTO detalle_pedidos (pedidoId, productoId, areaId, cantidad, precioUnitario, recargoUnitario, creadoEn) VALUES (?, ?, ?, ?, ?, ?, ?)',
            [pedidoId, pr.id_productos, pr.areaId, cant, precio, recargo, creado]
          );
        }
        const monto = cent / 100;

        if (anulado) {
          await conn.query(
            "UPDATE pedidos SET total = ?, anuladoEn = ? + INTERVAL 10 MINUTE, motivoAnulacion = 'Cliente se retiró', anuladoPor = ? WHERE id_pedidos = ?",
            [monto, creado, cajero.id_usuarios, pedidoId]
          );
          continue;
        }

        await conn.query('UPDATE pedidos SET total = ?, pagadoEn = ? + INTERVAL ? MINUTE WHERE id_pedidos = ?', [monto, creado, azar(25, 70), pedidoId]);
        const metodo = elegir(['EFECTIVO', 'EFECTIVO', 'YAPE', 'YAPE', 'PLIN']);
        if (metodo === 'EFECTIVO') efectivo += monto;
        await conn.query('INSERT INTO pagos (pedidoId, turnoCajaId, metodo, monto, montoRecibido, creadoEn) VALUES (?, ?, ?, ?, ?, ?)', [
          pedidoId, turnoId, metodo, monto, metodo === 'EFECTIVO' ? monto : null, creado,
        ]);
        await conn.query("INSERT INTO comprobantes (pedidoId, serie, numero, total, creadoEn) VALUES (?, 'B001', ?, ?, ?)", [pedidoId, numero++, monto, creado]);
        total++;
      }

      const esperado = Math.round((200 + efectivo) * 100) / 100;
      const contado = Math.round((esperado + elegir([0, 0, 0, -0.5, 1, -2])) * 100) / 100;
      await conn.query(
        'UPDATE turnos_caja SET cierre = ?, montoEsperado = ?, montoFinal = ?, diferencia = ? WHERE id_turnos_caja = ?',
        [`${fecha} 23:45:00`, esperado, contado, Math.round((contado - esperado) * 100) / 100, turnoId]
      );
    });
  }
  await pool.query("UPDATE series SET siguienteNumero = ? WHERE serie = 'B001'", [numero]);

  console.log(`✔ ${total} ventas simuladas en ${DIAS} días`);
  console.log('  Cajera: rosa / demo1234');
  console.log('  Mozos: Juan, María, Carlos, Lucía (solo PIN: 1234)');
  console.log('  Parrilla: Luis o Pedro (usuario/pass: demo1234, PIN: 1234)');
  console.log('  Broaster: Ana (usuario/pass: ana/demo1234, PIN: 1234)');
  console.log('  Cocinero: José (usuario/pass: jose/demo1234, PIN: 1234)');
};

main()
  .catch((e) => {
    console.error('✘', e.message);
    process.exitCode = 1;
  })
  .finally(() => cerrarPool());
