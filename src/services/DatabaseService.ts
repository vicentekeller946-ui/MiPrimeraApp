/**
 * VicentMusic — SQLite Database & Persistence Service
 *
 * Persistencia relacional local con expo-sqlite y AsyncStorage.
 * Mantiene canciones, listas, favoritos, historial y configuraciones.
 */

import type { SQLiteDatabase } from 'expo-sqlite';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';
import type { Song, Album, Artist, Playlist, AppSettings } from '@/types/music';
import {
  demoSongs,
  demoAlbums,
  demoArtists,
  demoPlaylists,
} from '@/data/demoData';

const SETTINGS_KEY = '@vicentmusic_settings';
const LAST_PLAYED_KEY = '@vicentmusic_last_played';

class DatabaseService {
  private static instance: DatabaseService;
  private db: SQLiteDatabase | null = null;
  private isInitialized = false;

  // Memoria caché para acceso ultrarrápido y fallback seguro
  private songsMap: Map<string, Song> = new Map();
  private playlistsMap: Map<string, Playlist> = new Map();
  private albumsMap: Map<string, Album> = new Map();
  private artistsMap: Map<string, Artist> = new Map();

  private settings: AppSettings = {
    theme: 'dark',
    crossfadeEnabled: false,
    crossfadeDuration: 3,
    downloadQuality: 'high',
    downloadOverWifiOnly: true,
    sleepTimerMinutes: null,
    equalizerPreset: 'dynamic',
    lastPlayedSongId: null,
    lastPlayedPosition: 0,
  };

  private constructor() {}

  static getInstance(): DatabaseService {
    if (!DatabaseService.instance) {
      DatabaseService.instance = new DatabaseService();
    }
    return DatabaseService.instance;
  }

