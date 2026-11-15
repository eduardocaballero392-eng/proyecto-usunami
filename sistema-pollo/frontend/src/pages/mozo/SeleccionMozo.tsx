import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ArrowLeft, ChevronLeft, Lock, User } from 'lucide-react';
import api, { mensajeError } from '../../api/cliente';
import { MozoLista } from '../../api/tipos';
import { useAuth } from '../../context/AuthContext';
import { Aviso, Spinner, useDatos } from '../../components/ui';

/** RF-002: selección de mozo con PIN card estilo Anticuchería La Parrillita */
const SeleccionMozo = () => {
  const { loginMozo } = useAuth();
  const navegar = useNavigate();
  const { datos: mozos, error, cargando, recargar } = useDatos(() =>
    api.get<MozoLista[]>('/auth/mozos').then((r) => r.data)
  );
  const [elegido, setElegido] = useState<MozoLista | null>(null);
  const [pin, setPin] = useState('');
  const [errorPin, setErrorPin] = useState('');
  const [enviando, setEnviando] = useState(false);

  const entrar = async (m: MozoLista, p?: string) => {
    setEnviando(true);
    setErrorPin('');
    try {
      await loginMozo(m.id_usuarios, p);
      navegar('/mozo/menu', { replace: true });
    } catch (e) {
      setErrorPin(mensajeError(e));
      setPin('');
    } finally {
      setEnviando(false);
    }
  };

  const tocar = (m: MozoLista) => {
    if (m.tienePin) {
      setElegido(m);
      setPin('');
      setErrorPin('');
    } else {
      entrar(m);
    }
  };

  const digito = (d: string) => {
    if (pin.length >= 4 || !elegido) return;
    const nuevo = pin + d;
    setPin(nuevo);
    if (nuevo.length === 4) entrar(elegido, nuevo);
  };

  const borrar = () => setPin((p) => p.slice(0, -1));

  const volver = () => {
    setElegido(null);
    setPin('');
    setErrorPin('');
  };

  return (
    <main className="relative flex min-h-screen items-center justify-center overflow-hidden p-4">
      {/* ── Fondo oscuro con resplandor fuego ── */}
      <div className="absolute inset-0 bg-[#0d0a06]" />
      <div className="absolute inset-0 bg-gradient-to-t from-[#1a0800] via-[#2d0e00]/80 to-transparent" />
      <div
        className="absolute inset-0 opacity-25"
        style={{
          background:
            'radial-gradient(ellipse 70% 50% at 50% 90%, #ff6a00 0%, #ee4a00 35%, transparent 70%)',
        }}
      />

      {/* Rejilla de parrilla decorativa en la parte inferior */}
      <ParrillaDecor />

      <div className="relative z-10 w-full max-w-md">
        {/* ── Cabecera branding ── */}
        <div className="mb-6 flex flex-col items-center gap-1 text-center">
          <LlamaIcon className="h-16 w-16 drop-shadow-[0_0_16px_rgba(255,100,0,0.8)]" />
          <h1 className="text-2xl font-black tracking-wide text-white drop-shadow-[0_2px_8px_rgba(0,0,0,0.9)]">
            La Parrillita
          </h1>
          <p className="text-xs font-semibold tracking-widest text-orange-300 uppercase">
            Anticuchería
          </p>
        </div>

        {/* ── Estado: cargando / error / lista de mozos / PIN ── */}
        {cargando ? (
          <div className="text-orange-200">
            <Spinner texto="Cargando…" />
          </div>
        ) : error ? (
          <div className="mx-auto max-w-xs space-y-3">
            <Aviso>{error}</Aviso>
            <button
              onClick={() => recargar()}
              className="w-full rounded-xl border border-white/10 bg-white/[0.07] py-3 text-sm font-semibold text-white backdrop-blur"
            >
              Reintentar
            </button>
          </div>
        ) : !mozos?.length ? (
          <div className="mx-auto max-w-sm rounded-2xl border border-white/10 bg-white/[0.07] p-6 text-center text-white backdrop-blur">
            <p className="font-semibold">No hay mozos activos</p>
            <p className="mt-1 text-sm text-white/60">
              El administrador debe registrarlos en Personal.
            </p>
          </div>
        ) : elegido ? (
          /* ══ Tarjeta PIN ══ */
          <PinCard
            nombre={elegido.nombre}
            pin={pin}
            error={errorPin}
            enviando={enviando}
            onDigito={digito}
            onBorrar={borrar}
            onVolver={volver}
          />
        ) : (
          /* ══ Grid de mozos ══ */
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            {mozos.map((m) => (
              <button
                key={m.id_usuarios}
                onClick={() => tocar(m)}
                disabled={enviando}
                className="group flex flex-col items-center gap-3 rounded-2xl border border-white/10 bg-white/[0.07] p-5 backdrop-blur-sm transition hover:border-orange-500/40 hover:bg-white/[0.13] active:scale-[0.97] disabled:opacity-60"
              >
                <span className="flex h-14 w-14 items-center justify-center rounded-full bg-gradient-to-br from-orange-500/30 to-red-800/30 ring-2 ring-orange-500/20 transition group-hover:ring-orange-400/50">
                  <User className="h-7 w-7 text-orange-300" />
                </span>
                <span className="text-center text-sm font-semibold leading-tight text-white">
                  {m.nombre}
                </span>
                {m.tienePin && (
                  <span className="inline-flex items-center gap-1 text-xs text-orange-300/70">
                    <Lock className="h-3 w-3" /> PIN
                  </span>
                )}
              </button>
            ))}
          </div>
        )}

        <p className="mt-8 text-center">
          <Link
            to="/login"
            className="inline-flex items-center gap-1 text-xs font-medium text-orange-200/60 underline underline-offset-4 hover:text-orange-200/90"
          >
            <ChevronLeft className="h-3 w-3" /> Administración / Caja / Cocina
          </Link>
        </p>
      </div>
    </main>
  );
};

