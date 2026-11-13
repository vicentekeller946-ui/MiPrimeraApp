/**
 * VicentMusic — Localización del backend de descargas MP3
 *
 * Orden de prioridad:
 *  1. EXPO_PUBLIC_BACKEND_URL (si la defines en .env, p. ej. tu URL de Render/Railway).
 *  2. Detección automática en desarrollo: el backend corre en el mismo PC que el
 *     servidor de Expo, así que usamos la IP desde la que la app cargó el código
 *     (Constants.expoConfig.hostUri, p. ej. "192.168.1.8:8081") con el puerto 4000.
 *     Así funciona con cualquier IP o red Wi-Fi sin tocar nada.
 *  3. null → no hay backend disponible.
 */

import Constants from 'expo-constants';

export const BACKEND_PORT = 4000;

function detectDevMachineHost(): string | null {
  const hostUri = Constants.expoConfig?.hostUri;
  if (!hostUri) return null;

  // "192.168.1.8:8081" → "192.168.1.8"  |  "[fe80::1]:8081" → "[fe80::1]"
  const host = hostUri.replace(/^[a-z]+:\/\//i, '').replace(/\/.*$/, '').replace(/:\d+$/, '');
  if (!host) return null;

  // En modo túnel (--tunnel) la IP no es la de tu PC; ahí hay que usar EXPO_PUBLIC_BACKEND_URL
  if (/\.exp\.direct$|ngrok/i.test(host)) return null;

  return host;
}

export function getBackendUrl(): string | null {
  const configured = process.env.EXPO_PUBLIC_BACKEND_URL?.trim();
  if (configured) return configured.replace(/\/+$/, '');

  const host = detectDevMachineHost();
  if (host) return `http://${host}:${BACKEND_PORT}`;

  return null;
}
