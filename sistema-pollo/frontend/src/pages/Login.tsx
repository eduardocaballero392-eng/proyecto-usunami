import { FormEvent, useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  ArrowUpRight,
  User,
  Lock,
  ShieldCheck,
  Wallet,
  Utensils,
  Flame,
  ChefHat,
  Drumstick,
  Moon,
  Sun,
  type LucideIcon,
} from 'lucide-react';
import { inicioPorRol, useAuth } from '../context/AuthContext';
import { mensajeError } from '../api/cliente';
import { Rol, MozoLista } from '../api/tipos';
import api from '../api/cliente';

/*
 * Pantalla de ingreso unificada con modo claro/oscuro
 * ────────────────────────────────────────────────────
 * Paso 0 → Grid de cargos
 * Paso 1 → Form usuario/contraseña   (ADMIN, CAJERO)
 * Paso 2 → Lista de personas         (MOZO, PARRILLA, COCINERO, BROASTER)
 * Paso 3 → Teclado PIN               (si la persona elegida tiene PIN)
 */

const THEME_KEY = 'parrillita-tema';

type Cargo = { rol: Rol; label: string; hint: string; icono: LucideIcon; usaPin: boolean };

const CARGOS: Cargo[] = [
  { rol: 'ADMIN',    label: 'Administrador', hint: 'Gestión del local',     icono: ShieldCheck, usaPin: false },
  { rol: 'CAJERO',   label: 'Caja',          hint: 'Ventas y cobros',       icono: Wallet,      usaPin: false },
  { rol: 'MOZO',     label: 'Mozo',          hint: 'Atención de mesas',     icono: Utensils,    usaPin: true  },
  { rol: 'PARRILLA', label: 'Parrilla',      hint: 'El fuego te espera',    icono: Flame,       usaPin: true  },
  { rol: 'BROASTER', label: 'Broaster',      hint: 'Cocina caliente',       icono: Drumstick,   usaPin: true  },
  { rol: 'COCINERO', label: 'Cocinero',      hint: 'Preparación',           icono: ChefHat,     usaPin: true  },
];

type Paso = 'cargos' | 'form' | 'lista' | 'pin';

