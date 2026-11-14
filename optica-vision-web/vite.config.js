import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

// En desarrollo, el navegador llama a /api/... en http://localhost:5173 y Vite reenvía la petición
// a la API de ASP.NET (https://localhost:7100). Así no hay problemas de CORS ni de certificado HTTPS local.
export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    port: 5173,
    proxy: {
      '/api': {
        target: 'https://localhost:7100',
        changeOrigin: true,
        secure: false,
      },
    },
  },
});