  async initialize(): Promise<void> {
    if (this.isInitialized) return;

    try {
      // 1. Cargar álbumes y artistas iniciales
      demoAlbums.forEach((al) => this.albumsMap.set(al.id, { ...al }));
      demoArtists.forEach((ar) => this.artistsMap.set(ar.id, { ...ar }));

      // 2. Intentar inicializar SQLite si no estamos en Web
      if (Platform.OS !== 'web') {
        const SQLite = require('expo-sqlite');
        const db: SQLiteDatabase = await SQLite.openDatabaseAsync('vicentmusic.db');
        this.db = db;

        // Crear tablas
        await db.execAsync(`
          PRAGMA journal_mode = WAL;
          CREATE TABLE IF NOT EXISTS songs (
            id TEXT PRIMARY KEY NOT NULL,
            title TEXT NOT NULL,
            artist TEXT NOT NULL,
            album TEXT,
            duration INTEGER NOT NULL,
            uri TEXT NOT NULL,
            artwork TEXT,
            genre TEXT,
            year INTEGER,
            format TEXT,
            bitrate INTEGER,
            sample_rate INTEGER,
            file_size INTEGER,
            is_favorite INTEGER NOT NULL DEFAULT 0,
            is_downloaded INTEGER NOT NULL DEFAULT 0,
            added_at INTEGER NOT NULL,
            last_played_at INTEGER,
            play_count INTEGER NOT NULL DEFAULT 0
          );

          CREATE TABLE IF NOT EXISTS playlists (
            id TEXT PRIMARY KEY NOT NULL,
            name TEXT NOT NULL,
            description TEXT,
            artwork TEXT,
            created_at INTEGER NOT NULL,
            updated_at INTEGER NOT NULL,
            is_offline INTEGER NOT NULL DEFAULT 0
          );

          CREATE TABLE IF NOT EXISTS playlist_songs (
            playlist_id TEXT NOT NULL,
            song_id TEXT NOT NULL,
            order_index INTEGER NOT NULL,
            PRIMARY KEY (playlist_id, song_id)
          );
        `);

        // Comprobar si hay canciones existentes
        const countResult = await db.getFirstAsync<{ count: number }>(
          'SELECT COUNT(*) as count FROM songs;'
        );

        if (!countResult || countResult.count === 0) {
          // Sembrar datos de demostración en SQLite
          for (const s of demoSongs) {
            await db.runAsync(
              `INSERT INTO songs (id, title, artist, album, duration, uri, genre, year, format, bitrate, sample_rate, file_size, is_favorite, is_downloaded, added_at, play_count)
               VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?);`,
              [
                s.id,
                s.title,
                s.artist,
                s.album ?? null,
                s.duration,
                s.uri,
                s.genre ?? null,
                s.year ?? null,
                s.format ?? 'mp3',
                s.bitrate ?? 320,
                s.sampleRate ?? 44100,
                s.fileSize ?? 1024 * 1024 * 6,
                s.isFavorite ? 1 : 0,
                s.isDownloaded ? 1 : 0,
                s.addedAt,
                s.playCount,
              ]
            );
          }

          for (const p of demoPlaylists) {
            await db.runAsync(
              `INSERT INTO playlists (id, name, description, created_at, updated_at, is_offline)
               VALUES (?, ?, ?, ?, ?, ?);`,
              [p.id, p.name, p.description ?? null, p.createdAt, p.updatedAt, p.isOffline ? 1 : 0]
            );
            for (let i = 0; i < p.songIds.length; i++) {
              await db.runAsync(
                `INSERT INTO playlist_songs (playlist_id, song_id, order_index) VALUES (?, ?, ?);`,
                [p.id, p.songIds[i], i]
              );
            }
          }
        } else {
          // Sincronizar siempre las URIs de los archivos de prueba para actualizar registros previos
          for (const s of demoSongs) {
            await db.runAsync(
              `UPDATE songs SET uri = ?, duration = ?, format = ? WHERE id = ?;`,
              [s.uri, s.duration, s.format ?? 'mp3', s.id]
            );
          }
          // Solo marcar como NO descargadas aquellas canciones que sean streaming remoto (http/https)
          // y mantener SIEMPRE como descargadas las que tienen archivo local físico en el iPhone (file:// o asset://)
          await db.runAsync(
            `UPDATE songs SET is_downloaded = 0 WHERE (uri LIKE 'http://%' OR uri LIKE 'https://%') AND uri NOT LIKE 'file://%';`
          );
          await db.runAsync(
            `UPDATE songs SET is_downloaded = 1 WHERE uri LIKE 'file://%' OR uri LIKE 'asset://%';`
          );
        }

        // Cargar SQLite en caché de memoria
        await this.syncCacheFromSQLite();
      } else {
        // Fallback Web: cargar demo data
        demoSongs.forEach((s) => this.songsMap.set(s.id, { ...s }));
        demoPlaylists.forEach((p) => this.playlistsMap.set(p.id, { ...p }));
      }

      // Cargar configuraciones guardadas
      const savedSettings = await AsyncStorage.getItem(SETTINGS_KEY);
      if (savedSettings) {
        this.settings = { ...this.settings, ...JSON.parse(savedSettings) };
      }

      // Cargar última canción reproducida
      const lastPlayed = await AsyncStorage.getItem(LAST_PLAYED_KEY);
      if (lastPlayed) {
        const { songId, position } = JSON.parse(lastPlayed);
        this.settings.lastPlayedSongId = songId;
        this.settings.lastPlayedPosition = position;
      }

      this.isInitialized = true;
      console.log('[DatabaseService] Inicialización completada exitosamente.');
    } catch (e) {
      console.warn('[DatabaseService] Error inicializando SQLite, usando modo memoria:', e);
      demoSongs.forEach((s) => this.songsMap.set(s.id, { ...s }));
      demoPlaylists.forEach((p) => this.playlistsMap.set(p.id, { ...p }));
      this.isInitialized = true;
    }
  }

  private async syncCacheFromSQLite(): Promise<void> {
    if (!this.db) return;

    const rows = await this.db.getAllAsync<any>('SELECT * FROM songs ORDER BY added_at DESC;');
    this.songsMap.clear();

    for (const r of rows) {
      this.songsMap.set(r.id, {
        id: r.id,
        title: r.title,
        artist: r.artist,
        album: r.album,
        duration: r.duration,
        uri: r.uri,
        artwork: r.artwork,
        genre: r.genre,
        year: r.year,
        format: r.format,
        bitrate: r.bitrate,
        sampleRate: r.sample_rate,
        fileSize: r.file_size,
        isFavorite: r.is_favorite === 1,
        isDownloaded: r.is_downloaded === 1,
        addedAt: r.added_at,
        lastPlayedAt: r.last_played_at,
        playCount: r.play_count,
      });
    }

    const playlistRows = await this.db.getAllAsync<any>('SELECT * FROM playlists;');
    this.playlistsMap.clear();

    for (const p of playlistRows) {
      const songRows = await this.db.getAllAsync<{ song_id: string }>(
        'SELECT song_id FROM playlist_songs WHERE playlist_id = ? ORDER BY order_index ASC;',
        [p.id]
      );
      this.playlistsMap.set(p.id, {
        id: p.id,
        name: p.name,
        description: p.description,
        artwork: p.artwork,
        songIds: songRows.map((sr) => sr.song_id),
        songCount: songRows.length,
        createdAt: p.created_at,
        updatedAt: p.updated_at,
        isOffline: p.is_offline === 1,
      });
    }
  }