const Login = () => {
  const { loginPersonal, loginPorPin } = useAuth();
  const navegar = useNavigate();

  const [paso, setPaso]   = useState<Paso>('cargos');
  const [cargo, setCargo] = useState<Cargo | null>(null);
  const [selected, setSelected] = useState<string | null>(null);
  const [oscuro, setOscuro] = useState(true); // Por defecto en modo oscuro

  /* form usuario/pass */
  const [usuario, setUsuario]   = useState('');
  const [password, setPassword] = useState('');

  /* lista de personas */
  const [personas, setPersonas]       = useState<MozoLista[]>([]);
  const [cargandoLista, setCargandoLista] = useState(false);
  const [elegida, setElegida]         = useState<MozoLista | null>(null);

  /* teclado PIN */
  const [pin, setPin] = useState('');

  const [error, setError]       = useState('');
  const [enviando, setEnviando] = useState(false);

  /* ── Cargar tema desde localStorage ── */
  useEffect(() => {
    setOscuro(window.localStorage.getItem(THEME_KEY) === 'oscuro');
  }, []);

  /* ── Aplicar clase dark al html ── */
  useEffect(() => {
    document.documentElement.classList.toggle('dark', oscuro);
    window.localStorage.setItem(THEME_KEY, oscuro ? 'oscuro' : 'claro');
  }, [oscuro]);

  /* ── Selección de cargo ── */
  const elegirCargo = async (c: Cargo) => {
    setCargo(c);
    setSelected(c.rol);
    setError('');
    setUsuario('');
    setPassword('');
    setPin('');
    setElegida(null);

    if (!c.usaPin) {
      setPaso('form');
    } else {
      setPaso('lista');
      setCargandoLista(true);
      try {
        const { data } = await api.get<MozoLista[]>(`/auth/personal/${c.rol}`);
        setPersonas(data);
      } catch {
        setError('No se pudo cargar el personal. Verificá la conexión.');
      } finally {
        setCargandoLista(false);
      }
    }
  };

  /* ── Selección de persona ── */
  const elegirPersona = async (p: MozoLista) => {
    setElegida(p);
    setPin('');
    setError('');
    // TODOS los roles operativos REQUIEREN PIN obligatorio
    setPaso('pin');
  };

  /* ── Login usuario/pass ── */
  const enviarForm = async (e: FormEvent) => {
    e.preventDefault();
    setEnviando(true);
    setError('');
    try {
      const u = await loginPersonal(usuario.trim(), password);
      navegar(inicioPorRol(u.rol), { replace: true });
    } catch (err) {
      setError(mensajeError(err));
    } finally {
      setEnviando(false);
    }
  };

  /* ── Dígito PIN ── */
  const presionarDigito = async (d: string) => {
    if (pin.length >= 4 || !elegida) return;
    const nuevo = pin + d;
    setPin(nuevo);
    if (nuevo.length === 4) {
      setEnviando(true);
      setError('');
      try {
        const u = await loginPorPin(elegida.id_usuarios, nuevo);
        navegar(inicioPorRol(u.rol), { replace: true });
      } catch (e) {
        setError(mensajeError(e));
        setPin('');
      } finally {
        setEnviando(false);
      }
    }
  };

  const borrarDigito = () => setPin((p) => p.slice(0, -1));

  const volverACargos = () => {
    setPaso('cargos');
    setSelected(null);
    setError('');
    setPin('');
    setElegida(null);
    setPersonas([]);
  };

  const volverALista = () => {
    setPaso('lista');
    setPin('');
    setError('');
    setElegida(null);
  };

  const current = CARGOS.find((c) => c.rol === selected);

  return (
    <main className="relative min-h-screen overflow-hidden bg-gradient-to-br from-orange-50/50 via-white to-amber-50/30 transition-colors duration-500 dark:from-[#302520] dark:via-[#35271f] dark:to-[#2d221c]">
      <FondoParrilla oscuro={oscuro} />

      <div className="relative z-10 flex min-h-screen flex-col">
        <Header oscuro={oscuro} setOscuro={setOscuro} />

        <div className="mx-auto flex w-full max-w-7xl flex-1 items-center px-4 py-8 sm:px-6 sm:py-12 lg:px-12">
          <div className="w-full max-w-3xl">
            {paso === 'cargos' && <GridCargos onElegir={elegirCargo} selected={selected} current={current} />}

            {paso === 'form' && cargo && (
              <FormUsuario
                cargo={cargo}
                usuario={usuario} setUsuario={setUsuario}
                password={password} setPassword={setPassword}
                error={error} enviando={enviando}
                onEnviar={enviarForm}
                onVolver={volverACargos}
              />
            )}

            {paso === 'lista' && cargo && (
              <ListaPersonas
                cargo={cargo}
                personas={personas}
                cargando={cargandoLista}
                error={error}
                enviando={enviando}
                onElegir={elegirPersona}
                onVolver={volverACargos}
              />
            )}

            {paso === 'pin' && elegida && cargo && (
              <TecladoPin
                cargo={cargo}
                nombre={elegida.nombre}
                pin={pin} error={error} enviando={enviando}
                onDigito={presionarDigito}
                onBorrar={borrarDigito}
                onVolver={volverALista}
              />
            )}
          </div>
        </div>
      </div>
    </main>
  );
};

/* ══════════════════════════════════════════════════════════════════
   HEADER CON TOGGLE DE TEMA
══════════════════════════════════════════════════════════════════ */
interface HeaderProps {
  oscuro: boolean;
  setOscuro: (v: boolean) => void;
}

function Header({ oscuro, setOscuro }: HeaderProps) {
  return (
    <header className="border-b border-gray-200/70 bg-white/70 backdrop-blur-sm transition-colors dark:border-gray-700/50 dark:bg-[#302520]/70">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-4 sm:px-6 sm:py-5 lg:px-12">
        <div className="flex items-center gap-3">
          <span className="flex h-10 w-10 items-center justify-center rounded-full bg-orange-100 text-orange-600 transition-colors dark:bg-orange-900/40 dark:text-orange-400">
            <Flame className="h-5 w-5" strokeWidth={2.25} />
          </span>
          <span className="text-xl font-black uppercase tracking-wide text-gray-900 transition-colors dark:text-gray-100">
            LA PARRILLITA
          </span>
        </div>
        <div className="flex items-center gap-3">
          <span className="hidden text-[11px] font-semibold uppercase tracking-[0.2em] text-gray-500 transition-colors sm:block dark:text-gray-400">
            Anticuchería · Desde el fuego
          </span>
          <button
            type="button"
            onClick={() => setOscuro(!oscuro)}
            aria-pressed={oscuro}
            aria-label={oscuro ? 'Cambiar a tono claro' : 'Cambiar a tono oscuro'}
            className="inline-flex items-center gap-2 rounded-full border border-gray-200 bg-white/80 px-3 py-2 text-[11px] font-bold uppercase tracking-[0.12em] text-gray-600 transition-all hover:border-orange-500/50 hover:text-gray-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-500 dark:border-gray-700 dark:bg-[#3d2f27]/80 dark:text-gray-400 dark:hover:border-orange-500/50 dark:hover:text-gray-200"
          >
            {oscuro ? (
              <Sun className="h-4 w-4 text-orange-600 dark:text-orange-400" />
            ) : (
              <Moon className="h-4 w-4 text-orange-600" />
            )}
            <span className="hidden sm:inline">{oscuro ? 'Tono claro' : 'Tono oscuro'}</span>
          </button>
        </div>
      </div>
    </header>
  );
}

