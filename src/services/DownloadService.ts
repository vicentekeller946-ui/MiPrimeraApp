/**
 * VicentMusic — Download & Import Service
 *
 * Administra la importación de archivos de música locales desde el dispositivo (expo-document-picker)
 * y la descarga de archivos de audio desde fuentes autorizadas (expo-file-system).
 *
 * - Detección de duplicados
 * - Monitoreo de progreso en tiempo real
 * - Registro automático en la biblioteca offline
 */

import * as DocumentPicker from 'expo-document-picker';
import * as FileSystem from 'expo-file-system/legacy';
import { Platform } from 'react-native';
import StorageService from '@/services/StorageService';
import DatabaseService from '@/services/DatabaseService';
import { getBackendUrl } from '@/services/BackendConfig';
import type { Song, Download } from '@/types/music';

export type DownloadListener = (activeDownloads: Download[]) => void;

class DownloadService {
  private static instance: DownloadService;
  private activeDownloads: Map<
    string,
    {
      download: Download;
      resumable?: FileSystem.DownloadResumable;
      onResult?: (p: Promise<FileSystem.FileSystemDownloadResult | undefined>) => Promise<void>;
    }
  > = new Map();
  private listeners: Set<DownloadListener> = new Set();

  private constructor() {}

  static getInstance(): DownloadService {
    if (!DownloadService.instance) {
      DownloadService.instance = new DownloadService();
    }
    return DownloadService.instance;
  }

  addListener(listener: DownloadListener): () => void {
    this.listeners.add(listener);
    listener(this.getActiveDownloadsList());
    return () => {
      this.listeners.delete(listener);
    };
  }

  private notifyListeners(): void {
    const list = this.getActiveDownloadsList();
    this.listeners.forEach((l) => {
      try {
        l(list);
      } catch (err) {
        console.error('[DownloadService] Error en listener:', err);
      }
    });
  }

  getActiveDownloadsList(): Download[] {
    return Array.from(this.activeDownloads.values()).map((v) => v.download);
  }

