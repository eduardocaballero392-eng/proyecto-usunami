import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// En desarrollo, /api se redirige al backend → el frontend nunca necesita conocer la IP del servidor.
// En producción, el backend sirve frontend/dist en el mismo puerto.
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    host: '0.0.0.0', // ✅ Accesible desde cualquier dispositivo en la red local
    proxy: {
      '/api': { 
        target: 'http://192.168.1.81:3000', // ✅ IP local para que funcione desde celular
        changeOrigin: true,
        secure: false,
      },
    },
  },
  build: {
    outDir: 'dist',
    sourcemap: false,
  },
});