/* ══════════════════════════════════════════════════════════════════
   PASO 0 — Grid de cargos con animaciones
══════════════════════════════════════════════════════════════════ */
interface GridProps {
  onElegir: (c: Cargo) => void;
  selected: string | null;
  current: Cargo | undefined;
}

function GridCargos({ onElegir, selected, current }: GridProps) {
  return (
    <div className="w-full">
      <p className="flex animate-fadeIn items-center gap-2 text-xs font-bold uppercase tracking-[0.2em] text-orange-600 dark:text-orange-400">
        <span className="h-2 w-2 rounded-full bg-orange-600 dark:bg-orange-400" />
        Sistema de gestión
      </p>
      <h1 className="animate-fadeInUp mt-4 text-4xl font-black uppercase leading-none text-gray-900 transition-colors sm:text-6xl lg:text-7xl dark:text-white"
          style={{ 
            animationDelay: '80ms',
            fontFamily: 'Impact, "Anton", "Bebas Neue", "Arial Black", sans-serif',
            letterSpacing: '-0.02em'
          }}>
        El fuego nos <span className="text-orange-600 dark:text-orange-400">une.</span>
      </h1>
      <p className="animate-fadeInUp mt-4 text-base text-gray-600 transition-colors dark:text-gray-300"
         style={{ animationDelay: '140ms' }}>
        Selecciona tu área para continuar
      </p>

      <div className="mt-8 grid grid-cols-2 gap-3 sm:mt-10 sm:gap-4 md:grid-cols-3">
        {CARGOS.map((area, i) => {
          const Icon = area.icono;
          const active = area.rol === selected;
          return (
            <button
              key={area.rol}
              type="button"
              onClick={() => onElegir(area)}
              style={{ animationDelay: `${200 + i * 60}ms` }}
              className={`animate-fadeInUp group relative flex flex-col items-start rounded-xl border p-4 text-left shadow-sm backdrop-blur-sm transition-all duration-300 hover:-translate-y-1 hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-500 sm:p-5 ${
                active
                  ? 'border-orange-500 bg-white/95 shadow-md dark:border-orange-500 dark:bg-[#3d2f27]/90'
                  : 'border-gray-200 bg-white/90 hover:border-orange-500/50 dark:border-gray-700 dark:bg-[#3d2f27]/80 dark:hover:border-orange-500/50'
              }`}
            >
              <ArrowUpRight
                className={`absolute right-3 top-3 h-4 w-4 text-orange-600 transition-opacity sm:right-4 sm:top-4 dark:text-orange-400 ${
                  active ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'
                }`}
              />
              <span
                className={`flex h-10 w-10 items-center justify-center rounded-lg transition-colors sm:h-11 sm:w-11 ${
                  active
                    ? 'bg-orange-600 text-white dark:bg-orange-500'
                    : 'bg-orange-50 text-orange-600 group-hover:bg-orange-600 group-hover:text-white dark:bg-orange-900/40 dark:text-orange-400 dark:group-hover:bg-orange-500'
                }`}
              >
                <Icon className="h-5 w-5" />
              </span>
              <span className="mt-5 text-lg font-black tracking-wide text-gray-900 transition-colors sm:mt-6 sm:text-2xl dark:text-white">
                {area.label}
              </span>
              <span className="mt-1 text-sm text-gray-600 transition-colors dark:text-gray-300">{area.hint}</span>
            </button>
          );
        })}
      </div>

      <p className="mt-6 flex flex-wrap items-center gap-2 text-sm text-gray-800 transition-colors sm:mt-8 dark:text-gray-400">
        <Lock className="h-4 w-4 text-orange-600 dark:text-orange-400" />
        {current ? (
          <>
            <span>
              Área seleccionada:{' '}
              <strong className="font-semibold text-gray-900 dark:text-gray-100">{current.label}</strong>
            </span>
            <span>El acceso se habilitará con tus credenciales.</span>
          </>
        ) : (
          <span>Elige un área para ingresar con tus credenciales.</span>
        )}
      </p>
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════════
   PASO 1 — Formulario usuario / contraseña
══════════════════════════════════════════════════════════════════ */
interface FormProps {
  cargo: Cargo;
  usuario: string; setUsuario: (v: string) => void;
  password: string; setPassword: (v: string) => void;
  error: string; enviando: boolean;
  onEnviar: (e: FormEvent) => void;
  onVolver: () => void;
}
function FormUsuario({ cargo, usuario, setUsuario, password, setPassword, error, enviando, onEnviar, onVolver }: FormProps) {
  return (
    <Card>
      <CardHeader icono={cargo.icono} titulo={cargo.label} subtitulo="Ingresá tus credenciales" />
      {error && <ErrorBox>{error}</ErrorBox>}
      <form onSubmit={onEnviar} className="space-y-3">
        <Campo label="Usuario">
          <input
            autoComplete="username" autoCapitalize="none"
            autoCorrect="off" spellCheck={false}
            autoFocus
            value={usuario} onChange={(e) => setUsuario(e.target.value)}
            required placeholder="tu usuario"
            className="input-modern"
          />
        </Campo>
        <Campo label="Contraseña">
          <input
            type="password" autoComplete="current-password"
            value={password} onChange={(e) => setPassword(e.target.value)}
            required placeholder="••••••••"
            className="input-modern"
          />
        </Campo>
        <BtnPrimario disabled={enviando}>
          {enviando ? 'Ingresando…' : 'Ingresar'}
        </BtnPrimario>
      </form>
      <BtnVolver onClick={onVolver}>Cambiar área</BtnVolver>
    </Card>
  );
}

/* ══════════════════════════════════════════════════════════════════
   PASO 2 — Lista de personas del cargo
══════════════════════════════════════════════════════════════════ */
interface ListaProps {
  cargo: Cargo;
  personas: MozoLista[];
  cargando: boolean;
  error: string;
  enviando: boolean;
  onElegir: (p: MozoLista) => void;
  onVolver: () => void;
}
function ListaPersonas({ cargo, personas, cargando, error, enviando, onElegir, onVolver }: ListaProps) {
  return (
    <Card>
      <CardHeader icono={cargo.icono} titulo={cargo.label} subtitulo="Elegí tu nombre" />
      {error && <ErrorBox>{error}</ErrorBox>}

      {cargando ? (
        <div className="grid grid-cols-2 gap-3 py-1">
          {[0, 1, 2, 3].map((i) => (
            <div
              key={i}
              className="h-[120px] animate-pulse rounded-2xl border border-gray-200 bg-gray-100 dark:border-gray-700 dark:bg-gray-800"
            />
          ))}
        </div>
      ) : personas.length === 0 && !error ? (
        <p className="py-4 text-center text-sm text-gray-500 dark:text-gray-400">No hay personal activo.</p>
      ) : (
        <div className="mt-1 grid grid-cols-2 gap-3">
          {personas.map((p) => (
            <button
              key={p.id_usuarios}
              onClick={() => onElegir(p)}
              disabled={enviando}
              className="group flex flex-col items-center gap-3 rounded-2xl border border-gray-200 bg-white p-5 shadow-sm transition hover:border-orange-300 hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-500 active:scale-[0.96] disabled:opacity-50 dark:border-gray-700 dark:bg-[#3d2f27] dark:hover:border-orange-500/50"
            >
              <span className="flex h-14 w-14 items-center justify-center rounded-full bg-orange-50 dark:bg-orange-900/40">
                <User className="h-7 w-7 text-orange-600 dark:text-orange-400" />
              </span>
              <span className="text-center text-sm font-bold leading-tight text-gray-900 dark:text-gray-100">{p.nombre}</span>
              {p.tienePin && (
                <span className="inline-flex items-center gap-1 text-xs text-orange-600 dark:text-orange-400">
                  <Lock className="h-3 w-3" /> PIN
                </span>
              )}
            </button>
          ))}
        </div>
      )}

      <BtnVolver onClick={onVolver}>Cambiar área</BtnVolver>
    </Card>
  );
}

/* ══════════════════════════════════════════════════════════════════
   PASO 3 — Teclado PIN
══════════════════════════════════════════════════════════════════ */
interface PinProps {
  cargo: Cargo;
  nombre: string;
  pin: string; error: string; enviando: boolean;
  onDigito: (d: string) => void;
  onBorrar: () => void;
  onVolver: () => void;
}
function TecladoPin({ cargo, nombre, pin, error, enviando, onDigito, onBorrar, onVolver }: PinProps) {
  const primerNombre = nombre.split(' ')[0];
  return (
    <Card>
      <CardHeader icono={cargo.icono} titulo={`Hola, ${primerNombre}`} subtitulo="Ingresá tu PIN de 4 dígitos" />

      {/* Dots indicadores */}
      <div className="mb-6 flex justify-center gap-5" aria-label={`${pin.length} de 4 dígitos`}>
        {[0, 1, 2, 3].map((i) => (
          <span
            key={i}
            className={
              'h-4 w-4 rounded-full border-2 transition-all duration-200 ' +
              (i < pin.length
                ? 'scale-110 border-orange-600 bg-orange-600 shadow-lg shadow-orange-200 dark:border-orange-500 dark:bg-orange-500 dark:shadow-orange-900/50'
                : 'border-gray-300 bg-transparent dark:border-gray-600')
            }
          />
        ))}
      </div>

      {error && <ErrorBox>{error}</ErrorBox>}

      {/* Teclado numérico */}
      <div className="grid grid-cols-3 gap-3">
        {['1', '2', '3', '4', '5', '6', '7', '8', '9'].map((d) => (
          <TeclaNum key={d} label={d} onClick={() => onDigito(d)} disabled={enviando} />
        ))}
        <span aria-hidden="true" />
        <TeclaNum label="0" onClick={() => onDigito('0')} disabled={enviando} />
        <button
          onClick={onBorrar}
          disabled={enviando}
          aria-label="Borrar dígito"
          className="flex h-16 items-center justify-center rounded-2xl border border-gray-200 text-gray-600 transition hover:bg-gray-50 hover:text-gray-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-500 active:scale-95 disabled:opacity-30 dark:border-gray-700 dark:text-gray-400 dark:hover:bg-gray-800 dark:hover:text-gray-200"
        >
          <IconoBorrar />
        </button>
      </div>

      <BtnVolver onClick={onVolver}>Elegir otra persona</BtnVolver>
      <p className="mt-3 text-center text-xs text-gray-500 dark:text-gray-500">Gestión interna del restaurante</p>
    </Card>
  );
}

/* ══════════════════════════════════════════════════════════════════
   COMPONENTES PEQUEÑOS REUTILIZABLES
══════════════════════════════════════════════════════════════════ */
function Card({ children }: { children: React.ReactNode }) {
  return (
    <div className="w-full max-w-lg">
      <div className="rounded-3xl border border-gray-200 bg-white px-8 pb-9 pt-8 shadow-lg transition-colors dark:border-gray-700 dark:bg-[#3d2f27]">
        {children}
      </div>
    </div>
  );
}

function CardHeader({ icono: Icono, titulo, subtitulo }: { icono: LucideIcon; titulo: string; subtitulo: string }) {
  return (
    <div className="mb-5 flex flex-col items-center text-center">
      <span className="flex h-14 w-14 items-center justify-center rounded-xl bg-orange-50 transition-colors dark:bg-orange-900/40">
        <Icono className="h-7 w-7 text-orange-600 dark:text-orange-400" />
      </span>
      <h2 className="mt-3 text-lg font-black tracking-wide text-gray-900 transition-colors dark:text-gray-100">{titulo}</h2>
      <p className="mt-0.5 text-sm text-gray-600 transition-colors dark:text-gray-400">{subtitulo}</p>
    </div>
  );
}

function ErrorBox({ children }: { children: React.ReactNode }) {
  return (
    <div
      role="alert"
      className="mb-4 rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-center text-sm font-medium text-red-700 transition-colors dark:border-red-900/50 dark:bg-red-900/20 dark:text-red-400"
    >
      {children}
    </div>
  );
}

function Campo({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="mb-1 block text-sm font-medium text-gray-700 transition-colors dark:text-gray-300">{label}</label>
      {children}
    </div>
  );
}

function BtnPrimario({ children, disabled }: { children: React.ReactNode; disabled: boolean }) {
  return (
    <button
      type="submit"
      disabled={disabled}
      className="mt-2 w-full rounded-xl bg-orange-600 py-3.5 text-sm font-bold text-white shadow-sm transition hover:bg-orange-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-500 active:scale-[0.98] disabled:opacity-50 dark:bg-orange-500 dark:hover:bg-orange-600"
    >
      {children}
    </button>
  );
}

function BtnVolver({ onClick, children }: { onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      onClick={onClick}
      className="mt-6 flex w-full items-center justify-center gap-1.5 rounded-xl border border-gray-200 bg-white py-2.5 text-sm font-semibold text-gray-700 transition hover:border-gray-300 hover:bg-gray-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-500 active:scale-[0.98] dark:border-gray-700 dark:bg-[#3d2f27] dark:text-gray-300 dark:hover:border-gray-600 dark:hover:bg-gray-800"
    >
      <ArrowLeft className="h-4 w-4" />
      <span>{children}</span>
    </button>
  );
}

function TeclaNum({ label, onClick, disabled }: { label: string; onClick: () => void; disabled: boolean }) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className="h-16 rounded-2xl border border-gray-200 bg-white text-2xl font-semibold text-gray-900 shadow-sm transition hover:border-orange-300 hover:bg-orange-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-500 active:scale-[0.93] disabled:opacity-30 dark:border-gray-700 dark:bg-[#3d2f27] dark:text-gray-100 dark:hover:border-orange-500/50 dark:hover:bg-gray-800"
    >
      {label}
    </button>
  );
}

