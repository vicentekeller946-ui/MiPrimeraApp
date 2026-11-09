/**
 * VicentMusic — Native Audio Engine (expo-audio)
 *
 * Utiliza AudioPlaylist de expo-audio para:
 * 1. Reproducción continua automática (Next automático al terminar pista).
 * 2. Controles de pantalla de bloqueo y Centro de Control con botones
 *    de Siguiente (Next) y Anterior (Previous) ACTIVOS y funcionales.
 * 3. Reproducción en segundo plano con pantalla apagada.
 */

import {
  createAudioPlaylist,
  createAudioPlayer,
  setAudioModeAsync,
  type AudioPlaylist,
  type AudioPlayer,
  type AudioPlaylistStatus,
  type AudioStatus,
} from 'expo-audio';
import { Asset } from 'expo-asset';
import * as FileSystem from 'expo-file-system/legacy';
import { Platform } from 'react-native';
import type { Song } from '@/types/music';

// Archivos de audio locales empaquetados directamente en el bundle de la aplicación
const BUNDLED_AUDIO_ASSETS: Record<string, number> = {
  'asset://vicent_test_song.mp3': require('../../assets/audio/vicent_test_song.mp3'),
  'asset://ambient_electronic.mp3': require('../../assets/audio/ambient_electronic.mp3'),
};

const DEFAULT_AUDIO_ASSET = BUNDLED_AUDIO_ASSETS['asset://vicent_test_song.mp3'];

export interface PlaybackStatus {
  isPlaying: boolean;
  position: number; // en segundos
  duration: number; // en segundos
  isBuffering: boolean;
  song: Song | null;
  volume: number;
  error: string | null;
}

export type PlaybackListener = (status: PlaybackStatus) => void;

class PlayerService {
  private static instance: PlayerService;

  private playlist: AudioPlaylist | null = null;
  private singlePlayer: AudioPlayer | null = null;

  private currentSong: Song | null = null;
  private currentQueue: Song[] = [];
  private currentIndex = 0;

  private isPlaying = false;
  private position = 0;
  private duration = 0;
  private volume = 1.0;
  private isBuffering = false;
  private errorMessage: string | null = null;
  private audioModeConfigured = false;

  private listeners: Set<PlaybackListener> = new Set();
  private onTrackEndedCallback: (() => void) | null = null;
  private onTrackChangedCallback: ((index: number, song: Song) => void) | null = null;

  private constructor() {}

  static getInstance(): PlayerService {
    if (!PlayerService.instance) {
      PlayerService.instance = new PlayerService();
    }
    return PlayerService.instance;
  }

  /**
   * Configura el modo de audio para segundo plano y controles en pantalla de bloqueo
   */
  private async configureAudioMode(): Promise<void> {
    try {
      await setAudioModeAsync({
        playsInSilentMode: true,
        shouldPlayInBackground: true,
        interruptionMode: 'doNotMix',
      });
      this.audioModeConfigured = true;
    } catch (e) {
      console.warn('[PlayerService] Aviso configurando modo de audio del sistema:', e);
    }
  }

  addListener(listener: PlaybackListener): () => void {
    this.listeners.add(listener);
    this.notifyListeners();
    return () => {
      this.listeners.delete(listener);
    };
  }

  setOnTrackEnded(callback: () => void): void {
    this.onTrackEndedCallback = callback;
  }

  setOnTrackChanged(callback: (index: number, song: Song) => void): void {
    this.onTrackChangedCallback = callback;
  }

  private notifyListeners(): void {
    const status: PlaybackStatus = {
      isPlaying: this.isPlaying,
      position: this.position,
      duration: this.duration,
      isBuffering: this.isBuffering,
      song: this.currentSong,
      volume: this.volume,
      error: this.errorMessage,
    };
    this.listeners.forEach((listener) => {
      try {
        listener(status);
      } catch (e) {
        console.error('[PlayerService] Error notificando a listener:', e);
      }
    });
  }

  /**
   * Resuelve el origen de audio para expo-audio
   */
  private async resolveAudioSource(song: Song): Promise<any> {
    try {
      // 1. Asset empaquetado (asset://...)
      if (song.uri && song.uri.startsWith('asset://')) {
        const assetId = BUNDLED_AUDIO_ASSETS[song.uri] ?? DEFAULT_AUDIO_ASSET;
        const asset = Asset.fromModule(assetId);
        await asset.downloadAsync();
        return { uri: asset.localUri ?? asset.uri };
      }

      // 2. Archivo local descargado en el teléfono (file:// o /music/)
      if (song.uri && (song.uri.startsWith('file://') || song.uri.includes('/music/'))) {
        const info = await FileSystem.getInfoAsync(song.uri);
        if (info.exists) {
          return { uri: song.uri };
        }
        console.warn('[PlayerService] Archivo local no encontrado en disco, usando fallback:', song.uri);
        const fallback = Asset.fromModule(DEFAULT_AUDIO_ASSET);
        await fallback.downloadAsync();
        return { uri: fallback.localUri ?? fallback.uri };
      }

      // 3. URL remota http/https
      if (song.uri && (song.uri.startsWith('http://') || song.uri.startsWith('https://'))) {
        return { uri: song.uri };
      }

      // 4. Fallback garantizado
      const fallback = Asset.fromModule(DEFAULT_AUDIO_ASSET);
      await fallback.downloadAsync();
      return { uri: fallback.localUri ?? fallback.uri };
    } catch (e) {
      console.warn('[PlayerService] Error resolviendo origen de audio:', e);
      return DEFAULT_AUDIO_ASSET;
    }
  }