  /* ─── Songs Operations ─── */

  async getAllSongs(): Promise<Song[]> {
    await this.ensureInitialized();
    return Array.from(this.songsMap.values());
  }

  async getSongById(id: string): Promise<Song | null> {
    await this.ensureInitialized();
    return this.songsMap.get(id) ?? null;
  }

  async addSong(song: Song): Promise<void> {
    await this.ensureInitialized();
    this.songsMap.set(song.id, song);

    if (this.db) {
      try {
        await this.db.runAsync(
          `INSERT OR REPLACE INTO songs (id, title, artist, album, duration, uri, artwork, genre, year, format, bitrate, sample_rate, file_size, is_favorite, is_downloaded, added_at, last_played_at, play_count)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?);`,
          [
            song.id,
            song.title,
            song.artist,
            song.album ?? null,
            song.duration,
            song.uri,
            song.artwork ?? null,
            song.genre ?? null,
            song.year ?? null,
            song.format ?? 'mp3',
            song.bitrate ?? 320,
            song.sampleRate ?? 44100,
            song.fileSize ?? null,
            song.isFavorite ? 1 : 0,
            song.isDownloaded ? 1 : 0,
            song.addedAt,
            song.lastPlayedAt ?? null,
            song.playCount,
          ]
        );
      } catch (err) {
        console.error('[DatabaseService] Error guardando canción en SQLite:', err);
      }
    }
  }

  async deleteSong(id: string): Promise<boolean> {
    await this.ensureInitialized();
    const removed = this.songsMap.delete(id);

    if (this.db) {
      try {
        await this.db.runAsync('DELETE FROM songs WHERE id = ?;', [id]);
        await this.db.runAsync('DELETE FROM playlist_songs WHERE song_id = ?;', [id]);
      } catch (err) {
        console.error('[DatabaseService] Error borrando de SQLite:', err);
      }
    }
    return removed;
  }

  async toggleFavorite(songId: string): Promise<boolean> {
    await this.ensureInitialized();
    const song = this.songsMap.get(songId);
    if (!song) return false;

    song.isFavorite = !song.isFavorite;
    this.songsMap.set(songId, song);

    if (this.db) {
      try {
        await this.db.runAsync('UPDATE songs SET is_favorite = ? WHERE id = ?;', [
          song.isFavorite ? 1 : 0,
          songId,
        ]);
      } catch (err) {
        console.error('[DatabaseService] Error actualizando favorito en SQLite:', err);
      }
    }
    return song.isFavorite;
  }

  async recordPlay(songId: string): Promise<void> {
    await this.ensureInitialized();
    const song = this.songsMap.get(songId);
    if (song) {
      song.playCount += 1;
      song.lastPlayedAt = Date.now();
      this.songsMap.set(songId, song);

      if (this.db) {
        try {
          await this.db.runAsync(
            'UPDATE songs SET play_count = play_count + 1, last_played_at = ? WHERE id = ?;',
            [song.lastPlayedAt, songId]
          );
        } catch (_) {}
      }

      this.saveLastPlayed(songId, 0);
    }
  }

  async saveLastPlayed(songId: string, position: number): Promise<void> {
    try {
      this.settings.lastPlayedSongId = songId;
      this.settings.lastPlayedPosition = position;
      await AsyncStorage.setItem(LAST_PLAYED_KEY, JSON.stringify({ songId, position }));
    } catch (_) {}
  }

  async getLastPlayed(): Promise<{ songId: string | null; position: number }> {
    await this.ensureInitialized();
    return {
      songId: this.settings.lastPlayedSongId,
      position: this.settings.lastPlayedPosition,
    };
  }

