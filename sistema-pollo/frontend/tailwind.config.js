/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  darkMode: 'media',
  theme: {
    extend: {
      colors: {
        // Tokens semánticos definidos en index.css (cambian solos en modo oscuro)
        superficie: 'rgb(var(--superficie) / <alpha-value>)',
        fondo: 'rgb(var(--fondo) / <alpha-value>)',
        borde: 'rgb(var(--borde) / <alpha-value>)',
        tinta: 'rgb(var(--tinta) / <alpha-value>)',
        'tinta-2': 'rgb(var(--tinta-2) / <alpha-value>)',
        'tinta-3': 'rgb(var(--tinta-3) / <alpha-value>)',
        serie: 'rgb(var(--serie) / <alpha-value>)',
        'serie-suave': 'rgb(var(--serie-suave) / <alpha-value>)',
        neutro: 'rgb(var(--neutro) / <alpha-value>)',
      },
      fontVariantNumeric: { tabular: 'tabular-nums' },
    },
  },
  plugins: [],
};
