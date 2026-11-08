import React, { useState } from 'react';
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
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import DatabaseService from '@/services/DatabaseService';
import DownloadService from '@/services/DownloadService';
import { useVicentTheme } from '@/hooks/use-theme';
import { usePlayer } from '@/context/PlayerContext';
import {
  Spacing,
  BorderRadius,
  FontSize,
  BOTTOM_TOTAL_HEIGHT,
} from '@/constants/theme';
import {
  demoAlbums,
  demoArtists,
  demoGenres,
  demoPlaylists,
  demoSongs,
  getGreeting,
  getRecentlyPlayed,
  formatDuration,
} from '@/data/demoData';
import type { Song, Album, Artist, Genre, Playlist } from '@/types/music';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

/* ─── Sub-components ─── */

function SectionHeader({ title, theme }: { title: string; theme: ReturnType<typeof useVicentTheme> }) {
  return (
    <View style={styles.sectionHeader}>
      <Text style={[styles.sectionTitle, { color: theme.text }]}>{title}</Text>
      <TouchableOpacity>
        <Text style={[styles.seeAll, { color: theme.primary }]}>Ver todo</Text>
      </TouchableOpacity>
    </View>
  );
}

function SearchBar({ theme, onPress }: { theme: ReturnType<typeof useVicentTheme>; onPress?: () => void }) {
  return (
    <TouchableOpacity
      activeOpacity={0.8}
      onPress={onPress}
      style={[styles.searchBar, { backgroundColor: theme.surface, borderColor: theme.border }]}>
      <Ionicons name="search" size={18} color={theme.textMuted} />
      <TextInput
        placeholder="Buscar canciones, YouTube, artistas..."
        placeholderTextColor={theme.textMuted}
        style={[styles.searchInput, { color: theme.text }]}
        editable={false}
        pointerEvents="none"
      />
      <Ionicons name="mic-outline" size={18} color={theme.textMuted} />
    </TouchableOpacity>
  );
}

function RecentSongCard({
  song,
  theme,
  onPress,
  onDownload,
}: {
  song: Song;
  theme: ReturnType<typeof useVicentTheme>;
  onPress: () => void;
  onDownload: () => void;
}) {
  return (
    <TouchableOpacity
      style={[styles.recentCard, { backgroundColor: theme.cardBg }]}
      onPress={onPress}
      activeOpacity={0.7}>
      <View style={[styles.recentArtwork, { backgroundColor: theme.surfaceLight }]}>
        <Ionicons name="musical-note" size={28} color={theme.primary} />
      </View>
      <Text style={[styles.recentTitle, { color: theme.text }]} numberOfLines={1}>
        {song.title}
      </Text>
      <Text style={[styles.recentArtist, { color: theme.textSecondary }]} numberOfLines={1}>
        {song.artist}
      </Text>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 4 }}>
        <Text style={[styles.recentDuration, { color: theme.textMuted }]}>
          {formatDuration(song.duration)}
        </Text>
        <TouchableOpacity
          onPress={(e) => {
            e.stopPropagation?.();
            onDownload();
          }}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
          {song.isDownloaded ? (
            <Ionicons name="checkmark-circle" size={18} color="#10B981" />
          ) : (
            <Ionicons name="arrow-down-circle-outline" size={18} color={theme.textMuted} />
          )}
        </TouchableOpacity>
      </View>
    </TouchableOpacity>
  );
}

function AlbumCard({ album, theme }: { album: Album; theme: ReturnType<typeof useVicentTheme> }) {
  return (
    <TouchableOpacity
      style={[styles.albumCard]}
      activeOpacity={0.7}>
      <View style={[styles.albumArtwork, { backgroundColor: theme.surfaceLight }]}>
        <Ionicons name="disc" size={36} color={theme.secondary} />
      </View>
      <Text style={[styles.albumTitle, { color: theme.text }]} numberOfLines={1}>
        {album.title}
      </Text>
      <Text style={[styles.albumArtist, { color: theme.textSecondary }]} numberOfLines={1}>
        {album.artist}
      </Text>
    </TouchableOpacity>
  );
}

function ArtistCard({ artist, theme }: { artist: Artist; theme: ReturnType<typeof useVicentTheme> }) {
  return (
    <TouchableOpacity style={styles.artistCard} activeOpacity={0.7}>
      <View style={[styles.artistAvatar, { backgroundColor: theme.surfaceLight }]}>
        <Ionicons name="person" size={28} color={theme.accent} />
      </View>
      <Text style={[styles.artistName, { color: theme.text }]} numberOfLines={1}>
        {artist.name}
      </Text>
      <Text style={[styles.artistSongs, { color: theme.textMuted }]}>
        {artist.songCount} canciones
      </Text>
    </TouchableOpacity>
  );
}