/* ══════════════════════════════════════════════════════════════════
   FONDO — imagen/video con degradado y modo oscuro
══════════════════════════════════════════════════════════════════ */
interface FondoProps {
  oscuro: boolean;
}

function FondoParrilla({ oscuro }: FondoProps) {
  return (
    <>
      {oscuro ? (
        <video
          key="hero-video"
          src="/parrilla.mp4"
          poster="/parrilla-oscura.jpg"
          autoPlay
          muted
          loop
          playsInline
          aria-label="Anticuchos y carne a la parrilla"
          className="absolute inset-y-0 right-0 h-full w-full object-cover object-right transition-opacity duration-500 lg:w-[68%]"
        />
      ) : (
        <img
          src="/parrilla-clara.jpg"
          alt="Anticuchos y carne a la parrilla"
          className="absolute inset-y-0 right-0 h-full w-full object-cover object-right transition-opacity duration-500 lg:w-[68%]"
        />
      )}
      <div 
        className="absolute inset-0 transition-all duration-500"
        style={{
          background: oscuro 
            ? 'linear-gradient(90deg, rgb(48 37 32) 0%, rgb(48 37 32) 38%, rgba(48,37,32,0.75) 55%, rgba(48,37,32,0.1) 80%, transparent 100%)'
            : 'linear-gradient(90deg, rgb(255 247 237) 0%, rgb(255 247 237) 38%, rgba(255,247,237,0.75) 55%, rgba(255,247,237,0.1) 80%, transparent 100%)'
        }}
        aria-hidden 
      />

      <style>{`
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        @keyframes fadeInUp {
          from {
            opacity: 0;
            transform: translateY(12px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        .animate-fadeIn {
          animation: fadeIn 0.6s ease-out both;
        }
        .animate-fadeInUp {
          animation: fadeInUp 0.6s cubic-bezier(0.2, 0.7, 0.2, 1) both;
        }
        .input-modern {
          width:100%; border-radius:12px;
          border:1px solid rgb(229 231 235);
          background:white;
          padding:12px 16px; font-size:14px; color:#1f2937;
          outline:none; transition: all .15s;
        }
        .dark .input-modern {
          border-color: rgb(55 65 81);
          background: rgb(61 47 39);
          color: rgb(243 244 246);
        }
        .input-modern::placeholder { color:rgba(0,0,0,.4); }
        .dark .input-modern::placeholder { color:rgba(255,255,255,.4); }
        .input-modern:focus-visible {
          border-color:#ea580c;
          box-shadow:0 0 0 3px rgba(234,88,12,.1);
        }
        .dark .input-modern:focus-visible {
          border-color:#f97316;
          box-shadow:0 0 0 3px rgba(249,115,22,.2);
        }
      `}</style>
    </>
  );
}

/* ══════════════════════════════════════════════════════════════════
   ICONO BORRAR
══════════════════════════════════════════════════════════════════ */
function IconoBorrar() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5">
      <path d="M21 4H8l-7 8 7 8h13a2 2 0 0 0 2-2V6a2 2 0 0 0-2-2z" />
      <line x1="18" y1="9" x2="13" y2="14" />
      <line x1="13" y1="9" x2="18" y2="14" />
    </svg>
  );
}

export default Login;