  /**
   * Importa uno o más archivos de música desde el almacenamiento local del dispositivo
   */
  async importAudioFile(): Promise<Song | null> {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: ['audio/*'],
        copyToCacheDirectory: true,
      });

      if (result.canceled || !result.assets || result.assets.length === 0) {
        return null;
      }

      const asset = result.assets[0];
      const fileName = asset.name;
      const fileUri = asset.uri;

      // Verificar duplicados en la base de datos
      const existingSongs = await DatabaseService.getInstance().getAllSongs();
      const isDuplicate = existingSongs.some(
        (s) => s.title.toLowerCase() === fileName.replace(/\.[^/.]+$/, '').toLowerCase()
      );

      if (isDuplicate) {
        throw new Error('Esta canción ya existe en tu biblioteca de VicentMusic.');
      }

      // Guardar en el directorio permanente de VicentMusic
      const { localUri, size } = await StorageService.getInstance().saveLocalAudioFile(
        fileUri,
        fileName
      );

      // Limpiar el nombre para título
      const cleanTitle = fileName.replace(/\.[^/.]+$/, '').replace(/_/g, ' ');
      const extension = fileName.split('.').pop()?.toLowerCase() || 'mp3';

      const newSong: Song = {
        id: `local_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
        title: cleanTitle,
        artist: 'Archivo Local',
        album: 'Música Importada',
        duration: 210, // Duración estimada inicial
        uri: localUri,
        genre: 'Local',
        format: extension,
        fileSize: size || asset.size || 1024 * 1024 * 5,
        isFavorite: false,
        isDownloaded: true, // Disponible 100% offline
        addedAt: Date.now(),
        playCount: 0,
      };

      await DatabaseService.getInstance().addSong(newSong);
      return newSong;
    } catch (error) {
      console.error('[DownloadService] Error importando archivo:', error);
      throw error;
    }
  }

  /**
   * Inicia la descarga de un archivo de audio desde una URL autorizada
   */
  async startDownload(url: string, fileName: string, songMetadata?: Partial<Song>): Promise<Download> {
    const downloadId = `dl_${Date.now()}`;
    const cleanFileName = fileName.endsWith('.mp3') || fileName.endsWith('.flac') ? fileName : `${fileName}.mp3`;

    // Comprobar duplicados
    const existingSongs = await DatabaseService.getInstance().getAllSongs();
    const isDuplicate = existingSongs.some(
      (s) => s.title.toLowerCase() === fileName.replace(/\.[^/.]+$/, '').toLowerCase()
    );
    if (isDuplicate) {
      throw new Error('Ya tienes esta canción descargada en tu biblioteca.');
    }

    const storage = StorageService.getInstance();
    const musicDir = await storage.ensureMusicDirectory();
    const targetUri = `${musicDir}${downloadId}_${cleanFileName}`;

    const downloadState: Download = {
      id: downloadId,
      url,
      fileName: cleanFileName,
      progress: 0,
      status: 'downloading',
      startedAt: Date.now(),
      downloadedSize: 0,
      fileSize: 1024 * 1024 * 8, // Inicial estimado
    };

    if (Platform.OS === 'web') {
      // Simulación controlada para web
      this.activeDownloads.set(downloadId, { download: downloadState });
      this.notifyListeners();
      return downloadState;
    }

    let lastBytes = 0;
    let lastTime = Date.now();

    const callback = (downloadProgress: FileSystem.DownloadProgressData) => {
      const now = Date.now();
      const timeDiff = (now - lastTime) / 1000;
      const bytesDiff = downloadProgress.totalBytesWritten - lastBytes;

      const speed = timeDiff > 0 ? bytesDiff / timeDiff : 0;
      lastBytes = downloadProgress.totalBytesWritten;
      lastTime = now;

      const progress = downloadProgress.totalBytesExpectedToWrite > 0
        ? downloadProgress.totalBytesWritten / downloadProgress.totalBytesExpectedToWrite
        : 0;

      downloadState.progress = progress;
      downloadState.downloadedSize = downloadProgress.totalBytesWritten;
      downloadState.fileSize = downloadProgress.totalBytesExpectedToWrite;
      downloadState.speed = speed;

      this.notifyListeners();
    };

    const resumable = FileSystem.createDownloadResumable(url, targetUri, {}, callback);

    // Se usa tanto para la descarga inicial como al reanudar tras una pausa
    // (si se pausa, downloadAsync() termina sin resultado y es resumeAsync() quien lo entrega).
    const handleResult = (promise: Promise<FileSystem.FileSystemDownloadResult | undefined>) =>
      promise
      .then(async (result) => {
        if (result && result.uri) {
          if (result.status !== 200) {
            await FileSystem.deleteAsync(result.uri, { idempotent: true }).catch(() => {});
            throw new Error(`El servidor respondió con el código ${result.status}.`);
          }
          downloadState.status = 'completed';
          downloadState.progress = 1;
          downloadState.completedAt = Date.now();

          // Registrar en la biblioteca
          const newSong: Song = {
            id: `song_${downloadId}`,
            title: songMetadata?.title || fileName.replace(/\.[^/.]+$/, ''),
            artist: songMetadata?.artist || 'Descargas Autorizadas',
            album: songMetadata?.album || 'Descargas',
            duration: songMetadata?.duration || 240,
            uri: result.uri,
            format: fileName.split('.').pop()?.toLowerCase() || 'mp3',
            fileSize: downloadState.downloadedSize,
            isFavorite: false,
            isDownloaded: true,
            addedAt: Date.now(),
            playCount: 0,
          };

          await DatabaseService.getInstance().addSong(newSong);
          this.activeDownloads.delete(downloadId);
          this.notifyListeners();
        }
      })
      .catch((err: any) => {
        downloadState.status = 'failed';
        downloadState.error = err.message || 'Error de descarga';
        this.notifyListeners();
      });

    this.activeDownloads.set(downloadId, { download: downloadState, resumable, onResult: handleResult });
    this.notifyListeners();

    handleResult(resumable.downloadAsync());

    return downloadState;
  }

  /**
   * Pausa una descarga activa
   */
  async pauseDownload(downloadId: string): Promise<void> {
    const item = this.activeDownloads.get(downloadId);
    if (item && item.resumable) {
      await item.resumable.pauseAsync();
      item.download.status = 'paused';
      this.notifyListeners();
    }
  }

  /**
   * Reanuda una descarga pausada
   */
  async resumeDownload(downloadId: string): Promise<void> {
    const item = this.activeDownloads.get(downloadId);
    if (item && item.resumable) {
      item.download.status = 'downloading';
      this.notifyListeners();
      const resumed = item.resumable.resumeAsync();
      await (item.onResult ? item.onResult(resumed) : resumed);
    }
  }

  /**
   * Cancela y elimina una descarga en curso
   */
  async cancelDownload(downloadId: string): Promise<void> {
    const item = this.activeDownloads.get(downloadId);
    if (item) {
      if (item.resumable) {
        try {
          await item.resumable.pauseAsync();
        } catch (_) {}
      }
      this.activeDownloads.delete(downloadId);
      this.notifyListeners();
    }
  }

  /**
   * Comprueba si una canción ya está descargada en el almacenamiento local
   */
  async isSongDownloaded(songId: string): Promise<boolean> {
    const db = DatabaseService.getInstance();
    const song = await db.getSongById(songId);
    return song?.isDownloaded === true;
  }

  /**
   * Descarga una canción local/remota y la guarda en la biblioteca permanente sin conexión.
   * NOTA: No se usa para canciones de YouTube (usar downloadYouTubeItem para esas).
   */
  async downloadSong(song: Song): Promise<Song> {
    // Rechazar URLs de YouTube - no se puede descargar audio de YouTube directamente
    if (
      song.uri?.includes('youtube.com') ||
      song.uri?.includes('youtu.be') ||
      song.id.startsWith('yt_') ||
      song.genre === 'YouTube'
    ) {
      throw new Error(
        'Las canciones de YouTube se reproducen vía streaming oficial. Para música offline, importa archivos MP3 desde la sección Descargas.'
      );
    }

    const storage = StorageService.getInstance();
    const musicDir = await storage.ensureMusicDirectory();
    const cleanId = song.id.replace(/[^a-zA-Z0-9_-]/g, '_');
    const targetUri = `${musicDir}${cleanId}.mp3`;

    let finalUri = song.uri;

    try {
      if (song.uri.startsWith('http://') || song.uri.startsWith('https://')) {
        // Descargar archivo de audio remoto al disco local
        if (Platform.OS !== 'web') {
          const downloadResult = await FileSystem.downloadAsync(song.uri, targetUri);
          finalUri = downloadResult.uri;
        }
      } else if (song.uri.startsWith('asset://')) {
        // Pista de audio empaquetada
        finalUri = song.uri;
      }

      const updatedSong: Song = {
        ...song,
        uri: finalUri,
        isDownloaded: true,
      };

      await DatabaseService.getInstance().addSong(updatedSong);
      return updatedSong;
    } catch (err) {
      console.error('[DownloadService] Error al descargar canción:', err);
      throw err;
    }
  }

  /**
   * Descarga la pista de YouTube como un archivo MP3 físico completo
   * utilizando el microservicio backend de VicentMusic (yt-dlp + ffmpeg).
   */
  async downloadYouTubeItem(item: {
    id: string;
    videoId: string;
    title: string;
    channelTitle: string;
    thumbnail?: string;
  }): Promise<Song> {
    const cleanId = `yt_${item.videoId}`;
    const backendUrl = getBackendUrl();

    // Si hay backend de conversión a MP3 disponible:
    if (backendUrl) {
      const storage = StorageService.getInstance();
      const musicDir = await storage.ensureMusicDirectory();
      const targetUri = `${musicDir}${cleanId}.mp3`;
      const downloadEndpoint = `${backendUrl}/download-mp3?id=${encodeURIComponent(item.videoId)}`;

      console.log(`[DownloadService] Iniciando descarga real de MP3 desde: ${downloadEndpoint}`);

      if (Platform.OS !== 'web') {
        let downloadResult: FileSystem.FileSystemDownloadResult;
        try {
          downloadResult = await FileSystem.downloadAsync(downloadEndpoint, targetUri);
        } catch {
          await FileSystem.deleteAsync(targetUri, { idempotent: true }).catch(() => {});
          throw new Error(
            `No se pudo conectar con el servidor de descargas (${backendUrl}).\n` +
              'Comprueba que el servidor está encendido en tu PC y que el iPhone está en la misma red Wi-Fi.'
          );
        }

        // downloadAsync no falla con errores HTTP: si el servidor respondió con error,
        // el archivo contiene el mensaje JSON y no audio. Lo borramos y mostramos el error.
        if (downloadResult.status !== 200) {
          let reason = `El servidor respondió con el código ${downloadResult.status}.`;
          try {
            const body = JSON.parse(await FileSystem.readAsStringAsync(downloadResult.uri));
            if (body?.error) reason = body.details ? `${body.error}\n${body.details}` : body.error;
          } catch (_) {}
          await FileSystem.deleteAsync(downloadResult.uri, { idempotent: true }).catch(() => {});
          throw new Error(reason);
        }

        const fileInfo = await FileSystem.getInfoAsync(downloadResult.uri);

        const newSong: Song = {
          id: cleanId,
          title: item.title,
          artist: item.channelTitle,
          album: 'Descargas MP3',
          artwork: item.thumbnail,
          duration: 210, // Estimada inicial hasta lectura
          uri: downloadResult.uri, // Ruta física local file:// en el iPhone
          genre: 'Descargado',
          format: 'mp3',
          fileSize: fileInfo.exists && 'size' in fileInfo ? fileInfo.size : 1024 * 1024 * 5,
          isFavorite: false,
          isDownloaded: true, // ¡100% OFFLINE!
          addedAt: Date.now(),
          playCount: 0,
        };

        await DatabaseService.getInstance().addSong(newSong);
        this.notifyListeners();
        return newSong;
      }
    }

    // Si aún no ha configurado el backend, guardar en biblioteca para streaming oficial
    const fallbackSong: Song = {
      id: cleanId,
      title: item.title,
      artist: item.channelTitle,
      album: 'YouTube Oficial',
      artwork: item.thumbnail,
      duration: 0,
      uri: `https://www.youtube.com/watch?v=${item.videoId}`,
      genre: 'YouTube',
      format: 'stream',
      fileSize: 0,
      isFavorite: true,
      isDownloaded: false,
      addedAt: Date.now(),
      playCount: 0,
    };

    await DatabaseService.getInstance().addSong(fallbackSong);
    this.notifyListeners();
    return fallbackSong;
  }
}

export default DownloadService;
