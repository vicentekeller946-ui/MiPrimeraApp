/**
 * VicentMusic — Native Audio Engine (expo-audio)
 *
 * Utiliza expo-audio para reproducción real de audio de alta fidelidad,
 * controles de pantalla de bloqueo y reproducción en segundo plano.
 * Compatible con iOS, Android y Web.
 */

import {
  createAudioPlayer,
  setAudioModeAsync,
  type AudioPlayer,
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

  private player: AudioPlayer | null = null;
  private currentSong: Song | null = null;
  private isPlaying = false;
  private position = 0;
  private duration = 0;
  private volume = 1.0;
  private isBuffering = false;
  private errorMessage: string | null = null;
  private audioModeConfigured = false;

  private listeners: Set<PlaybackListener> = new Set();
  private onTrackEndedCallback: (() => void) | null = null;

  private constructor() {}

  static getInstance(): PlayerService {
    if (!PlayerService.instance) {
      PlayerService.instance = new PlayerService();
    }
    return PlayerService.instance;
  }

  /**
   * Configura el modo de audio para permitir reproducción en segundo plano y con la pantalla bloqueada o en silencio
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
   * Resuelve el origen de audio de forma segura para expo-audio:
   * Descarga previa de assets a caché local y verificación de archivos en disco.
   */
  private async resolveAudioSource(song: Song): Promise<any> {
    try {
      // 1. Si es un asset empaquetado (asset://...)
      if (song.uri && song.uri.startsWith('asset://')) {
        const assetId = BUNDLED_AUDIO_ASSETS[song.uri] ?? DEFAULT_AUDIO_ASSET;
        const asset = Asset.fromModule(assetId);
        await asset.downloadAsync();
        return { uri: asset.localUri ?? asset.uri };
      }

      // 2. Si es una ruta local del teléfono (file:// o ruta de almacenamiento /music/)
      if (song.uri && (song.uri.startsWith('file://') || song.uri.includes('/music/'))) {
        const info = await FileSystem.getInfoAsync(song.uri);
        if (info.exists) {
          return { uri: song.uri };
        }
        console.warn('[PlayerService] Archivo local no encontrado en disco, usando audio base:', song.uri);
        const fallback = Asset.fromModule(DEFAULT_AUDIO_ASSET);
        await fallback.downloadAsync();
        return { uri: fallback.localUri ?? fallback.uri };
      }

      // 3. Si es una URL remota http/https
      if (song.uri && (song.uri.startsWith('http://') || song.uri.startsWith('https://'))) {
        return { uri: song.uri };
      }

      // 4. Fallback por defecto garantizado
      const fallback = Asset.fromModule(DEFAULT_AUDIO_ASSET);
      await fallback.downloadAsync();
      return { uri: fallback.localUri ?? fallback.uri };
    } catch (e) {
      console.warn('[PlayerService] Error resolviendo origen de audio, usando asset base:', e);
      return DEFAULT_AUDIO_ASSET;
    }
  }

  /**
   * Carga y reproduce una canción utilizando expo-audio de forma real y audible
   */
  async loadSong(song: Song): Promise<void> {
    await this.configureAudioMode();

    // Limpiar reproductor previo
    if (this.player) {
      try {
        this.player.pause();
        this.player.clearLockScreenControls?.();
        this.player.remove();
      } catch (_) {}
      this.player = null;
    }

    this.currentSong = song;
    this.duration = song.duration > 0 ? song.duration : 180;
    this.position = 0;
    this.isPlaying = true;
    this.isBuffering = false;
    this.errorMessage = null;

    // Si tiene archivo local físico .mp3 descargado, DEBE reproducirse con el motor de audio nativo (expo-audio)
    // para sonar en segundo plano y sin internet.
    const hasLocalFile = Boolean(
      song.uri && (song.uri.startsWith('file://') || song.uri.includes('.mp3') || song.uri.startsWith('asset://'))
    );

    // Solo tratar como streaming web si NO tiene archivo de audio descargado
    if (!hasLocalFile && (song.id.startsWith('yt_') || song.uri?.includes('youtube.com') || song.genre === 'YouTube')) {
      this.notifyListeners();
      return;
    }

    this.isBuffering = true;
    this.notifyListeners();

    try {
      const source = await this.resolveAudioSource(song);

      this.player = createAudioPlayer(source, {
        updateInterval: 250,
        downloadFirst: true,
        keepAudioSessionActive: true,
        allowsExternalPlayback: true,
      });

      if (this.player) {
        this.player.volume = this.volume;

        // Escuchar eventos reales del motor de audio
        this.player.addListener('playbackStatusUpdate', (status: AudioStatus) => {
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

        // Configurar controles en la pantalla de bloqueo (iOS y Android)
        try {
          this.player.setActiveForLockScreen(true, {
            title: song.title,
            artist: song.artist,
            albumTitle: song.album ?? 'VicentMusic',
            artworkUrl: song.artwork,
          });
        } catch (e) {
          console.warn('[PlayerService] Lock screen no disponible:', e);
        }

        // Iniciar reproducción sonora real
        this.player.play();
        this.isPlaying = true;
        this.isBuffering = false;
        this.notifyListeners();
        return;
      }
    } catch (error: any) {
      console.error('[PlayerService] Error al reproducir audio real:', error);
      this.isPlaying = false;
      this.isBuffering = false;
      this.errorMessage = error?.message || 'No se pudo reproducir este archivo de audio.';
      this.notifyListeners();
    }
  }

  async play(): Promise<void> {
    if (!this.currentSong) return;

    if (this.player) {
      try {
        this.player.play();
        this.isPlaying = true;
        this.notifyListeners();
      } catch (err) {
        console.error('[PlayerService] Error al reanudar reproducción:', err);
      }
    } else {
      await this.loadSong(this.currentSong);
    }
  }

  async pause(): Promise<void> {
    if (this.player) {
      try {
        this.player.pause();
        this.isPlaying = false;
        this.notifyListeners();
      } catch (err) {
        console.error('[PlayerService] Error al pausar reproducción:', err);
      }
    } else {
      this.isPlaying = false;
      this.notifyListeners();
    }
  }

  async stop(): Promise<void> {
    this.isPlaying = false;
    this.position = 0;
    if (this.player) {
      try {
        this.player.pause();
        await this.player.seekTo(0);
      } catch (_) {}
    }
    this.notifyListeners();
  }

  async seekTo(seconds: number): Promise<void> {
    this.position = Math.max(0, Math.floor(seconds));
    if (this.player) {
      try {
        await this.player.seekTo(this.position);
      } catch (err) {
        console.error('[PlayerService] Error en seekTo:', err);
      }
    }
    this.notifyListeners();
  }

  async setVolume(volume: number): Promise<void> {
    this.volume = Math.max(0, Math.min(1, volume));
    if (this.player) {
      try {
        this.player.volume = this.volume;
      } catch (err) {
        console.error('[PlayerService] Error configurando volumen:', err);
      }
    }
    this.notifyListeners();
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
