import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

/**
 * El proxy hacia el backend: `/api` y el WebSocket del POV.
 *
 * Es lo que hace que el backend **no** tenga que exponerse: el unico que
 * escucha en la red es el frontend, que reenvia. Por eso el tunel del
 * playtest apunta al frontend y no al backend (el plan del playtest remoto).
 */
/**
 * Los hostnames que el servidor acepta.
 *
 * Vite (5.4+) tiene un "host check" que responde **403** a cualquier host que
 * no sea localhost: sin esto, el túnel del playtest remoto (que entra con el
 * hostname del túnel, no con localhost) recibe 403 y el jugador no ve la
 * pantalla ✗.
 *
 * Se listan los de los túneles gratis. Cuando tengas dominio propio, agregá
 * acá el tuyo (una línea).
 */
const HOSTS_PERMITIDOS = [
  '.trycloudflare.com', // Cloudflare quick tunnel (gratis, sin cuenta)
  '.tunnelmole.net', // tunnelmole (gratis, open source, sin cuenta)
  '.ts.net', // Tailscale Funnel (gratis, URL fija)
];

const apiProxy = {
  '/api': {
    target: 'http://localhost:8000',
    changeOrigin: true,
    ws: true,
  },
}

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
      '@core': path.resolve(__dirname, '../../core'),
    },
  },
  server: {
    port: 5173,
    allowedHosts: HOSTS_PERMITIDOS,
    proxy: apiProxy,
  },
  // El build de produccion (`npm run build` + `npm run serve:prod`): sirve los
  // bundles y proxya el API igual que el dev server. Para jugar por un tunel
  // hay que usar ESTE, no el dev server: vite manda cientos de modulos sin
  // bundlear y la primera carga por un tunel seria de minutos.
  preview: {
    port: 5173,
    allowedHosts: HOSTS_PERMITIDOS,
    proxy: apiProxy,
  },
})