function GenreCard({ genre, theme }: { genre: Genre; theme: ReturnType<typeof useVicentTheme> }) {
  return (
    <TouchableOpacity
      style={[styles.genreCard, { backgroundColor: genre.color + '20', borderColor: genre.color + '40' }]}
      activeOpacity={0.7}>
      <Text style={styles.genreIcon}>{genre.icon}</Text>
      <Text style={[styles.genreName, { color: genre.color }]}>{genre.name}</Text>
      <Text style={[styles.genreCount, { color: theme.textMuted }]}>
        {genre.songCount} canciones
      </Text>
    </TouchableOpacity>
  );
}

function PlaylistCard({
  playlist,
  theme,
}: {
  playlist: Playlist;
  theme: ReturnType<typeof useVicentTheme>;
}) {
  return (
    <TouchableOpacity
      style={[styles.playlistCard, { backgroundColor: theme.cardBg }]}
      activeOpacity={0.7}>
      <View style={[styles.playlistArtwork, { backgroundColor: theme.surfaceHighlight }]}>
        <Ionicons name="list" size={28} color={theme.primaryLight} />
      </View>
      <Text style={[styles.playlistTitle, { color: theme.text }]} numberOfLines={1}>
        {playlist.name}
      </Text>
      <Text style={[styles.playlistCount, { color: theme.textSecondary }]}>
        {playlist.songCount} canciones
      </Text>
    </TouchableOpacity>
  );
}

/* ─── Main Screen ─── */

export default function HomeScreen() {
  const theme = useVicentTheme();
  const router = useRouter();
  const { playSong, state: playerState } = usePlayer();
  const [recentlyPlayed, setRecentlyPlayed] = useState<Song[]>(getRecentlyPlayed());

  const loadRecents = async () => {
    const rec = await DatabaseService.getInstance().getRecentlyPlayed();
    if (rec.length > 0) {
      setRecentlyPlayed(rec);
    }
  };

  React.useEffect(() => {
    loadRecents();
  }, [playerState.currentSong]);

  const handleDownloadSong = async (song: Song) => {
    if (song.isDownloaded) {
      Alert.alert('Ya descargada', `"${song.title}" ya está disponible sin conexión.`);
      return;
    }
    try {
      await DownloadService.getInstance().downloadSong(song);
      await loadRecents();
      Alert.alert('¡Descargada!', `"${song.title}" se ha guardado en tu dispositivo.`);
    } catch (e: any) {
      Alert.alert('Error', e.message || 'No se pudo descargar la canción.');
    }
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]}>
      <ScrollView
        contentContainerStyle={[
          styles.scrollContent,
          { paddingBottom: BOTTOM_TOTAL_HEIGHT + 20 },
        ]}
        showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View style={styles.header}>
          <View>
            <Text style={[styles.greeting, { color: theme.text }]}>{getGreeting()} 👋</Text>
            <Text style={[styles.subtitle, { color: theme.textSecondary }]}>
              Bienvenido a VicentMusic
            </Text>
          </View>
          <TouchableOpacity
            style={[styles.notifButton, { backgroundColor: theme.surface }]}>
            <Ionicons name="notifications-outline" size={22} color={theme.text} />
          </TouchableOpacity>
        </View>

        {/* Search Bar */}
        <SearchBar theme={theme} onPress={() => router.navigate('/(tabs)/explore')} />

        {/* Continuar escuchando */}
        {recentlyPlayed.length > 0 && (
          <View style={styles.section}>
            <SectionHeader title="Continuar escuchando" theme={theme} />
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.horizontalList}>
              {recentlyPlayed.map((song: Song) => (
                <RecentSongCard
                  key={song.id}
                  song={song}
                  theme={theme}
                  onPress={() => playSong(song, recentlyPlayed, recentlyPlayed.indexOf(song))}
                  onDownload={() => handleDownloadSong(song)}
                />
              ))}
            </ScrollView>
          </View>
        )}

        {/* Álbumes destacados */}
        <View style={styles.section}>
          <SectionHeader title="Álbumes destacados" theme={theme} />
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.horizontalList}>
            {demoAlbums.map((album) => (
              <AlbumCard key={album.id} album={album} theme={theme} />
            ))}
          </ScrollView>
        </View>

        {/* Artistas */}
        <View style={styles.section}>
          <SectionHeader title="Artistas" theme={theme} />
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.horizontalList}>
            {demoArtists.map((artist) => (
              <ArtistCard key={artist.id} artist={artist} theme={theme} />
            ))}
          </ScrollView>
        </View>

        {/* Géneros */}
        <View style={styles.section}>
          <SectionHeader title="Géneros" theme={theme} />
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.horizontalList}>
            {demoGenres.map((genre) => (
              <GenreCard key={genre.id} genre={genre} theme={theme} />
            ))}
          </ScrollView>
        </View>

        {/* Listas de reproducción */}
        <View style={styles.section}>
          <SectionHeader title="Listas de reproducción" theme={theme} />
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.horizontalList}>
            {demoPlaylists.map((playlist) => (
              <PlaylistCard key={playlist.id} playlist={playlist} theme={theme} />
            ))}
          </ScrollView>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