/* ─── PIN Card ──────────────────────────────────────────────────────── */

interface PinCardProps {
  nombre: string;
  pin: string;
  error: string;
  enviando: boolean;
  onDigito: (d: string) => void;
  onBorrar: () => void;
  onVolver: () => void;
}

function PinCard({ nombre, pin, error, enviando, onDigito, onBorrar, onVolver }: PinCardProps) {
  const primerNombre = nombre.split(' ')[0];

  return (
    <div className="mx-auto w-full max-w-xs">
      <div className="rounded-3xl border border-white/10 bg-white/[0.08] px-6 pb-7 pt-6 shadow-2xl shadow-black/60 backdrop-blur-2xl">
        {/* Logo / nombre del local dentro de la card */}
        <div className="mb-4 flex flex-col items-center gap-0.5">
          <LlamaIcon className="h-9 w-9" />
          <span className="text-sm font-black tracking-wide text-white">La Parrillita</span>
          <span className="text-[10px] font-medium tracking-widest text-orange-300 uppercase">
            Anticuchería
          </span>
        </div>

        {/* Saludo */}
        <p className="mb-1 text-center text-base font-bold text-white">
          Hola, {primerNombre} 👋
        </p>
        <p className="mb-5 text-center text-xs text-white/50">
          Ingresá tu PIN de 4 dígitos
        </p>

        {/* Indicadores del PIN */}
        <div
          className="mb-5 flex justify-center gap-4"
          aria-label={`${pin.length} de 4 dígitos`}
        >
          {[0, 1, 2, 3].map((i) => (
            <span
              key={i}
              className={`h-3.5 w-3.5 rounded-full border-2 transition-all duration-150 ${
                i < pin.length
                  ? 'scale-110 border-orange-400 bg-orange-400 shadow-[0_0_8px_rgba(251,146,60,0.7)]'
                  : 'border-white/30'
              }`}
            />
          ))}
        </div>

        {/* Error */}
        {error && (
          <div className="mb-4 rounded-xl border border-red-500/30 bg-red-500/10 px-3 py-2 text-center text-xs font-medium text-red-300">
            {error}
          </div>
        )}

        {/* Teclado numérico */}
        <div className="grid grid-cols-3 gap-2.5">
          {['1', '2', '3', '4', '5', '6', '7', '8', '9'].map((d) => (
            <TeclaNum key={d} label={d} onClick={() => onDigito(d)} disabled={enviando} />
          ))}
          {/* fila inferior */}
          <span /> {/* vacío */}
          <TeclaNum label="0" onClick={() => onDigito('0')} disabled={enviando} />
          {/* Borrar */}
          <button
            onClick={onBorrar}
            disabled={enviando}
            aria-label="Borrar"
            className="flex h-14 items-center justify-center rounded-2xl text-white/60 transition hover:bg-white/10 active:scale-95 disabled:opacity-40"
          >
            <BackspaceIcon />
          </button>
        </div>

        {/* Volver */}
        <button
          onClick={onVolver}
          className="mt-5 flex w-full items-center justify-center gap-1.5 text-xs font-medium text-orange-300/70 transition hover:text-orange-200"
        >
          <ArrowLeft className="h-3 w-3" /> Cambiar mozo
        </button>

        {/* Tagline */}
        <p className="mt-4 text-center text-[10px] text-white/20">
          Gestión interna del restaurante
        </p>
      </div>
    </div>
  );
}

