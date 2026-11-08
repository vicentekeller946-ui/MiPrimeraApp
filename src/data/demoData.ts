/**
 * VicentMusic — Demo Data (Public Domain / Placeholder)
 *
 * This data is for UI demonstration only. No real audio files are referenced.
 * Real playback is implemented in Phase 3.
 */

import type { Song, Album, Artist, Genre, Playlist } from '@/types/music';

/* ─── Artists ─── */
export const demoArtists: Artist[] = [
  { id: 'a1', name: 'Luna Nocturna', artwork: undefined, songCount: 4, albumCount: 1 },
  { id: 'a2', name: 'Cosmic Waves', artwork: undefined, songCount: 3, albumCount: 1 },
  { id: 'a3', name: 'Electric Dreams', artwork: undefined, songCount: 3, albumCount: 1 },
  { id: 'a4', name: 'Neon Pulse', artwork: undefined, songCount: 3, albumCount: 1 },
  { id: 'a5', name: 'Aurora Sound', artwork: undefined, songCount: 2, albumCount: 1 },
  { id: 'a6', name: 'Midnight Echo', artwork: undefined, songCount: 2, albumCount: 1 },
];

/* ─── Albums ─── */
export const demoAlbums: Album[] = [
  { id: 'al1', title: 'Noches Infinitas', artist: 'Luna Nocturna', artistId: 'a1', year: 2024, genre: 'Ambient', songCount: 4, totalDuration: 960 },
  { id: 'al2', title: 'Stellar Journey', artist: 'Cosmic Waves', artistId: 'a2', year: 2024, genre: 'Electronic', songCount: 3, totalDuration: 720 },
  { id: 'al3', title: 'Neon City', artist: 'Electric Dreams', artistId: 'a3', year: 2023, genre: 'Synthwave', songCount: 3, totalDuration: 660 },
  { id: 'al4', title: 'Digital Horizons', artist: 'Neon Pulse', artistId: 'a4', year: 2024, genre: 'Electro', songCount: 3, totalDuration: 780 },
  { id: 'al5', title: 'Dawn Light', artist: 'Aurora Sound', artistId: 'a5', year: 2023, genre: 'Chillout', songCount: 2, totalDuration: 540 },
  { id: 'al6', title: 'Shadows', artist: 'Midnight Echo', artistId: 'a6', year: 2024, genre: 'Lo-fi', songCount: 2, totalDuration: 480 },
];

