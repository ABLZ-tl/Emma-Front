import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// Generar versión única basada en timestamp actual
const buildVersion = `v${Date.now().toString(36)}`;
const buildTime = new Date().toISOString();

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  define: {
    // Generar versión única basada en timestamp de build
    'import.meta.env.VITE_APP_VERSION': JSON.stringify(buildVersion),
    'import.meta.env.VITE_BUILD_TIME': JSON.stringify(buildTime),
  },
  // Log para verificar que se genera la versión
  buildStart() {
    console.log(`🚀 Build iniciado - Versión: ${buildVersion}`);
  },
})
