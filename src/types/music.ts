// VicentMusic — Core Type Definitions

export interface Song {
  id: string;
  title: string;
  artist: string;
  artistId?: string;
  album?: string;
  albumId?: string;
  duration: number; // seconds
  uri: string; // local file path
  artwork?: string; // local artwork path or URI
  genre?: string;
  year?: number;
  trackNumber?: number;
  bitrate?: number;
  sampleRate?: number;
  format?: string;
  fileSize?: number; // bytes
  isFavorite: boolean;
  isDownloaded: boolean;
  addedAt: number; // timestamp ms
  lastPlayedAt?: number;
  playCount: number;
}

export interface Album {
  id: string;
  title: string;
  artist: string;
  artistId?: string;
  artwork?: string;
  year?: number;
  genre?: string;
  songCount: number;
  totalDuration: number;
}

export interface Artist {
  id: string;
  name: string;
  artwork?: string;
  songCount: number;
  albumCount: number;
}

export interface Playlist {
  id: string;
  name: string;
  description?: string;
  artwork?: string;
  songIds: string[];
  songCount: number;
  createdAt: number;
  updatedAt: number;
  isOffline: boolean;
}

export interface Genre {
  id: string;
  name: string;
  color: string;
  icon: string;
  songCount: number;
}

export interface Download {
  id: string;
  songId?: string;
  url: string;
  fileName: string;
  progress: number; // 0-1
  speed?: number; // bytes/sec
  fileSize?: number;
  downloadedSize?: number;
  status: DownloadStatus;
  startedAt: number;
  completedAt?: number;
  error?: string;
}

export type DownloadStatus =
  | 'pending'
  | 'downloading'
  | 'paused'
  | 'completed'
  | 'failed'
  | 'cancelled';

export type RepeatMode = 'off' | 'all' | 'one';
export type ShuffleMode = 'off' | 'on';

export interface PlayerState {
  currentSong: Song | null;
  queue: Song[];
  queueIndex: number;
  isPlaying: boolean;
  position: number; // seconds
  duration: number; // seconds
  volume: number; // 0-1
  repeatMode: RepeatMode;
  shuffleMode: ShuffleMode;
  isBuffering: boolean;
}

export interface EqualizerPreset {
  id: string;
  name: string;
  gains: number[]; // dB values per band
}

export interface AppSettings {
  theme: 'dark' | 'light' | 'system';
  crossfadeEnabled: boolean;
  crossfadeDuration: number;
  downloadQuality: 'low' | 'medium' | 'high';
  downloadOverWifiOnly: boolean;
  sleepTimerMinutes: number | null;
  equalizerPreset: string | null;
  lastPlayedSongId: string | null;
  lastPlayedPosition: number;
}

export interface SearchResult {
  songs: Song[];
  albums: Album[];
  artists: Artist[];
  playlists: Playlist[];
}

export interface RecentSearch {
  id: string;
  query: string;
  timestamp: number;
}