  async getFavorites(): Promise<Song[]> {
    await this.ensureInitialized();
    return Array.from(this.songsMap.values()).filter((s) => s.isFavorite);
  }

  async getDownloadedSongs(): Promise<Song[]> {
    await this.ensureInitialized();
    return Array.from(this.songsMap.values()).filter((s) => s.isDownloaded);
  }

  async getRecentlyPlayed(): Promise<Song[]> {
    await this.ensureInitialized();
    return Array.from(this.songsMap.values())
      .filter((s) => s.lastPlayedAt)
      .sort((a, b) => (b.lastPlayedAt ?? 0) - (a.lastPlayedAt ?? 0));
  }

  /* ─── Albums & Artists ─── */

  async getAllAlbums(): Promise<Album[]> {
    await this.ensureInitialized();
    return Array.from(this.albumsMap.values());
  }

  async getAllArtists(): Promise<Artist[]> {
    await this.ensureInitialized();
    return Array.from(this.artistsMap.values());
  }

  /* ─── Playlists ─── */

  async getAllPlaylists(): Promise<Playlist[]> {
    await this.ensureInitialized();
    return Array.from(this.playlistsMap.values());
  }

  async createPlaylist(name: string, description?: string): Promise<Playlist> {
    await this.ensureInitialized();
    const newPlaylist: Playlist = {
      id: `pl_${Date.now()}`,
      name,
      description: description ?? 'Lista personalizada',
      songIds: [],
      songCount: 0,
      createdAt: Date.now(),
      updatedAt: Date.now(),
      isOffline: false,
    };

    this.playlistsMap.set(newPlaylist.id, newPlaylist);

    if (this.db) {
      try {
        await this.db.runAsync(
          'INSERT INTO playlists (id, name, description, created_at, updated_at, is_offline) VALUES (?, ?, ?, ?, ?, ?);',
          [newPlaylist.id, newPlaylist.name, newPlaylist.description ?? null, newPlaylist.createdAt, newPlaylist.updatedAt, 0]
        );
      } catch (err) {
        console.error('[DatabaseService] Error creando playlist en SQLite:', err);
      }
    }

    return newPlaylist;
  }

  async addSongToPlaylist(playlistId: string, songId: string): Promise<boolean> {
    await this.ensureInitialized();
    const playlist = this.playlistsMap.get(playlistId);
    if (!playlist) return false;

    if (!playlist.songIds.includes(songId)) {
      playlist.songIds.push(songId);
      playlist.songCount = playlist.songIds.length;
      playlist.updatedAt = Date.now();
      this.playlistsMap.set(playlistId, playlist);

      if (this.db) {
        try {
          await this.db.runAsync(
            'INSERT OR REPLACE INTO playlist_songs (playlist_id, song_id, order_index) VALUES (?, ?, ?);',
            [playlistId, songId, playlist.songIds.length - 1]
          );
        } catch (_) {}
      }
    }
    return true;
  }

  async removeSongFromPlaylist(playlistId: string, songId: string): Promise<boolean> {
    await this.ensureInitialized();
    const playlist = this.playlistsMap.get(playlistId);
    if (!playlist) return false;

    playlist.songIds = playlist.songIds.filter((id) => id !== songId);
    playlist.songCount = playlist.songIds.length;
    playlist.updatedAt = Date.now();
    this.playlistsMap.set(playlistId, playlist);

    if (this.db) {
      try {
        await this.db.runAsync(
          'DELETE FROM playlist_songs WHERE playlist_id = ? AND song_id = ?;',
          [playlistId, songId]
        );
      } catch (_) {}
    }
    return true;
  }

  /* ─── Settings ─── */

  async getSettings(): Promise<AppSettings> {
    await this.ensureInitialized();
    return { ...this.settings };
  }

  async updateSettings(newSettings: Partial<AppSettings>): Promise<AppSettings> {
    await this.ensureInitialized();
    this.settings = { ...this.settings, ...newSettings };
    await AsyncStorage.setItem(SETTINGS_KEY, JSON.stringify(this.settings));
    return { ...this.settings };
  }

  private async ensureInitialized(): Promise<void> {
    if (!this.isInitialized) {
      await this.initialize();
    }
  }
}

export default DatabaseService;
