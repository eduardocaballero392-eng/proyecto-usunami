import { useEffect, useState } from 'react';

const THEME_KEY = 'parrillita-tema';

export const useTema = () => {
  const [oscuro, setOscuro] = useState(() => {
    // Inicializar desde localStorage o usar la preferencia del sistema
    const guardado = window.localStorage.getItem(THEME_KEY);
    if (guardado === 'oscuro') return true;
    if (guardado === 'claro') return false;
    // Si no hay preferencia guardada, usar la del sistema
    return window.matchMedia('(prefers-color-scheme: dark)').matches;
  });

  useEffect(() => {
    document.documentElement.classList.toggle('dark', oscuro);
    document.documentElement.setAttribute('data-theme', oscuro ? 'dark' : 'light');
    window.localStorage.setItem(THEME_KEY, oscuro ? 'oscuro' : 'claro');
  }, [oscuro]);

  const alternarTema = () => setOscuro((prev) => !prev);

  return { oscuro, setOscuro, alternarTema };
};