  /**
   * Carga y reproduce una canción utilizando AudioPlaylist nativo
   * Permite avanzar canciones desde la pantalla de bloqueo y pasar automáticamente a la siguiente.
   */
  async loadSong(song: Song, queue?: Song[], index?: number): Promise<void> {
    await this.configureAudioMode();

    // Limpiar reproductor previo
    this.cleanupCurrent();

    this.currentSong = song;
    this.duration = song.duration > 0 ? song.duration : 180;
    this.position = 0;
    this.isPlaying = true;
    this.isBuffering = true;
    this.errorMessage = null;

    // Verificar si es un video de YouTube sin descargar
    const hasLocalFile = Boolean(
      song.uri && (song.uri.startsWith('file://') || song.uri.includes('.mp3') || song.uri.startsWith('asset://'))
    );

    if (!hasLocalFile && (song.id.startsWith('yt_') || song.uri?.includes('youtube.com') || song.genre === 'YouTube')) {
      this.isBuffering = false;
      this.notifyListeners();
      return;
    }

    // Configurar la cola nativa
    const targetQueue = queue && queue.length > 0 ? queue : [song];
    this.currentQueue = targetQueue;
    const targetIdx = index ?? Math.max(0, targetQueue.findIndex((s) => s.id === song.id));
    this.currentIndex = Math.max(0, targetIdx);

    this.notifyListeners();

    try {
      // Resolver fuentes para toda la cola (permite transiciones instantáneas sin pausas)
      const resolvedSources = await Promise.all(
        targetQueue.map((s) => this.resolveAudioSource(s))
      );

      // Usar AudioPlaylist para activar Next y Previous nativos en la pantalla de bloqueo
      this.playlist = createAudioPlaylist({
        sources: resolvedSources,
        updateInterval: 250,
        loop: 'all', // Reproducción continua en bucle para que nunca se detenga
      });

      if (this.playlist) {
        this.playlist.volume = this.volume;

        // Saltar al índice seleccionado de inmediato
        if (this.currentIndex > 0 && this.currentIndex < resolvedSources.length) {
          try {
            this.playlist.skipTo(this.currentIndex);
          } catch (_) {}
        }

        // Configurar Controles de Pantalla de Bloqueo con Next y Previous ACTIVOS
        try {
          this.playlist.setActiveForLockScreen(
            true,
            {
              title: song.title,
              artist: song.artist,
              albumTitle: song.album ?? 'VicentMusic',
              artworkUrl: song.artwork,
            },
            {
              showNextTrack: true, // ¡Activa el botón Siguiente en pantalla de bloqueo!
              showPreviousTrack: true, // ¡Activa el botón Anterior en pantalla de bloqueo!
              showSeekForward: false,
              showSeekBackward: false,
            }
          );
        } catch (e) {
          console.warn('[PlayerService] Aviso configurando pantalla de bloqueo:', e);
        }

        // Escuchar eventos de estado del reproductor nativo
        this.playlist.addListener('playlistStatusUpdate', (status: AudioPlaylistStatus) => {
          this.isPlaying = status.playing;
          this.isBuffering = status.isBuffering ?? false;
          this.position = Math.max(0, Math.floor(status.currentTime));
          if (status.duration && status.duration > 0) {
            this.duration = Math.floor(status.duration);
          }
          this.notifyListeners();

          if (status.didJustFinish && this.onTrackEndedCallback) {
            this.onTrackEndedCallback();
          }
        });

        // Escuchar cuando el usuario cambia de canción desde la pantalla de bloqueo o cuando termina una canción
        this.playlist.addListener('trackChanged', (data: { previousIndex: number; currentIndex: number }) => {
          const nextIdx = data.currentIndex;
          this.currentIndex = nextIdx;
          const newSong = this.currentQueue[nextIdx];

          if (newSong) {
            this.currentSong = newSong;
            this.duration = newSong.duration > 0 ? newSong.duration : 180;
            this.position = 0;

            // Actualizar carátula y título en pantalla de bloqueo
            try {
              this.playlist?.updateLockScreenMetadata({
                title: newSong.title,
                artist: newSong.artist,
                albumTitle: newSong.album ?? 'VicentMusic',
                artworkUrl: newSong.artwork,
              });
            } catch (_) {}

            this.notifyListeners();

            if (this.onTrackChangedCallback) {
              this.onTrackChangedCallback(nextIdx, newSong);
            }
          }
        });

        // Iniciar reproducción
        this.playlist.play();
        this.isPlaying = true;
        this.isBuffering = false;
        this.notifyListeners();
        return;
      }
    } catch (error: any) {
      console.warn('[PlayerService] Fallback a reproductor individual:', error);
      // Fallback a AudioPlayer estándar si la lista fallara
      await this.loadSinglePlayerFallback(song);
    }
  }

