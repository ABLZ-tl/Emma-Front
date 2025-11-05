// Versión generada automáticamente - se actualiza en cada build
// En desarrollo, usa timestamp para que cambie cada vez que se recarga
const getVersion = () => {
  if (import.meta.env.VITE_APP_VERSION) {
    // Versión de build (generada en vite.config.js)
    return import.meta.env.VITE_APP_VERSION;
  }
  // En desarrollo, genera una versión basada en timestamp
  // Esto cambia cada vez que se recarga la página
  return `dev-${Date.now().toString(36).slice(-6)}`;
};

export const APP_VERSION = getVersion();
export const BUILD_TIME = import.meta.env.VITE_BUILD_TIME || new Date().toISOString();

// Log para debugging
if (import.meta.env.DEV) {
  console.log(`📦 Versión de la app: ${APP_VERSION}`);
}