function TeclaNum({
  label,
  onClick,
  disabled,
}: {
  label: string;
  onClick: () => void;
  disabled: boolean;
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className="h-14 rounded-2xl border border-white/10 bg-white/[0.07] text-xl font-semibold text-white transition hover:border-orange-500/30 hover:bg-white/[0.15] active:scale-[0.93] disabled:opacity-40"
    >
      {label}
    </button>
  );
}

/* ─── Decoración parrilla ──────────────────────────────────────────── */

function ParrillaDecor() {
  return (
    <svg
      className="pointer-events-none absolute bottom-0 left-0 w-full opacity-[0.07]"
      viewBox="0 0 400 80"
      preserveAspectRatio="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      {/* Barras horizontales de parrilla */}
      {[10, 25, 40, 55, 70].map((y) => (
        <rect key={y} x="0" y={y} width="400" height="4" rx="2" fill="#ff6a00" />
      ))}
      {/* Barras verticales */}
      {Array.from({ length: 20 }, (_, i) => (
        <rect key={i} x={i * 22} y="0" width="4" height="80" rx="2" fill="#ff6a00" />
      ))}
    </svg>
  );
}

/* ─── Iconos SVG ───────────────────────────────────────────────────── */

function LlamaIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 64 80" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
      <path
        d="M32 4 C22 14 10 20 14 36 C16 44 10 48 12 58 C18 72 46 72 52 58 C54 48 48 44 50 36 C54 20 42 14 32 4Z"
        fill="url(#ll1)"
      />
      <path
        d="M32 16 C26 24 18 28 20 40 C22 48 18 52 20 60 C24 70 40 70 44 60 C46 52 42 48 44 40 C46 28 38 24 32 16Z"
        fill="url(#ll2)"
      />
      <path
        d="M32 30 C29 36 25 38 26 46 C27 52 30 56 32 58 C34 56 37 52 38 46 C39 38 35 36 32 30Z"
        fill="url(#ll3)"
      />
      <defs>
        <radialGradient id="ll1" cx="50%" cy="80%" r="60%">
          <stop offset="0%" stopColor="#ff4500" />
          <stop offset="100%" stopColor="#c0190a" />
        </radialGradient>
        <radialGradient id="ll2" cx="50%" cy="80%" r="60%">
          <stop offset="0%" stopColor="#ff8c00" />
          <stop offset="100%" stopColor="#ff4500" />
        </radialGradient>
        <radialGradient id="ll3" cx="50%" cy="90%" r="60%">
          <stop offset="0%" stopColor="#ffe066" />
          <stop offset="100%" stopColor="#ffb300" />
        </radialGradient>
      </defs>
    </svg>
  );
}

function BackspaceIcon() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.8}
      strokeLinecap="round"
      strokeLinejoin="round"
      className="h-5 w-5"
    >
      <path d="M21 4H8l-7 8 7 8h13a2 2 0 0 0 2-2V6a2 2 0 0 0-2-2z" />
      <line x1="18" y1="9" x2="13" y2="14" />
      <line x1="13" y1="9" x2="18" y2="14" />
    </svg>
  );
}

export default SeleccionMozo;
