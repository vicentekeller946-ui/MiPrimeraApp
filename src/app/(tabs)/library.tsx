import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  SafeAreaView,
  TouchableOpacity,
  Dimensions,
  TextInput,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useVicentTheme } from '@/hooks/use-theme';
import { usePlayer } from '@/context/PlayerContext';
import {
  Spacing,
  BorderRadius,
  FontSize,
  BOTTOM_TOTAL_HEIGHT,
} from '@/constants/theme';
import { formatDuration } from '@/data/demoData';
import type { Song, Album, Artist, Playlist } from '@/types/music';
import DatabaseService from '@/services/DatabaseService';
import DownloadService from '@/services/DownloadService';
import YouTubePlayerModal from '@/components/YouTubePlayerModal';
import type { YouTubeSearchResult } from '@/services/YouTubeService';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

type LibrarySection = 'songs' | 'albums' | 'artists' | 'favorites' | 'playlists';

export default function LibraryScreen() {
  const theme = useVicentTheme();
  const { playSong, state: playerState } = usePlayer();
  const [activeSection, setActiveSection] = useState<LibrarySection>('songs');
  const [filterQuery, setFilterQuery] = useState('');

  // Persisted state loaded from DatabaseService
  const [songs, setSongs] = useState<Song[]>([]);
  const [playlists, setPlaylists] = useState<Playlist[]>([]);
  const [favorites, setFavorites] = useState<Song[]>([]);
  const [albums, setAlbums] = useState<Album[]>([]);
  const [artists, setArtists] = useState<Artist[]>([]);
  const [downloadingIds, setDownloadingIds] = useState<Set<string>>(new Set());
  const [selectedYoutubeItem, setSelectedYoutubeItem] = useState<YouTubeSearchResult | null>(null);

  const handleSongPress = (song: Song, list: Song[], idx: number) => {
    if (song.id.startsWith('yt_') || song.uri.includes('youtube.com') || song.genre === 'YouTube') {
      const videoId = song.id.startsWith('yt_')
        ? song.id.replace('yt_', '')
        : (song.uri.split('v=')[1] || song.id);
      setSelectedYoutubeItem({
        id: song.id,
        videoId,
        title: song.title,
        channelTitle: song.artist,
        thumbnail: song.artwork || '',
        description: '',
        publishedAt: '',
      });
      return;
    }
    playSong(song, list, idx);
  };

  const handleDownloadSong = async (song: Song) => {
    if (song.isDownloaded) {
      Alert.alert('Ya descargada', `"${song.title}" ya está disponible sin conexión.`);
      return;
    }
    setDownloadingIds((prev) => new Set(prev).add(song.id));
    try {
      const isYt =
        song.id.startsWith('yt_') ||
        song.uri?.includes('youtube.com') ||
        song.genre === 'YouTube';

      if (isYt) {
        const videoId = song.id.startsWith('yt_')
          ? song.id.replace('yt_', '')
          : (song.uri.split('v=')[1]?.split('&')[0] || song.id);

        const downloaded = await DownloadService.getInstance().downloadYouTubeItem({
          id: videoId,
          videoId,
          title: song.title,
          channelTitle: song.artist,
          thumbnail: song.artwork,
        });
        await loadData();

        if (downloaded.isDownloaded) {
          Alert.alert(
            '¡Descarga MP3 completada!',
            `"${song.title}" se ha descargado en tu iPhone como archivo MP3.\nPuedes escucharla sin internet y con la pantalla apagada.`
          );
        } else {
          Alert.alert(
            'Guardada en Mi Música',
            `"${song.title}" está lista para reproducir.`
          );
        }
      } else {
        await DownloadService.getInstance().downloadSong(song);
        await loadData();
        Alert.alert(
          '¡Descarga completada!',
          `"${song.title}" se ha descargado y está disponible para reproducir sin internet.`
        );
      }
    } catch (e: any) {
      Alert.alert('Error al descargar', e.message || 'No se pudo descargar la canción en MP3.');
    } finally {
      setDownloadingIds((prev) => {
        const next = new Set(prev);
        next.delete(song.id);
        return next;
      });
    }
  };

  const loadData = async () => {
    const db = DatabaseService.getInstance();
    const [allSongs, allPlaylists, favs, allAlbums, allArtists] = await Promise.all([
      db.getAllSongs(),
      db.getAllPlaylists(),
      db.getFavorites(),
      db.getAllAlbums(),
      db.getAllArtists(),
    ]);

    setSongs(allSongs);
    setPlaylists(allPlaylists);
    setFavorites(favs);
    setAlbums(allAlbums);
    setArtists(allArtists);
  };

  useEffect(() => {
    loadData();
  }, [playerState.currentSong?.isFavorite]);

  const filteredSongs = songs.filter(
    (s) =>
      s.title.toLowerCase().includes(filterQuery.toLowerCase()) ||
      s.artist.toLowerCase().includes(filterQuery.toLowerCase())
  );

  const filteredFavorites = favorites.filter(
    (s) =>
      s.title.toLowerCase().includes(filterQuery.toLowerCase()) ||
      s.artist.toLowerCase().includes(filterQuery.toLowerCase())
  );

  const filteredAlbums = albums.filter(
    (al) =>
      al.title.toLowerCase().includes(filterQuery.toLowerCase()) ||
      al.artist.toLowerCase().includes(filterQuery.toLowerCase())
  );

  const filteredArtists = artists.filter((a) =>
    a.name.toLowerCase().includes(filterQuery.toLowerCase())
  );

  const filteredPlaylists = playlists.filter((p) =>
    p.name.toLowerCase().includes(filterQuery.toLowerCase())
  );

  const handleCreatePlaylist = () => {
    Alert.prompt
      ? Alert.prompt(
          'Nueva lista de reproducción',
          'Introduce un nombre para tu lista:',
          async (text) => {
            if (text && text.trim().length > 0) {
              await DatabaseService.getInstance().createPlaylist(text.trim());
              await loadData();
            }
          }
        )
      : Alert.alert('Nueva lista', 'Introduce el nombre de la lista:', [
          { text: 'Cancelar', style: 'cancel' },
          {
            text: 'Crear',
            onPress: async () => {
              await DatabaseService.getInstance().createPlaylist(`Mi Lista ${playlists.length + 1}`);
              await loadData();
            },
          },
        ]);
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={[styles.title, { color: theme.text }]}>Mi Música</Text>
        {activeSection === 'playlists' && (
          <TouchableOpacity
            onPress={handleCreatePlaylist}
            style={[styles.addBtn, { backgroundColor: theme.primary }]}>
            <Ionicons name="add" size={20} color="#FFFFFF" />
            <Text style={styles.addBtnText}>Crear lista</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Categories Horizontal Selector */}
      <View style={styles.sectionSelectorWrapper}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.sectionSelector}>
          {[
            { id: 'songs', label: 'Canciones', icon: 'musical-note' },
            { id: 'favorites', label: 'Favoritos', icon: 'heart' },
            { id: 'playlists', label: 'Playlists', icon: 'list' },
            { id: 'albums', label: 'Álbumes', icon: 'disc' },
            { id: 'artists', label: 'Artistas', icon: 'people' },
          ].map((sec) => {
            const isSelected = activeSection === sec.id;
            return (
              <TouchableOpacity
                key={sec.id}
                onPress={() => {
                  setActiveSection(sec.id as LibrarySection);
                  setFilterQuery('');
                }}
                style={[
                  styles.categoryPill,
                  {
                    backgroundColor: isSelected ? theme.primary : theme.surface,
                    borderColor: theme.border,
                  },
                ]}>
                <Ionicons
                  name={sec.icon as any}
                  size={15}
                  color={isSelected ? '#FFFFFF' : theme.textSecondary}
                />
                <Text
                  style={[
                    styles.categoryText,
                    { color: isSelected ? '#FFFFFF' : theme.textSecondary },
                  ]}>
                  {sec.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>

      {/* Mini Filter Search Bar */}
      <View style={styles.searchContainer}>
        <View style={[styles.searchBox, { backgroundColor: theme.surface, borderColor: theme.border }]}>
          <Ionicons name="filter-outline" size={16} color={theme.textMuted} />
          <TextInput
            placeholder={`Filtrar ${
              activeSection === 'songs'
                ? 'canciones'
                : activeSection === 'favorites'
                ? 'favoritos'
                : activeSection === 'playlists'
                ? 'listas'
                : activeSection === 'albums'
                ? 'álbumes'
                : 'artistas'
            }...`}
            placeholderTextColor={theme.textMuted}
            value={filterQuery}
            onChangeText={setFilterQuery}
            style={[styles.filterInput, { color: theme.text }]}
          />
          {filterQuery.length > 0 && (
            <TouchableOpacity onPress={() => setFilterQuery('')}>
              <Ionicons name="close-circle" size={16} color={theme.textMuted} />
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* Content View */}
      <ScrollView
        contentContainerStyle={[
          styles.scrollContent,
          { paddingBottom: BOTTOM_TOTAL_HEIGHT + Spacing.xl },
        ]}
        showsVerticalScrollIndicator={false}>
        {/* CANCIONES TAB */}
        {activeSection === 'songs' && (
          <View style={styles.listWrapper}>
            <View style={styles.listHeaderRow}>
              <Text style={[styles.countText, { color: theme.textMuted }]}>
                {filteredSongs.length} canciones
              </Text>
              {filteredSongs.length > 0 && (
                <TouchableOpacity
                  onPress={() => playSong(filteredSongs[0], filteredSongs, 0)}
                  style={styles.shuffleAllBtn}>
                  <Ionicons name="shuffle" size={16} color={theme.primary} />
                  <Text style={[styles.shuffleAllText, { color: theme.primary }]}>Aleatorio</Text>
                </TouchableOpacity>
              )}
            </View>

            {filteredSongs.map((song, idx) => {
              const isCurrent = playerState.currentSong?.id === song.id;
              return (
                <TouchableOpacity
                  key={song.id}
                  onPress={() => handleSongPress(song, filteredSongs, idx)}
                  style={[styles.songRow, { borderBottomColor: theme.border }]}>
                  <View style={[styles.songArtwork, { backgroundColor: theme.surfaceLight }]}>
                    <Ionicons
                      name={isCurrent && playerState.isPlaying ? 'volume-high' : 'musical-note'}
                      size={18}
                      color={isCurrent ? theme.primary : theme.textSecondary}
                    />
                  </View>
                  <View style={styles.songMetadata}>
                    <Text
                      style={[
                        styles.songTitle,
                        { color: isCurrent ? theme.primary : theme.text },
                      ]}
                      numberOfLines={1}>
                      {song.title}
                    </Text>
                    <Text style={[styles.songDetails, { color: theme.textSecondary }]} numberOfLines={1}>
                      {song.artist} • {song.album}
                    </Text>
                  </View>
                  <Text style={[styles.songDuration, { color: theme.textMuted }]}>
                    {formatDuration(song.duration)}
                  </Text>

                  {/* Botón de descargar al costado */}
                  <TouchableOpacity
                    onPress={() => handleDownloadSong(song)}
                    disabled={downloadingIds.has(song.id)}
                    style={{ padding: 6, marginRight: 6 }}
                    hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
                    {downloadingIds.has(song.id) ? (
                      <ActivityIndicator size="small" color={theme.primary} />
                    ) : song.isDownloaded ? (
                      <Ionicons name="checkmark-circle" size={20} color="#10B981" />
                    ) : (
                      <Ionicons name="arrow-down-circle-outline" size={20} color={theme.textSecondary} />
                    )}
                  </TouchableOpacity>

                  <TouchableOpacity hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
                    <Ionicons name="ellipsis-vertical" size={16} color={theme.textMuted} />
                  </TouchableOpacity>
                </TouchableOpacity>
              );
            })}
          </View>
        )}

        {/* FAVORITOS TAB */}
        {activeSection === 'favorites' && (
          <View style={styles.listWrapper}>
            <View style={styles.listHeaderRow}>
              <Text style={[styles.countText, { color: theme.textMuted }]}>
                {filteredFavorites.length} temas favoritos
              </Text>
            </View>

            {filteredFavorites.length > 0 ? (
              filteredFavorites.map((song, idx) => {
                const isCurrent = playerState.currentSong?.id === song.id;
                return (
                  <TouchableOpacity
                    key={song.id}
                    onPress={() => handleSongPress(song, filteredFavorites, idx)}
                    style={[styles.songRow, { borderBottomColor: theme.border }]}>
                    <View style={[styles.songArtwork, { backgroundColor: 'rgba(239, 68, 68, 0.15)' }]}>
                      <Ionicons name="heart" size={18} color="#EF4444" />
                    </View>
                    <View style={styles.songMetadata}>
                      <Text
                        style={[
                          styles.songTitle,
                          { color: isCurrent ? theme.primary : theme.text },
                        ]}
                        numberOfLines={1}>
                        {song.title}
                      </Text>
                      <Text style={[styles.songDetails, { color: theme.textSecondary }]} numberOfLines={1}>
                        {song.artist} • {formatDuration(song.duration)}
                      </Text>
                    </View>

                    {/* Botón de descargar al costado */}
                    <TouchableOpacity
                      onPress={() => handleDownloadSong(song)}
                      disabled={downloadingIds.has(song.id)}
                      style={{ padding: 6, marginRight: 6 }}
                      hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
                      {downloadingIds.has(song.id) ? (
                        <ActivityIndicator size="small" color={theme.primary} />
                      ) : song.isDownloaded ? (
                        <Ionicons name="checkmark-circle" size={20} color="#10B981" />
                      ) : (
                        <Ionicons name="arrow-down-circle-outline" size={20} color={theme.textSecondary} />
                      )}
                    </TouchableOpacity>

                    <Ionicons name="heart" size={18} color="#EF4444" />
                  </TouchableOpacity>
                );
              })
            ) : (
              <View style={styles.emptyContainer}>
                <Ionicons name="heart-outline" size={50} color={theme.textMuted} />
                <Text style={[styles.emptyTitle, { color: theme.text }]}>Sin favoritos</Text>
                <Text style={[styles.emptySubtitle, { color: theme.textSecondary }]}>
                  Marca canciones con el corazón en el reproductor para agregarlas aquí.
                </Text>
              </View>
            )}
          </View>
        )}

        {/* PLAYLISTS TAB */}
        {activeSection === 'playlists' && (
          <View style={styles.listWrapper}>
            {filteredPlaylists.map((pl) => (
              <TouchableOpacity
                key={pl.id}
                style={[styles.playlistRow, { backgroundColor: theme.surface, borderColor: theme.border }]}>
                <View style={[styles.playlistCover, { backgroundColor: theme.secondary }]}>
                  <Ionicons name="musical-notes" size={24} color="#FFFFFF" />
                </View>
                <View style={styles.playlistInfo}>
                  <Text style={[styles.playlistName, { color: theme.text }]}>{pl.name}</Text>
                  <Text style={[styles.playlistDesc, { color: theme.textSecondary }]} numberOfLines={1}>
                    {pl.description ?? 'Sin descripción'}
                  </Text>
                  <Text style={[styles.playlistCount, { color: theme.textMuted }]}>
                    {pl.songCount} canciones {pl.isOffline ? '• Disponible offline' : ''}
                  </Text>
                </View>
                <Ionicons name="chevron-forward" size={18} color={theme.textMuted} />
              </TouchableOpacity>
            ))}
          </View>
        )}

        {/* ALBUMES TAB */}
        {activeSection === 'albums' && (
          <View style={styles.albumsGrid}>
            {filteredAlbums.map((album) => (
              <TouchableOpacity
                key={album.id}
                style={[styles.albumGridCard, { backgroundColor: theme.surface, borderColor: theme.border }]}>
                <View style={[styles.albumGridArtwork, { backgroundColor: theme.surfaceLight }]}>
                  <Ionicons name="disc" size={48} color={theme.primary} />
                </View>
                <View style={styles.albumGridInfo}>
                  <Text style={[styles.albumGridTitle, { color: theme.text }]} numberOfLines={1}>
                    {album.title}
                  </Text>
                  <Text style={[styles.albumGridArtist, { color: theme.textSecondary }]} numberOfLines={1}>
                    {album.artist}
                  </Text>
                  <Text style={[styles.albumGridDetails, { color: theme.textMuted }]}>
                    {album.year} • {album.songCount} temas
                  </Text>
                </View>
              </TouchableOpacity>
            ))}
          </View>
        )}

        {/* ARTISTAS TAB */}
        {activeSection === 'artists' && (
          <View style={styles.listWrapper}>
            {filteredArtists.map((artist) => (
              <TouchableOpacity
                key={artist.id}
                style={[styles.artistRow, { borderBottomColor: theme.border }]}>
                <View style={[styles.artistAvatar, { backgroundColor: theme.surfaceLight }]}>
                  <Ionicons name="person" size={22} color={theme.primary} />
                </View>
                <View style={styles.artistInfo}>
                  <Text style={[styles.artistName, { color: theme.text }]}>{artist.name}</Text>
                  <Text style={[styles.artistStats, { color: theme.textSecondary }]}>
                    {artist.songCount} canciones • {artist.albumCount} álbumes
                  </Text>
                </View>
                <Ionicons name="chevron-forward" size={18} color={theme.textMuted} />
              </TouchableOpacity>
            ))}
          </View>
        )}
      </ScrollView>

      {/* Modal oficial de YouTube para reproducir canciones guardadas de YouTube */}
      <YouTubePlayerModal
        visible={selectedYoutubeItem !== null}
        item={selectedYoutubeItem}
        onClose={() => setSelectedYoutubeItem(null)}
        onDownloaded={loadData}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.xl,
    paddingTop: Spacing.md,
    paddingBottom: Spacing.xs,
  },
  title: {
    fontSize: FontSize['4xl'],
    fontWeight: '800',
    letterSpacing: -0.5,
  },
  addBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.md,
    paddingVertical: 6,
    borderRadius: BorderRadius.full,
    gap: 4,
  },
  addBtnText: {
    color: '#FFFFFF',
    fontSize: FontSize.xs,
    fontWeight: '700',
  },
  sectionSelectorWrapper: {
    paddingVertical: Spacing.sm,
  },
  sectionSelector: {
    paddingHorizontal: Spacing.xl,
    gap: Spacing.sm,
  },
  categoryPill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.md,
    paddingVertical: 8,
    borderRadius: BorderRadius.full,
    borderWidth: 1,
    gap: 6,
  },
  categoryText: {
    fontSize: FontSize.xs,
    fontWeight: '600',
  },
  searchContainer: {
    paddingHorizontal: Spacing.xl,
    paddingVertical: Spacing.xs,
  },
  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.md,
    height: 38,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    gap: Spacing.sm,
  },
  filterInput: {
    flex: 1,
    fontSize: FontSize.sm,
    paddingVertical: 0,
  },
  scrollContent: {
    paddingTop: Spacing.md,
  },
  listWrapper: {
    paddingHorizontal: Spacing.xl,
  },
  listHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: Spacing.md,
  },
  countText: {
    fontSize: FontSize.xs,
    fontWeight: '600',
  },
  shuffleAllBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  shuffleAllText: {
    fontSize: FontSize.xs,
    fontWeight: '700',
  },
  songRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: Spacing.md,
    borderBottomWidth: 0.5,
    gap: Spacing.md,
  },
  songArtwork: {
    width: 42,
    height: 42,
    borderRadius: BorderRadius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  songMetadata: {
    flex: 1,
  },
  songTitle: {
    fontSize: FontSize.md,
    fontWeight: '600',
  },
  songDetails: {
    fontSize: FontSize.xs,
    marginTop: 2,
  },
  songDuration: {
    fontSize: FontSize.xs,
    marginRight: Spacing.xs,
  },
  playlistRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: Spacing.md,
    borderRadius: BorderRadius.xl,
    borderWidth: 1,
    marginBottom: Spacing.md,
    gap: Spacing.md,
  },
  playlistCover: {
    width: 52,
    height: 52,
    borderRadius: BorderRadius.lg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  playlistInfo: {
    flex: 1,
  },
  playlistName: {
    fontSize: FontSize.md,
    fontWeight: '700',
  },
  playlistDesc: {
    fontSize: FontSize.xs,
    marginTop: 2,
  },
  playlistCount: {
    fontSize: 10,
    marginTop: 4,
  },
  albumsGrid: {
    paddingHorizontal: Spacing.xl,
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.md,
    justifyContent: 'space-between',
  },
  albumGridCard: {
    width: (SCREEN_WIDTH - Spacing.xl * 2 - Spacing.md) / 2,
    borderRadius: BorderRadius.xl,
    borderWidth: 1,
    overflow: 'hidden',
    marginBottom: Spacing.sm,
  },
  albumGridArtwork: {
    width: '100%',
    aspectRatio: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  albumGridInfo: {
    padding: Spacing.md,
  },
  albumGridTitle: {
    fontSize: FontSize.sm,
    fontWeight: '700',
  },
  albumGridArtist: {
    fontSize: FontSize.xs,
    marginTop: 2,
  },
  albumGridDetails: {
    fontSize: 10,
    marginTop: 4,
  },
  artistRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: Spacing.md,
    borderBottomWidth: 0.5,
    gap: Spacing.md,
  },
  artistAvatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  artistInfo: {
    flex: 1,
  },
  artistName: {
    fontSize: FontSize.md,
    fontWeight: '600',
  },
  artistStats: {
    fontSize: FontSize.xs,
    marginTop: 2,
  },
  emptyContainer: {
    alignItems: 'center',
    paddingVertical: Spacing['5xl'],
    gap: Spacing.md,
  },
  emptyTitle: {
    fontSize: FontSize.lg,
    fontWeight: '700',
  },
  emptySubtitle: {
    fontSize: FontSize.xs,
    textAlign: 'center',
  },
});