  private async loadSinglePlayerFallback(song: Song): Promise<void> {
    try {
      const source = await this.resolveAudioSource(song);
      this.singlePlayer = createAudioPlayer(source, {
        updateInterval: 250,
        keepAudioSessionActive: true,
        allowsExternalPlayback: true,
      });

      if (this.singlePlayer) {
        this.singlePlayer.volume = this.volume;
        this.singlePlayer.addListener('playbackStatusUpdate', (status: AudioStatus) => {
          this.isPlaying = status.playing;
          this.isBuffering = status.isBuffering ?? false;
          this.position = Math.max(0, Math.floor(status.currentTime));
          if (status.duration && status.duration > 0) {
            this.duration = Math.floor(status.duration);
          }
          this.notifyListeners();
          if (status.didJustFinish && this.onTrackEndedCallback) {
            this.onTrackEndedCallback();
          }
        });

        try {
          this.singlePlayer.setActiveForLockScreen(
            true,
            {
              title: song.title,
              artist: song.artist,
              albumTitle: song.album ?? 'VicentMusic',
              artworkUrl: song.artwork,
            },
            {
              showNextTrack: true,
              showPreviousTrack: true,
            }
          );
        } catch (_) {}

        this.singlePlayer.play();
        this.isPlaying = true;
        this.isBuffering = false;
        this.notifyListeners();
      }
    } catch (err: any) {
      console.error('[PlayerService] Error en fallback individual:', err);
      this.isPlaying = false;
      this.isBuffering = false;
      this.errorMessage = err?.message || 'No se pudo reproducir este audio.';
      this.notifyListeners();
    }
  }

  private cleanupCurrent(): void {
    if (this.playlist) {
      try {
        this.playlist.pause();
        this.playlist.clearLockScreenControls?.();
        this.playlist.destroy?.();
      } catch (_) {}
      this.playlist = null;
    }

    if (this.singlePlayer) {
      try {
        this.singlePlayer.pause();
        this.singlePlayer.clearLockScreenControls?.();
        this.singlePlayer.remove?.();
      } catch (_) {}
      this.singlePlayer = null;
    }
  }

  async play(): Promise<void> {
    if (this.playlist) {
      this.playlist.play();
      this.isPlaying = true;
      this.notifyListeners();
      return;
    }
    if (this.singlePlayer) {
      this.singlePlayer.play();
      this.isPlaying = true;
      this.notifyListeners();
      return;
    }
    if (this.currentSong) {
      await this.loadSong(this.currentSong, this.currentQueue, this.currentIndex);
    }
  }

  async pause(): Promise<void> {
    if (this.playlist) {
      this.playlist.pause();
    }
    if (this.singlePlayer) {
      this.singlePlayer.pause();
    }
    this.isPlaying = false;
    this.notifyListeners();
  }

  async next(): Promise<void> {
    if (this.playlist) {
      this.playlist.next();
      return;
    }
    if (this.onTrackEndedCallback) {
      this.onTrackEndedCallback();
    }
  }

  async previous(): Promise<void> {
    if (this.playlist) {
      this.playlist.previous();
      return;
    }
    if (this.position > 3) {
      await this.seekTo(0);
    }
  }

  async skipTo(index: number): Promise<void> {
    if (this.playlist) {
      this.playlist.skipTo(index);
    }
  }

  async stop(): Promise<void> {
    this.isPlaying = false;
    this.position = 0;
    if (this.playlist) {
      this.playlist.pause();
      await this.playlist.seekTo(0);
    }
    if (this.singlePlayer) {
      this.singlePlayer.pause();
      await this.singlePlayer.seekTo(0);
    }
    this.notifyListeners();
  }

  async seekTo(seconds: number): Promise<void> {
    this.position = Math.max(0, Math.floor(seconds));
    if (this.playlist) {
      try {
        await this.playlist.seekTo(this.position);
      } catch (_) {}
    }
    if (this.singlePlayer) {
      try {
        await this.singlePlayer.seekTo(this.position);
      } catch (_) {}
    }
    this.notifyListeners();
  }

  async setVolume(volume: number): Promise<void> {
    this.volume = Math.max(0, Math.min(1, volume));
    if (this.playlist) {
      this.playlist.volume = this.volume;
    }
    if (this.singlePlayer) {
      this.singlePlayer.volume = this.volume;
    }
    this.notifyListeners();
  }

  hasPlaylist(): boolean {
    return this.playlist !== null;
  }

  getCurrentStatus(): PlaybackStatus {
    return {
      isPlaying: this.isPlaying,
      position: this.position,
      duration: this.duration,
      isBuffering: this.isBuffering,
      song: this.currentSong,
      volume: this.volume,
      error: this.errorMessage,
    };
  }
}

export default PlayerService;
