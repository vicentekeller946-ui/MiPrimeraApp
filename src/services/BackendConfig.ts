/**
 * VicentMusic — Localización del backend de descargas MP3
 *
 * Orden de prioridad:
 *  1. EXPO_PUBLIC_BACKEND_URL (si la defines en .env, p. ej. tu URL de Render/Railway).
 *  2. En desarrollo (Expo Go / expo start): la IP del PC que sirve el código
 *     (Constants.expoConfig.hostUri), porque el backend corre en ese mismo PC.
 *  3. En la app instalada (IPA): la última IP donde se encontró el servidor, si sigue respondiendo.
 *  4. Búsqueda automática en la red Wi-Fi: se prueban todas las IPs de la red local
 *     (192.168.1.1 … 192.168.1.254) en el puerto 4000 hasta encontrar el servidor de VicentMusic.
 *
 * Así funciona con cualquier IP o red Wi-Fi sin tocar nada.
 */

import Constants from 'expo-constants';
import AsyncStorage from '@react-native-async-storage/async-storage';
import NetInfo from '@react-native-community/netinfo';

export const BACKEND_PORT = 4000;

const CACHE_KEY = 'vicentmusic.backendUrl';
const HEALTH_TIMEOUT_MS = 1500;
const SCAN_BATCH_SIZE = 64;

let sessionUrl: string | null = null;

function detectDevMachineHost(): string | null {
  const hostUri = Constants.expoConfig?.hostUri;
  if (!hostUri) return null;

  // "192.168.1.8:8081" → "192.168.1.8"
  const host = hostUri.replace(/^[a-z]+:\/\//i, '').replace(/\/.*$/, '').replace(/:\d+$/, '');
  if (!host) return null;

  // En modo túnel (--tunnel) la IP no es la de tu PC
  if (/\.exp\.direct$|ngrok/i.test(host)) return null;

  return host;
}

/** Comprueba si en esa URL responde el servidor de VicentMusic */
async function isVicentMusicBackend(url: string, timeoutMs = HEALTH_TIMEOUT_MS): Promise<boolean> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(`${url}/health`, { signal: controller.signal });
    if (!res.ok) return false;
    const body = await res.json();
    return body?.status === 'ok' && String(body?.service ?? '').includes('VicentMusic');
  } catch {
    return false;
  } finally {
    clearTimeout(timer);
  }
}

/** Busca el servidor en todas las IPs de la red Wi-Fi actual (/24) */
async function scanLocalNetwork(): Promise<string | null> {
  const state = await NetInfo.fetch();
  if (state.type !== 'wifi' && state.type !== 'ethernet') return null;

  const deviceIp = state.details?.ipAddress;
  const match = deviceIp?.match(/^(\d+\.\d+\.\d+)\.(\d+)$/);
  if (!match) return null;

  const prefix = match[1];
  const ownLast = Number(match[2]);
  const candidates: string[] = [];
  for (let i = 1; i <= 254; i++) {
    if (i !== ownLast) candidates.push(`http://${prefix}.${i}:${BACKEND_PORT}`);
  }

  console.log(`[BackendConfig] Buscando servidor de descargas en ${prefix}.x ...`);

  for (let i = 0; i < candidates.length; i += SCAN_BATCH_SIZE) {
    const batch = candidates.slice(i, i + SCAN_BATCH_SIZE);
    const found = await new Promise<string | null>((resolve) => {
      let pending = batch.length;
      for (const url of batch) {
        isVicentMusicBackend(url).then((ok) => {
          if (ok) resolve(url);
          else if (--pending === 0) resolve(null);
        });
      }
    });
    if (found) return found;
  }
  return null;
}

/**
 * Devuelve la URL del servidor de descargas, o null si no se encuentra.
 * La primera búsqueda en la Wi-Fi puede tardar unos segundos; después se recuerda.
 */
export async function resolveBackendUrl(): Promise<string | null> {
  const configured = process.env.EXPO_PUBLIC_BACKEND_URL?.trim();
  if (configured) return configured.replace(/\/+$/, '');

  const devHost = detectDevMachineHost();
  if (devHost) return `http://${devHost}:${BACKEND_PORT}`;

  if (sessionUrl && (await isVicentMusicBackend(sessionUrl))) return sessionUrl;

  const cached = await AsyncStorage.getItem(CACHE_KEY).catch(() => null);
  if (cached && (await isVicentMusicBackend(cached))) {
    sessionUrl = cached;
    return cached;
  }

  const found = await scanLocalNetwork();
  if (found) {
    console.log(`[BackendConfig] Servidor de descargas encontrado en ${found}`);
    sessionUrl = found;
    await AsyncStorage.setItem(CACHE_KEY, found).catch(() => {});
  }
  return found;
}