/* ─── Songs ─── */
export const demoSongs: Song[] = [
  // Luna Nocturna — Noches Infinitas
  { id: 's1', title: 'Cielo Estrellado', artist: 'Luna Nocturna', artistId: 'a1', album: 'Noches Infinitas', albumId: 'al1', duration: 242, uri: 'asset://vicent_test_song.mp3', genre: 'Ambient', year: 2024, trackNumber: 1, format: 'mp3', bitrate: 320, sampleRate: 44100, isFavorite: true, isDownloaded: true, addedAt: Date.now() - 86400000 * 7, playCount: 12, lastPlayedAt: Date.now() - 3600000 },
  { id: 's2', title: 'Luna Llena', artist: 'Luna Nocturna', artistId: 'a1', album: 'Noches Infinitas', albumId: 'al1', duration: 20, uri: 'asset://ambient_electronic.mp3', genre: 'Ambient', year: 2024, trackNumber: 2, format: 'mp3', bitrate: 320, sampleRate: 44100, isFavorite: false, isDownloaded: true, addedAt: Date.now() - 86400000 * 7, playCount: 5 },
  { id: 's3', title: 'Susurros Nocturnos', artist: 'Luna Nocturna', artistId: 'a1', album: 'Noches Infinitas', albumId: 'al1', duration: 242, uri: 'https://upload.wikimedia.org/wikipedia/commons/6/63/Clair_de_Lune_-_Wright_Brass_-_United_States_Air_Force_Band_of_Flight.mp3', genre: 'Ambient', year: 2024, trackNumber: 3, format: 'mp3', bitrate: 320, sampleRate: 44100, isFavorite: true, isDownloaded: false, addedAt: Date.now() - 86400000 * 6, playCount: 8 },
  { id: 's4', title: 'Amanecer Silente', artist: 'Luna Nocturna', artistId: 'a1', album: 'Noches Infinitas', albumId: 'al1', duration: 20, uri: 'https://upload.wikimedia.org/wikipedia/commons/5/50/Hypnotic_ambient_electronic_music_by_MusicLM.mp3', genre: 'Ambient', year: 2024, trackNumber: 4, format: 'mp3', bitrate: 320, sampleRate: 44100, isFavorite: false, isDownloaded: false, addedAt: Date.now() - 86400000 * 5, playCount: 3 },

  // Cosmic Waves — Stellar Journey
  { id: 's5', title: 'Nebula', artist: 'Cosmic Waves', artistId: 'a2', album: 'Stellar Journey', albumId: 'al2', duration: 372, uri: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3', genre: 'Electronic', year: 2024, trackNumber: 1, format: 'mp3', bitrate: 256, sampleRate: 44100, isFavorite: true, isDownloaded: false, addedAt: Date.now() - 86400000 * 4, playCount: 15 },
  { id: 's6', title: 'Orbit', artist: 'Cosmic Waves', artistId: 'a2', album: 'Stellar Journey', albumId: 'al2', duration: 423, uri: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-2.mp3', genre: 'Electronic', year: 2024, trackNumber: 2, format: 'mp3', bitrate: 256, sampleRate: 44100, isFavorite: false, isDownloaded: false, addedAt: Date.now() - 86400000 * 4, playCount: 7 },
  { id: 's7', title: 'Supernova', artist: 'Cosmic Waves', artistId: 'a2', album: 'Stellar Journey', albumId: 'al2', duration: 345, uri: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-3.mp3', genre: 'Electronic', year: 2024, trackNumber: 3, format: 'mp3', bitrate: 256, sampleRate: 44100, isFavorite: false, isDownloaded: false, addedAt: Date.now() - 86400000 * 3, playCount: 2 },

  // Electric Dreams — Neon City
  { id: 's8', title: 'City Lights', artist: 'Electric Dreams', artistId: 'a3', album: 'Neon City', albumId: 'al3', duration: 325, uri: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-8.mp3', genre: 'Synthwave', year: 2023, trackNumber: 1, format: 'mp3', bitrate: 320, sampleRate: 44100, isFavorite: true, isDownloaded: false, addedAt: Date.now() - 86400000 * 10, playCount: 20, lastPlayedAt: Date.now() - 7200000 },
  { id: 's9', title: 'Midnight Drive', artist: 'Electric Dreams', artistId: 'a3', album: 'Neon City', albumId: 'al3', duration: 350, uri: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-9.mp3', genre: 'Synthwave', year: 2023, trackNumber: 2, format: 'mp3', bitrate: 320, sampleRate: 44100, isFavorite: false, isDownloaded: false, addedAt: Date.now() - 86400000 * 10, playCount: 11 },
  { id: 's10', title: 'Retrowave', artist: 'Electric Dreams', artistId: 'a3', album: 'Neon City', albumId: 'al3', duration: 310, uri: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-10.mp3', genre: 'Synthwave', year: 2023, trackNumber: 3, format: 'mp3', bitrate: 320, sampleRate: 44100, isFavorite: false, isDownloaded: false, addedAt: Date.now() - 86400000 * 9, playCount: 6 },

  // Neon Pulse — Digital Horizons
  { id: 's11', title: 'Pulse Wave', artist: 'Neon Pulse', artistId: 'a4', album: 'Digital Horizons', albumId: 'al4', duration: 280, uri: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-11.mp3', genre: 'Electro', year: 2024, trackNumber: 1, format: 'mp3', bitrate: 320, sampleRate: 44100, isFavorite: false, isDownloaded: false, addedAt: Date.now() - 86400000 * 2, playCount: 4 },
  { id: 's12', title: 'Binary Sunset', artist: 'Neon Pulse', artistId: 'a4', album: 'Digital Horizons', albumId: 'al4', duration: 290, uri: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-12.mp3', genre: 'Electro', year: 2024, trackNumber: 2, format: 'mp3', bitrate: 320, sampleRate: 44100, isFavorite: true, isDownloaded: false, addedAt: Date.now() - 86400000 * 2, playCount: 9 },
  { id: 's13', title: 'Cyber Rain', artist: 'Neon Pulse', artistId: 'a4', album: 'Digital Horizons', albumId: 'al4', duration: 315, uri: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-13.mp3', genre: 'Electro', year: 2024, trackNumber: 3, format: 'mp3', bitrate: 256, sampleRate: 44100, isFavorite: false, isDownloaded: false, addedAt: Date.now() - 86400000, playCount: 1 },

  // Aurora Sound — Dawn Light
  { id: 's14', title: 'First Light', artist: 'Aurora Sound', artistId: 'a5', album: 'Dawn Light', albumId: 'al5', duration: 330, uri: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-14.mp3', genre: 'Chillout', year: 2023, trackNumber: 1, format: 'mp3', bitrate: 320, sampleRate: 44100, isFavorite: true, isDownloaded: false, addedAt: Date.now() - 86400000 * 14, playCount: 18 },
  { id: 's15', title: 'Golden Hour', artist: 'Aurora Sound', artistId: 'a5', album: 'Dawn Light', albumId: 'al5', duration: 295, uri: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-15.mp3', genre: 'Chillout', year: 2023, trackNumber: 2, format: 'mp3', bitrate: 320, sampleRate: 44100, isFavorite: false, isDownloaded: false, addedAt: Date.now() - 86400000 * 14, playCount: 10 },

  // Midnight Echo — Shadows
  { id: 's16', title: 'Echo Chamber', artist: 'Midnight Echo', artistId: 'a6', album: 'Shadows', albumId: 'al6', duration: 305, uri: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-16.mp3', genre: 'Lo-fi', year: 2024, trackNumber: 1, format: 'mp3', bitrate: 256, sampleRate: 44100, isFavorite: false, isDownloaded: false, addedAt: Date.now() - 86400000 * 3, playCount: 6 },
  { id: 's17', title: 'Fade to Black', artist: 'Midnight Echo', artistId: 'a6', album: 'Shadows', albumId: 'al6', duration: 320, uri: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-17.mp3', genre: 'Lo-fi', year: 2024, trackNumber: 2, format: 'mp3', bitrate: 320, sampleRate: 44100, isFavorite: true, isDownloaded: false, addedAt: Date.now() - 86400000 * 3, playCount: 3 },
];

/* ─── Genres ─── */
export const demoGenres: Genre[] = [
  { id: 'g1', name: 'Ambient', color: '#4F7FFF', icon: '🌊', songCount: 4 },
  { id: 'g2', name: 'Electronic', color: '#8B5CF6', icon: '⚡', songCount: 3 },
  { id: 'g3', name: 'Synthwave', color: '#EC4899', icon: '🌆', songCount: 3 },
  { id: 'g4', name: 'Electro', color: '#06B6D4', icon: '🔌', songCount: 3 },
  { id: 'g5', name: 'Chillout', color: '#10B981', icon: '🌅', songCount: 2 },
  { id: 'g6', name: 'Lo-fi', color: '#F59E0B', icon: '🎧', songCount: 2 },
  { id: 'g7', name: 'Rock', color: '#EF4444', icon: '🎸', songCount: 0 },
  { id: 'g8', name: 'Jazz', color: '#A78BFA', icon: '🎷', songCount: 0 },
];

/* ─── Playlists ─── */
export const demoPlaylists: Playlist[] = [
  {
    id: 'p1',
    name: 'Favoritas',
    description: 'Mis canciones favoritas',
    songIds: ['s1', 's3', 's5', 's8', 's12', 's14', 's17'],
    songCount: 7,
    createdAt: Date.now() - 86400000 * 30,
    updatedAt: Date.now() - 86400000,
    isOffline: true,
  },
  {
    id: 'p2',
    name: 'Para Relajarse',
    description: 'Música chill para cualquier momento',
    songIds: ['s1', 's2', 's14', 's15', 's16'],
    songCount: 5,
    createdAt: Date.now() - 86400000 * 20,
    updatedAt: Date.now() - 86400000 * 5,
    isOffline: false,
  },
  {
    id: 'p3',
    name: 'Energía Nocturna',
    description: 'Beats para la noche',
    songIds: ['s5', 's8', 's9', 's11', 's13'],
    songCount: 5,
    createdAt: Date.now() - 86400000 * 15,
    updatedAt: Date.now() - 86400000 * 2,
    isOffline: true,
  },
  {
    id: 'p4',
    name: 'Descubrimientos',
    description: 'Nuevas canciones por explorar',
    songIds: ['s7', 's10', 's13', 's17'],
    songCount: 4,
    createdAt: Date.now() - 86400000 * 7,
    updatedAt: Date.now() - 86400000 * 3,
    isOffline: false,
  },
];

/* ─── Helpers ─── */
export function formatDuration(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}

export function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`;
}

export function getGreeting(): string {
  const hour = new Date().getHours();
  if (hour < 6) return 'Buenas noches';
  if (hour < 12) return 'Buenos días';
  if (hour < 18) return 'Buenas tardes';
  return 'Buenas noches';
}

export function getRecentlyPlayed(): Song[] {
  return [...demoSongs]
    .filter((s) => s.lastPlayedAt)
    .sort((a, b) => (b.lastPlayedAt ?? 0) - (a.lastPlayedAt ?? 0));
}

export function getFavoriteSongs(): Song[] {
  return demoSongs.filter((s) => s.isFavorite);
}

export function getDownloadedSongs(): Song[] {
  return demoSongs.filter((s) => s.isDownloaded);
}