/* ─── Styles ─── */

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {
    paddingTop: Spacing.xl,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: Spacing['3xl'],
    marginBottom: Spacing['2xl'],
  },
  greeting: {
    fontSize: FontSize['3xl'],
    fontWeight: '700',
    letterSpacing: -0.5,
  },
  subtitle: {
    fontSize: FontSize.md,
    marginTop: Spacing.xs,
  },
  notifButton: {
    width: 42,
    height: 42,
    borderRadius: BorderRadius.full,
    justifyContent: 'center',
    alignItems: 'center',
  },

  // Search
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: Spacing['3xl'],
    marginBottom: Spacing['3xl'],
    paddingHorizontal: Spacing.xl,
    paddingVertical: Spacing.lg,
    borderRadius: BorderRadius.xl,
    borderWidth: 1,
    gap: Spacing.lg,
  },
  searchInput: {
    flex: 1,
    fontSize: FontSize.md,
    padding: 0,
  },

  // Sections
  section: {
    marginBottom: Spacing['3xl'],
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: Spacing['3xl'],
    marginBottom: Spacing.xl,
  },
  sectionTitle: {
    fontSize: FontSize.xl,
    fontWeight: '700',
    letterSpacing: -0.3,
  },
  seeAll: {
    fontSize: FontSize.sm,
    fontWeight: '600',
  },
  horizontalList: {
    paddingHorizontal: Spacing['3xl'],
    gap: Spacing.lg,
  },

  // Recent Song Card
  recentCard: {
    width: 130,
    borderRadius: BorderRadius.lg,
    overflow: 'hidden',
  },
  recentArtwork: {
    width: 130,
    height: 130,
    justifyContent: 'center',
    alignItems: 'center',
    borderTopLeftRadius: BorderRadius.lg,
    borderTopRightRadius: BorderRadius.lg,
  },
  recentTitle: {
    fontSize: FontSize.sm,
    fontWeight: '600',
    marginTop: Spacing.md,
    paddingHorizontal: Spacing.md,
  },
  recentArtist: {
    fontSize: FontSize.xs,
    marginTop: Spacing.xs,
    paddingHorizontal: Spacing.md,
  },
  recentDuration: {
    fontSize: FontSize.xs,
    marginTop: Spacing.xs,
    paddingHorizontal: Spacing.md,
    paddingBottom: Spacing.md,
  },

  // Album Card
  albumCard: {
    width: 150,
  },
  albumArtwork: {
    width: 150,
    height: 150,
    borderRadius: BorderRadius.lg,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: Spacing.md,
  },
  albumTitle: {
    fontSize: FontSize.md,
    fontWeight: '600',
  },
  albumArtist: {
    fontSize: FontSize.sm,
    marginTop: Spacing.xs,
  },

  // Artist Card
  artistCard: {
    alignItems: 'center',
    width: 100,
  },
  artistAvatar: {
    width: 80,
    height: 80,
    borderRadius: BorderRadius.full,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: Spacing.md,
  },
  artistName: {
    fontSize: FontSize.sm,
    fontWeight: '600',
    textAlign: 'center',
  },
  artistSongs: {
    fontSize: FontSize.xs,
    marginTop: Spacing.xs,
    textAlign: 'center',
  },

  // Genre Card
  genreCard: {
    width: 120,
    paddingVertical: Spacing.xl,
    paddingHorizontal: Spacing.lg,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    alignItems: 'center',
  },
  genreIcon: {
    fontSize: 28,
    marginBottom: Spacing.md,
  },
  genreName: {
    fontSize: FontSize.md,
    fontWeight: '700',
  },
  genreCount: {
    fontSize: FontSize.xs,
    marginTop: Spacing.sm,
  },

  // Playlist Card
  playlistCard: {
    width: 150,
    borderRadius: BorderRadius.lg,
    overflow: 'hidden',
  },
  playlistArtwork: {
    width: 150,
    height: 100,
    justifyContent: 'center',
    alignItems: 'center',
  },
  playlistTitle: {
    fontSize: FontSize.md,
    fontWeight: '600',
    marginTop: Spacing.md,
    paddingHorizontal: Spacing.md,
  },
  playlistCount: {
    fontSize: FontSize.sm,
    marginTop: Spacing.xs,
    paddingHorizontal: Spacing.md,
    paddingBottom: Spacing.lg,
  },
});
