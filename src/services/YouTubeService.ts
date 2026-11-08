/**
 * VicentMusic — YouTube Data API Service (Oficial)
 *
 * Utiliza YouTube Data API v3 y el reproductor embebido oficial
 * para búsqueda y reproducción legal conforme a los Términos de Servicio de YouTube.
 * No realiza extracción de audio, scraping ni evasión de restricciones.
 */

import AsyncStorage from '@react-native-async-storage/async-storage';

const YT_API_KEY_STORAGE = '@vicentmusic_yt_api_key';

export interface YouTubeSearchResult {
  id: string;
  videoId: string;
  title: string;
  channelTitle: string;
  description: string;
  thumbnail: string;
  publishedAt: string;
}

export type YouTubeErrorCode =
  | 'NO_API_KEY'
  | 'QUOTA_EXCEEDED'
  | 'INVALID_KEY'
  | 'NETWORK_ERROR'
  | 'EMPTY_RESULTS'
  | 'UNKNOWN';

export interface YouTubeSearchResponse {
  results: YouTubeSearchResult[];
  hasApiKey: boolean;
  error?: string;
  errorCode?: YouTubeErrorCode;
}

class YouTubeService {
  private static instance: YouTubeService;
  private cachedApiKey: string | null = null;
  private isLoadedFromStorage = false;

  private constructor() {}

  static getInstance(): YouTubeService {
    if (!YouTubeService.instance) {
      YouTubeService.instance = new YouTubeService();
    }
    return YouTubeService.instance;
  }

  /**
   * Obtiene la clave de API activa (desde memoria, AsyncStorage o variable de entorno)
   */
  async getApiKey(): Promise<string> {
    if (this.cachedApiKey !== null) {
      return this.cachedApiKey;
    }

    try {
      const stored = await AsyncStorage.getItem(YT_API_KEY_STORAGE);
      if (stored && stored.trim().length > 0) {
        this.cachedApiKey = stored.trim();
        this.isLoadedFromStorage = true;
        return this.cachedApiKey;
      }
    } catch (e) {
      console.warn('[YouTubeService] Error leyendo API key de almacenamiento:', e);
    }

    // Fallback a variable de entorno compilada
    const envKey = process.env.EXPO_PUBLIC_YOUTUBE_API_KEY || '';
    this.cachedApiKey = envKey.trim();
    return this.cachedApiKey;
  }

  /**
   * Guarda una nueva clave de API en el almacenamiento persistente
   */
  async setApiKey(key: string): Promise<void> {
    const cleanKey = (key || '').trim();
    this.cachedApiKey = cleanKey;
    try {
      if (cleanKey.length > 0) {
        await AsyncStorage.setItem(YT_API_KEY_STORAGE, cleanKey);
      } else {
        await AsyncStorage.removeItem(YT_API_KEY_STORAGE);
      }
    } catch (e) {
      console.error('[YouTubeService] Error guardando API key:', e);
    }
  }

  /**
   * Búsqueda en tiempo real mediante YouTube Data API v3 oficial
   */
  async search(query: string, maxResults = 15): Promise<YouTubeSearchResponse> {
    const cleanQuery = (query || '').trim();
    if (cleanQuery.length === 0) {
      return { results: [], hasApiKey: true };
    }

    const key = await this.getApiKey();

    if (!key || key.length === 0) {
      return {
        results: [],
        hasApiKey: false,
        errorCode: 'NO_API_KEY',
        error:
          'Se requiere una API Key de YouTube Data API v3 para buscar en YouTube. Configúrala en la app o añade EXPO_PUBLIC_YOUTUBE_API_KEY en tu archivo .env.',
      };
    }

    try {
      // videoEmbeddable=true garantiza que los vídeos puedan reproducirse en el reproductor embebido oficial
      const endpoint = `https://www.googleapis.com/youtube/v3/search?part=snippet&type=video&videoEmbeddable=true&q=${encodeURIComponent(
        cleanQuery
      )}&maxResults=${maxResults}&key=${key}`;

      const res = await fetch(endpoint);

      if (!res.ok) {
        let errorMessage = `Error HTTP ${res.status}`;
        let errorCode: YouTubeErrorCode = 'UNKNOWN';

        try {
          const errData = await res.json();
          const googleError = errData?.error;
          const firstReason = googleError?.errors?.[0]?.reason;

          if (res.status === 403) {
            if (firstReason === 'quotaExceeded') {
              errorCode = 'QUOTA_EXCEEDED';
              errorMessage =
                'Se ha superado la cuota diaria gratuita de YouTube Data API (10.000 unidades). Se restablecerá a medianoche (PT).';
            } else {
              errorCode = 'INVALID_KEY';
              errorMessage =
                googleError?.message ||
                'Acceso denegado. Comprueba que YouTube Data API v3 esté habilitada en Google Cloud Console para esta clave.';
            }
          } else if (res.status === 400) {
            errorCode = 'INVALID_KEY';
            errorMessage =
              'La clave de API de YouTube no es válida. Por favor, revísala e introduce una clave correcta.';
          } else {
            errorMessage = googleError?.message || errorMessage;
          }
        } catch (_) {}

        return {
          results: [],
          hasApiKey: true,
          errorCode,
          error: errorMessage,
        };
      }

      const data = await res.json();
      const items: any[] = data.items || [];

      if (items.length === 0) {
        return {
          results: [],
          hasApiKey: true,
          errorCode: 'EMPTY_RESULTS',
          error: `No se encontraron resultados para "${cleanQuery}".`,
        };
      }

      const results: YouTubeSearchResult[] = items
        .filter((item) => item?.id?.videoId)
        .map((item) => {
          const thumbs = item.snippet?.thumbnails || {};
          const thumbUrl =
            thumbs.high?.url ||
            thumbs.medium?.url ||
            thumbs.default?.url ||
            `https://i.ytimg.com/vi/${item.id.videoId}/hqdefault.jpg`;

          return {
            id: item.id.videoId,
            videoId: item.id.videoId,
            title: decodeHtmlEntities(item.snippet.title || ''),
            channelTitle: decodeHtmlEntities(item.snippet.channelTitle || ''),
            description: item.snippet.description || '',
            thumbnail: thumbUrl,
            publishedAt: item.snippet.publishedAt || '',
          };
        });

      return {
        results,
        hasApiKey: true,
      };
    } catch (error: any) {
      console.error('[YouTubeService] Error de red en búsqueda:', error);
      return {
        results: [],
        hasApiKey: true,
        errorCode: 'NETWORK_ERROR',
        error:
          'No se pudo conectar con los servidores de YouTube. Comprueba tu conexión a Internet.',
      };
    }
  }
}

/**
 * Decodifica entidades HTML comunes devueltas por YouTube API (e.g., &quot;, &#39;, &amp;)
 */
function decodeHtmlEntities(str: string): string {
  return str
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&apos;/g, "'");
}

export default YouTubeService;
