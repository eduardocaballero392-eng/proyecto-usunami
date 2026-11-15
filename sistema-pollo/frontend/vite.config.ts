import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// En desarrollo, /api se redirige al backend → el frontend nunca necesita conocer la IP del servidor.
// En producción, el backend sirve frontend/dist en el mismo puerto.
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    host: true, // accesible desde los celulares de la red local
    proxy: {
      '/api': { target: 'http://localhost:3000', changeOrigin: true },
    },
  },
  build: {
    outDir: 'dist',
    sourcemap: false,
  },
});
