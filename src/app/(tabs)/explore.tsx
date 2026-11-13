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
  Image,
  ActivityIndicator,
  Modal,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import NetInfo from '@react-native-community/netinfo';
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
  demoSongs,
  formatDuration,
} from '@/data/demoData';
import type { Song, Album, Artist, Genre } from '@/types/music';
import YouTubeService, { YouTubeSearchResult } from '@/services/YouTubeService';
import YouTubePlayerModal from '@/components/YouTubePlayerModal';
import DownloadService from '@/services/DownloadService';
import DatabaseService from '@/services/DatabaseService';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

const RECENT_SEARCHES = ['Ambient', 'Electric Dreams', 'Synthwave', 'Lo-fi', 'Noches Infinitas'];

type FilterType = 'all' | 'songs' | 'artists' | 'albums' | 'youtube';

export default function ExploreScreen() {
  const theme = useVicentTheme();
  const router = useRouter();
  const { playSong } = usePlayer();
  const [searchQuery, setSearchQuery] = useState('');
  const [activeFilter, setActiveFilter] = useState<FilterType>('all');
  const [isConnected, setIsConnected] = useState<boolean | null>(true);

  // YouTube search results
  const [youtubeResults, setYoutubeResults] = useState<YouTubeSearchResult[]>([]);
  const [isLoadingYoutube, setIsLoadingYoutube] = useState(false);
  const [hasApiKey, setHasApiKey] = useState(true);
  const [youtubeError, setYoutubeError] = useState<string | null>(null);
  const [apiKeyModalVisible, setApiKeyModalVisible] = useState(false);
  const [apiKeyInput, setApiKeyInput] = useState('');
  const [selectedYoutubeItem, setSelectedYoutubeItem] = useState<YouTubeSearchResult | null>(null);
  const [downloadingIds, setDownloadingIds] = useState<Set<string>>(new Set());
  const [downloadedIds, setDownloadedIds] = useState<Set<string>>(new Set());

  // Cargar canciones ya descargadas
  const refreshDownloaded = async () => {
    try {
      const downloadedSongs = await DatabaseService.getInstance().getDownloadedSongs();
      const ids = new Set<string>();
      downloadedSongs.forEach((s) => {
        ids.add(s.id);
        if (s.id.startsWith('yt_')) {
          ids.add(s.id.replace('yt_', ''));
        }
      });
      setDownloadedIds(ids);
    } catch (_) {}
  };

  useEffect(() => {
    refreshDownloaded();
  }, []);

  const handleDownloadYouTubeItem = async (ytItem: YouTubeSearchResult) => {
    if (downloadedIds.has(ytItem.id) || downloadedIds.has(`yt_${ytItem.id}`)) {
      Alert.alert('Ya en tu biblioteca', `"${ytItem.title}" ya está guardada en tu biblioteca.`);
      return;
    }
    setDownloadingIds((prev) => new Set(prev).add(ytItem.id));
    try {
      const downloaded = await DownloadService.getInstance().downloadYouTubeItem(ytItem);
      await refreshDownloaded();
      if (downloaded.isDownloaded) {
        Alert.alert(
          '¡Descarga MP3 completada!',
          `"${ytItem.title}" se ha descargado en tu iPhone como archivo MP3.\nPuedes escucharla sin internet y con la pantalla apagada en la sección Descargas.`
        );
      } else {
        Alert.alert(
          '¡Guardada en Mi Música!',
          `"${ytItem.title}" se ha guardado en tu colección.\nPara descargarla en MP3, abre el servidor de descargas en tu PC y conecta el iPhone a la misma Wi-Fi.`
        );
      }
    } catch (e: any) {
      Alert.alert('Error al descargar', e.message || 'No se pudo descargar la canción en MP3.');
    } finally {
      setDownloadingIds((prev) => {
        const next = new Set(prev);
        next.delete(ytItem.id);
        return next;
      });
    }
  };

  const handleDownloadSong = async (song: Song) => {
    if (song.isDownloaded || downloadedIds.has(song.id)) {
      Alert.alert('Ya descargada', `"${song.title}" ya está disponible sin conexión.`);
      return;
    }
    setDownloadingIds((prev) => new Set(prev).add(song.id));
    try {
      await DownloadService.getInstance().downloadSong(song);
      await refreshDownloaded();
      Alert.alert(
        '¡Descarga completada!',
        `"${song.title}" ya está guardada para escuchar sin conexión a internet.`
      );
    } catch (e: any) {
      Alert.alert('Error', e.message || 'No se pudo descargar la canción.');
    } finally {
      setDownloadingIds((prev) => {
        const next = new Set(prev);
        next.delete(song.id);
        return next;
      });
    }
  };

  // Monitor connection state
  useEffect(() => {
    const unsubscribe = NetInfo.addEventListener((state) => {
      setIsConnected(state.isConnected ?? true);
    });
    return () => unsubscribe();
  }, []);

  // Filtered local results
  const filteredSongs = searchQuery.trim()
    ? demoSongs.filter(
        (s) =>
          s.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
          s.artist.toLowerCase().includes(searchQuery.toLowerCase()) ||
          s.genre?.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : [];

  const filteredArtists = searchQuery.trim()
    ? demoArtists.filter((a) => a.name.toLowerCase().includes(searchQuery.toLowerCase()))
    : [];

  const filteredAlbums = searchQuery.trim()
    ? demoAlbums.filter(
        (al) =>
          al.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
          al.artist.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : [];

  // Fetch YouTube results on search
  useEffect(() => {
    if (!searchQuery.trim()) {
      setYoutubeResults([]);
      setYoutubeError(null);
      return;
    }

    let isMounted = true;
    setIsLoadingYoutube(true);
    setYoutubeError(null);

    const timer = setTimeout(async () => {
      try {
        const response = await YouTubeService.getInstance().search(searchQuery);
        if (isMounted) {
          setHasApiKey(response.hasApiKey);
          setYoutubeResults(response.results);
          setYoutubeError(response.error ?? null);
        }
      } catch (e) {
        if (isMounted) {
          setYoutubeError('Error al conectar con YouTube.');
        }
      } finally {
        if (isMounted) setIsLoadingYoutube(false);
      }
    }, 400);

    return () => {
      isMounted = false;
      clearTimeout(timer);
    };
  }, [searchQuery]);

  const handleOpenApiKeyModal = async () => {
    const currentKey = await YouTubeService.getInstance().getApiKey();
    setApiKeyInput(currentKey);
    setApiKeyModalVisible(true);
  };

  const handleSaveApiKey = async () => {
    await YouTubeService.getInstance().setApiKey(apiKeyInput);
    setApiKeyModalVisible(false);
    if (searchQuery.trim()) {
      setIsLoadingYoutube(true);
      const response = await YouTubeService.getInstance().search(searchQuery);
      setHasApiKey(response.hasApiKey);
      setYoutubeResults(response.results);
      setYoutubeError(response.error ?? null);
      setIsLoadingYoutube(false);
    }
  };

  const showApiKeyHelp = () => {
    Alert.alert(
      'YouTube Data API v3',
      'Para obtener tu clave oficial gratuita de Google:\n\n1. Entra en console.cloud.google.com con tu cuenta de Google.\n2. Crea un proyecto nuevo (es gratis).\n3. Ve a "APIs y Servicios" > "Biblioteca".\n4. Busca y activa "YouTube Data API v3".\n5. Ve a "Credenciales" > "Crear credenciales" > "Clave de API".\n6. Copia la clave y pégala aquí o en tu archivo .env.',
      [{ text: 'Entendido' }]
    );
  };

  const isSearching = searchQuery.trim().length > 0;

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={[styles.title, { color: theme.text }]}>Explorar</Text>
        {isConnected === false && (
          <View style={[styles.offlineBanner, { backgroundColor: 'rgba(239, 68, 68, 0.15)' }]}>
            <Ionicons name="cloud-offline-outline" size={14} color="#EF4444" />
            <Text style={styles.offlineBannerText}>Modo Offline</Text>
          </View>
        )}
      </View>

      {/* Search Input Bar */}
      <View style={styles.searchBarWrapper}>
        <View style={[styles.searchBar, { backgroundColor: theme.surface, borderColor: theme.border }]}>
          <Ionicons name="search" size={20} color={theme.textMuted} />
          <TextInput
            placeholder="Buscar canciones, YouTube, artistas..."
            placeholderTextColor={theme.textMuted}
            value={searchQuery}
            onChangeText={setSearchQuery}
            style={[styles.searchInput, { color: theme.text }]}
            returnKeyType="search"
            autoCorrect={false}
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={() => setSearchQuery('')} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
              <Ionicons name="close-circle" size={18} color={theme.textMuted} />
            </TouchableOpacity>
          )}
        </View>
      </View>

      <ScrollView
        contentContainerStyle={[styles.scrollContent, { paddingBottom: BOTTOM_TOTAL_HEIGHT + Spacing.xl }]}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled">
        {isSearching ? (
          /* Search Results */
          <View style={styles.resultsContainer}>
            {/* Filters */}
            <View style={styles.filterRow}>
              {(['all', 'songs', 'youtube', 'artists', 'albums'] as FilterType[]).map((filter) => (
                <TouchableOpacity
                  key={filter}
                  onPress={() => setActiveFilter(filter)}
                  style={[
                    styles.filterChip,
                    {
                      backgroundColor: activeFilter === filter ? theme.primary : theme.surface,
                      borderColor: theme.border,
                    },
                  ]}>
                  <Text
                    style={[
                      styles.filterText,
                      { color: activeFilter === filter ? '#FFFFFF' : theme.textSecondary },
                    ]}>
                    {filter === 'all'
                      ? 'Todo'
                      : filter === 'songs'
                      ? 'Canciones'
                      : filter === 'youtube'
                      ? 'YouTube'
                      : filter === 'artists'
                      ? 'Artistas'
                      : 'Álbumes'}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            {/* YOUTUBE RESULTS */}
            {(activeFilter === 'all' || activeFilter === 'youtube') && (
              <View style={styles.resultSection}>
                <View style={styles.sectionHeaderRow}>
                  <View style={styles.ytBadge}>
                    <Ionicons name="logo-youtube" size={18} color="#FF0000" />
                    <Text style={[styles.sectionTitle, { color: theme.text, marginBottom: 0 }]}>
                      YouTube Oficial {hasApiKey ? `(${youtubeResults.length})` : ''}
                    </Text>
                  </View>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                    {isLoadingYoutube && <ActivityIndicator size="small" color={theme.primary} />}
                    <TouchableOpacity
                      onPress={handleOpenApiKeyModal}
                      hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                      <Ionicons
                        name="key-outline"
                        size={18}
                        color={hasApiKey ? theme.primary : '#EF4444'}
                      />
                    </TouchableOpacity>
                  </View>
                </View>

                {!hasApiKey ? (
                  <View
                    style={[
                      styles.apiKeyBanner,
                      { backgroundColor: theme.surface, borderColor: theme.border },
                    ]}>
                    <View style={styles.apiKeyHeader}>
                      <Ionicons name="key" size={20} color={theme.primary} />
                      <Text style={[styles.apiKeyTitle, { color: theme.text }]}>
                        YouTube Data API Key Requerida
                      </Text>
                    </View>
                    <Text style={[styles.apiKeyDescription, { color: theme.textSecondary }]}>
                      Para buscar millones de canciones, artistas y vídeos en tiempo real, configura tu clave oficial de Google (gratuita).
                    </Text>
                    <View style={styles.apiKeyActions}>
                      <TouchableOpacity
                        onPress={handleOpenApiKeyModal}
                        style={[styles.apiKeyPrimaryBtn, { backgroundColor: theme.primary }]}>
                        <Ionicons name="add-circle-outline" size={16} color="#FFFFFF" />
                        <Text style={styles.apiKeyBtnText}>Ingresar Clave</Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        onPress={showApiKeyHelp}
                        style={[styles.apiKeySecondaryBtn, { borderColor: theme.border }]}>
                        <Ionicons name="help-circle-outline" size={16} color={theme.textSecondary} />
                        <Text style={[styles.apiKeyBtnTextSecondary, { color: theme.textSecondary }]}>
                          ¿Cómo obtenerla?
                        </Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                ) : youtubeError && youtubeResults.length === 0 ? (
                  <View
                    style={[
                      styles.errorCard,
                      {
                        backgroundColor: 'rgba(239, 68, 68, 0.1)',
                        borderColor: 'rgba(239, 68, 68, 0.25)',
                      },
                    ]}>
                    <Ionicons name="alert-circle-outline" size={20} color="#EF4444" />
                    <Text style={[styles.errorCardText, { color: theme.text }]}>
                      {youtubeError}
                    </Text>
                    <TouchableOpacity
                      onPress={handleOpenApiKeyModal}
                      style={styles.errorCardAction}>
                      <Text style={{ color: theme.primary, fontWeight: '700', fontSize: FontSize.xs }}>
                        Configurar clave
                      </Text>
                    </TouchableOpacity>
                  </View>
                ) : youtubeResults.length > 0 ? (
                  youtubeResults.map((ytItem) => {
                    const isYtDownloaded =
                      downloadedIds.has(ytItem.id) || downloadedIds.has(`yt_${ytItem.id}`);
                    const isYtDownloading = downloadingIds.has(ytItem.id);

                    return (
                      <TouchableOpacity
                        key={ytItem.id}
                        onPress={() => setSelectedYoutubeItem(ytItem)}
                        style={[styles.youtubeCard, { backgroundColor: theme.surface, borderColor: theme.border }]}>
                        <Image source={{ uri: ytItem.thumbnail }} style={styles.youtubeThumbnail} />
                        <View style={styles.youtubeInfo}>
                          <Text style={[styles.youtubeTitle, { color: theme.text }]} numberOfLines={2}>
                            {ytItem.title}
                          </Text>
                          <Text style={[styles.youtubeChannel, { color: theme.textSecondary }]} numberOfLines={1}>
                            {ytItem.channelTitle}
                          </Text>
                          <View style={styles.youtubeTag}>
                            <Ionicons name="play" size={10} color={theme.primary} />
                            <Text style={[styles.youtubeTagText, { color: theme.primary }]}>Reproductor Oficial</Text>
                          </View>
                        </View>

                        {/* Botón de descargar al costado */}
                        <TouchableOpacity
                          onPress={(e) => {
                            e.stopPropagation?.();
                            handleDownloadYouTubeItem(ytItem);
                          }}
                          disabled={isYtDownloading}
                          style={styles.ytDownloadBtn}
                          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
                          {isYtDownloading ? (
                            <ActivityIndicator size="small" color={theme.primary} />
                          ) : isYtDownloaded ? (
                            <Ionicons name="checkmark-circle" size={24} color="#10B981" />
                          ) : (
                            <Ionicons name="arrow-down-circle-outline" size={24} color={theme.primary} />
                          )}
                        </TouchableOpacity>
                      </TouchableOpacity>
                    );
                  })
                ) : !isLoadingYoutube ? (
                  <Text style={[styles.noYtText, { color: theme.textMuted }]}>
                    No se encontraron vídeos en YouTube para "{searchQuery}".
                  </Text>
                ) : null}
              </View>
            )}

            {/* Songs Results */}
            {(activeFilter === 'all' || activeFilter === 'songs') && filteredSongs.length > 0 && (
              <View style={styles.resultSection}>
                <Text style={[styles.sectionTitle, { color: theme.text }]}>Canciones locales ({filteredSongs.length})</Text>
                {filteredSongs.map((song) => {
                  const isSongDl = song.isDownloaded || downloadedIds.has(song.id);
                  const isSongDownloading = downloadingIds.has(song.id);

                  return (
                    <TouchableOpacity
                      key={song.id}
                      onPress={() => playSong(song, filteredSongs)}
                      style={[styles.songItem, { borderBottomColor: theme.border }]}>
                      <View style={[styles.artworkSmall, { backgroundColor: theme.surfaceLight }]}>
                        <Ionicons name="musical-note" size={16} color={theme.primary} />
                      </View>
                      <View style={styles.songInfo}>
                        <Text style={[styles.songTitle, { color: theme.text }]} numberOfLines={1}>
                          {song.title}
                        </Text>
                        <Text style={[styles.songSubtitle, { color: theme.textSecondary }]} numberOfLines={1}>
                          {song.artist} • {formatDuration(song.duration)}
                        </Text>
                      </View>

                      {/* Botón de descarga al costado */}
                      <TouchableOpacity
                        onPress={() => handleDownloadSong(song)}
                        disabled={isSongDownloading}
                        style={{ padding: 6, marginRight: 4 }}
                        hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
                        {isSongDownloading ? (
                          <ActivityIndicator size="small" color={theme.primary} />
                        ) : isSongDl ? (
                          <Ionicons name="checkmark-circle" size={22} color="#10B981" />
                        ) : (
                          <Ionicons name="arrow-down-circle-outline" size={22} color={theme.textSecondary} />
                        )}
                      </TouchableOpacity>

                      <Ionicons name="play-circle" size={24} color={theme.primary} />
                    </TouchableOpacity>
                  );
                })}
              </View>
            )}

            {/* Artists Results */}
            {(activeFilter === 'all' || activeFilter === 'artists') && filteredArtists.length > 0 && (
              <View style={styles.resultSection}>
                <Text style={[styles.sectionTitle, { color: theme.text }]}>Artistas ({filteredArtists.length})</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.horizontalRow}>
                  {filteredArtists.map((artist) => (
                    <View key={artist.id} style={styles.artistResultCard}>
                      <View style={[styles.artistAvatar, { backgroundColor: theme.secondary }]}>
                        <Ionicons name="person" size={28} color="#FFFFFF" />
                      </View>
                      <Text style={[styles.artistName, { color: theme.text }]} numberOfLines={1}>
                        {artist.name}
                      </Text>
                      <Text style={[styles.artistCount, { color: theme.textMuted }]}>{artist.songCount} canciones</Text>
                    </View>
                  ))}
                </ScrollView>
              </View>
            )}

            {/* Albums Results */}
            {(activeFilter === 'all' || activeFilter === 'albums') && filteredAlbums.length > 0 && (
              <View style={styles.resultSection}>
                <Text style={[styles.sectionTitle, { color: theme.text }]}>Álbumes ({filteredAlbums.length})</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.horizontalRow}>
                  {filteredAlbums.map((album) => (
                    <View key={album.id} style={styles.albumResultCard}>
                      <View style={[styles.albumCover, { backgroundColor: theme.surfaceLight }]}>
                        <Ionicons name="disc" size={32} color={theme.accent} />
                      </View>
                      <Text style={[styles.albumTitle, { color: theme.text }]} numberOfLines={1}>
                        {album.title}
                      </Text>
                      <Text style={[styles.albumArtist, { color: theme.textMuted }]} numberOfLines={1}>
                        {album.artist}
                      </Text>
                    </View>
                  ))}
                </ScrollView>
              </View>
            )}

            {/* No Results */}
            {filteredSongs.length === 0 &&
              filteredArtists.length === 0 &&
              filteredAlbums.length === 0 &&
              youtubeResults.length === 0 &&
              !isLoadingYoutube && (
                <View style={styles.emptyContainer}>
                  <Ionicons name="search-outline" size={54} color={theme.textMuted} />
                  <Text style={[styles.emptyTitle, { color: theme.text }]}>Sin resultados</Text>
                  <Text style={[styles.emptyText, { color: theme.textSecondary }]}>
                    No encontramos nada para "{searchQuery}". Intenta con otro término.
                  </Text>
                </View>
              )}
          </View>
        ) : (
          /* Default Discovery Content */
          <>
            {/* Recent Searches */}
            <View style={styles.section}>
              <Text style={[styles.sectionTitle, { color: theme.text }]}>Búsquedas recientes</Text>
              <View style={styles.chipsContainer}>
                {RECENT_SEARCHES.map((query) => (
                  <TouchableOpacity
                    key={query}
                    onPress={() => setSearchQuery(query)}
                    style={[styles.recentChip, { backgroundColor: theme.surface, borderColor: theme.border }]}>
                    <Ionicons name="time-outline" size={14} color={theme.textMuted} />
                    <Text style={[styles.recentChipText, { color: theme.textSecondary }]}>{query}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            {/* Genres Grid */}
            <View style={styles.section}>
              <Text style={[styles.sectionTitle, { color: theme.text }]}>Explorar por género</Text>
              <View style={styles.genresGrid}>
                {demoGenres.map((genre) => (
                  <TouchableOpacity
                    key={genre.id}
                    onPress={() => setSearchQuery(genre.name)}
                    style={[styles.genreCard, { backgroundColor: genre.color }]}>
                    <Text style={styles.genreIcon}>{genre.icon}</Text>
                    <Text style={styles.genreName}>{genre.name}</Text>
                    <Text style={styles.genreCount}>{genre.songCount} temas</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            {/* Trending Artists */}
            <View style={styles.section}>
              <Text style={[styles.sectionTitle, { color: theme.text }]}>Artistas populares</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.horizontalRow}>
                {demoArtists.map((artist) => (
                  <TouchableOpacity
                    key={artist.id}
                    onPress={() => setSearchQuery(artist.name)}
                    style={styles.artistCircle}>
                    <View style={[styles.artistAvatarLarge, { backgroundColor: theme.surfaceLight }]}>
                      <Ionicons name="person" size={32} color={theme.primary} />
                    </View>
                    <Text style={[styles.artistName, { color: theme.text }]} numberOfLines={1}>
                      {artist.name}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>

            {/* Recent Albums */}
            <View style={styles.section}>
              <Text style={[styles.sectionTitle, { color: theme.text }]}>Álbumes recientes</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.horizontalRow}>
                {demoAlbums.map((album) => (
                  <TouchableOpacity
                    key={album.id}
                    onPress={() => setSearchQuery(album.title)}
                    style={styles.albumCardLarge}>
                    <View style={[styles.albumCoverLarge, { backgroundColor: theme.surfaceLight }]}>
                      <Ionicons name="disc" size={40} color={theme.secondary} />
                    </View>
                    <Text style={[styles.albumTitle, { color: theme.text }]} numberOfLines={1}>
                      {album.title}
                    </Text>
                    <Text style={[styles.albumArtist, { color: theme.textMuted }]} numberOfLines={1}>
                      {album.artist}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>
          </>
        )}
      </ScrollView>

      {/* Official YouTube Embed Modal */}
      <YouTubePlayerModal
        visible={selectedYoutubeItem !== null}
        item={selectedYoutubeItem}
        onClose={() => setSelectedYoutubeItem(null)}
        onDownloaded={refreshDownloaded}
      />

      {/* Modal para ingresar/editar YouTube API Key */}
      <Modal
        visible={apiKeyModalVisible}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setApiKeyModalVisible(false)}>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: theme.surface, borderColor: theme.border }]}>
            <View style={styles.modalHeader}>
              <Ionicons name="logo-youtube" size={24} color="#FF0000" />
              <Text style={[styles.modalTitle, { color: theme.text }]}>YouTube Data API Key</Text>
            </View>
            <Text style={[styles.modalDesc, { color: theme.textSecondary }]}>
              Introduce tu clave oficial de Google Cloud Console para activar búsquedas de canciones y vídeos en tiempo real:
            </Text>
            <TextInput
              style={[
                styles.modalInput,
                { backgroundColor: theme.background, borderColor: theme.border, color: theme.text },
              ]}
              placeholder="AIzaSy..."
              placeholderTextColor={theme.textMuted}
              value={apiKeyInput}
              onChangeText={setApiKeyInput}
              autoCapitalize="none"
              autoCorrect={false}
            />
            <View style={styles.modalButtonRow}>
              <TouchableOpacity
                onPress={() => setApiKeyModalVisible(false)}
                style={[styles.modalBtnCancel, { borderColor: theme.border }]}>
                <Text style={[styles.modalBtnText, { color: theme.textSecondary }]}>Cancelar</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={handleSaveApiKey}
                style={[styles.modalBtnSave, { backgroundColor: theme.primary }]}>
                <Text style={[styles.modalBtnText, { color: '#FFFFFF' }]}>Guardar Clave</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
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
  offlineBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: BorderRadius.full,
  },
  offlineBannerText: {
    color: '#EF4444',
    fontSize: 10,
    fontWeight: '700',
  },
  searchBarWrapper: {
    paddingHorizontal: Spacing.xl,
    paddingVertical: Spacing.md,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.md,
    height: 44,
    borderRadius: BorderRadius.xl,
    borderWidth: 1,
    gap: Spacing.sm,
  },
  searchInput: {
    flex: 1,
    fontSize: FontSize.md,
    paddingVertical: 0,
  },
  scrollContent: {
    paddingTop: Spacing.sm,
  },
  section: {
    marginTop: Spacing.xl,
    paddingHorizontal: Spacing.xl,
  },
  sectionTitle: {
    fontSize: FontSize.xl,
    fontWeight: '700',
    marginBottom: Spacing.md,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: Spacing.md,
  },
  ytBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  chipsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.sm,
  },
  recentChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: Spacing.md,
    paddingVertical: 8,
    borderRadius: BorderRadius.full,
    borderWidth: 1,
  },
  recentChipText: {
    fontSize: FontSize.sm,
    fontWeight: '500',
  },
  genresGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.md,
    justifyContent: 'space-between',
  },
  genreCard: {
    width: (SCREEN_WIDTH - Spacing.xl * 2 - Spacing.md) / 2,
    height: 100,
    borderRadius: BorderRadius.xl,
    padding: Spacing.md,
    justifyContent: 'space-between',
  },
  genreIcon: {
    fontSize: 28,
  },
  genreName: {
    color: '#FFFFFF',
    fontSize: FontSize.lg,
    fontWeight: '700',
  },
  genreCount: {
    color: 'rgba(255, 255, 255, 0.75)',
    fontSize: FontSize.xs,
  },
  horizontalRow: {
    gap: Spacing.md,
    paddingRight: Spacing.xl,
  },
  artistCircle: {
    alignItems: 'center',
    width: 80,
  },
  artistAvatarLarge: {
    width: 72,
    height: 72,
    borderRadius: 36,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.xs,
  },
  artistName: {
    fontSize: FontSize.xs,
    fontWeight: '600',
    textAlign: 'center',
  },
  albumCardLarge: {
    width: 130,
  },
  albumCoverLarge: {
    width: 130,
    height: 130,
    borderRadius: BorderRadius.lg,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.xs,
  },
  albumTitle: {
    fontSize: FontSize.sm,
    fontWeight: '600',
  },
  albumArtist: {
    fontSize: FontSize.xs,
  },
  resultsContainer: {
    paddingHorizontal: Spacing.xl,
  },
  filterRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.sm,
    marginBottom: Spacing.lg,
  },
  filterChip: {
    paddingHorizontal: Spacing.md,
    paddingVertical: 6,
    borderRadius: BorderRadius.full,
    borderWidth: 1,
  },
  filterText: {
    fontSize: FontSize.xs,
    fontWeight: '600',
  },
  resultSection: {
    marginBottom: Spacing['2xl'],
  },
  youtubeCard: {
    flexDirection: 'row',
    padding: Spacing.md,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    marginBottom: Spacing.md,
    gap: Spacing.md,
  },
  youtubeThumbnail: {
    width: 100,
    height: 60,
    borderRadius: BorderRadius.md,
    backgroundColor: '#000000',
  },
  youtubeInfo: {
    flex: 1,
    justifyContent: 'space-between',
  },
  ytDownloadBtn: {
    justifyContent: 'center',
    alignItems: 'center',
    paddingLeft: Spacing.sm,
    paddingRight: Spacing.xs,
  },
  youtubeTitle: {
    fontSize: FontSize.sm,
    fontWeight: '700',
    lineHeight: 18,
  },
  youtubeChannel: {
    fontSize: FontSize.xs,
  },
  youtubeTag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 2,
  },
  youtubeTagText: {
    fontSize: 10,
    fontWeight: '700',
  },
  noYtText: {
    fontSize: FontSize.xs,
    fontStyle: 'italic',
  },
  songItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: Spacing.md,
    borderBottomWidth: 0.5,
    gap: Spacing.md,
  },
  artworkSmall: {
    width: 44,
    height: 44,
    borderRadius: BorderRadius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  songInfo: {
    flex: 1,
  },
  songTitle: {
    fontSize: FontSize.md,
    fontWeight: '600',
  },
  songSubtitle: {
    fontSize: FontSize.xs,
    marginTop: 2,
  },
  artistResultCard: {
    alignItems: 'center',
    width: 90,
  },
  artistAvatar: {
    width: 60,
    height: 60,
    borderRadius: 30,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
  },
  artistCount: {
    fontSize: 10,
  },
  albumResultCard: {
    width: 110,
  },
  albumCover: {
    width: 110,
    height: 110,
    borderRadius: BorderRadius.md,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
  },
  emptyContainer: {
    alignItems: 'center',
    paddingVertical: Spacing['5xl'],
    gap: Spacing.md,
  },
  emptyTitle: {
    fontSize: FontSize.xl,
    fontWeight: '700',
  },
  emptyText: {
    fontSize: FontSize.sm,
    textAlign: 'center',
    paddingHorizontal: Spacing.xl,
  },
  apiKeyBanner: {
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    padding: Spacing.lg,
    gap: Spacing.sm,
    marginBottom: Spacing.md,
  },
  apiKeyHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  apiKeyTitle: {
    fontSize: FontSize.md,
    fontWeight: '700',
  },
  apiKeyDescription: {
    fontSize: FontSize.xs,
    lineHeight: 18,
  },
  apiKeyActions: {
    flexDirection: 'row',
    gap: Spacing.md,
    marginTop: Spacing.xs,
  },
  apiKeyPrimaryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: Spacing.md,
    paddingVertical: 8,
    borderRadius: BorderRadius.md,
  },
  apiKeyBtnText: {
    fontSize: FontSize.xs,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  apiKeySecondaryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: Spacing.md,
    paddingVertical: 8,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
  },
  apiKeyBtnTextSecondary: {
    fontSize: FontSize.xs,
    fontWeight: '600',
  },
  errorCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    padding: Spacing.md,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    marginBottom: Spacing.md,
  },
  errorCardText: {
    flex: 1,
    fontSize: FontSize.xs,
  },
  errorCardAction: {
    paddingVertical: 4,
    paddingHorizontal: 8,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.75)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: Spacing.xl,
  },
  modalContent: {
    width: '100%',
    maxWidth: 400,
    borderRadius: BorderRadius.xl,
    borderWidth: 1,
    padding: Spacing.xl,
    gap: Spacing.md,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  modalTitle: {
    fontSize: FontSize.lg,
    fontWeight: '700',
  },
  modalDesc: {
    fontSize: FontSize.xs,
    lineHeight: 18,
  },
  modalInput: {
    borderWidth: 1,
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
    fontSize: FontSize.sm,
  },
  modalButtonRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: Spacing.md,
    marginTop: Spacing.xs,
  },
  modalBtnCancel: {
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
  },
  modalBtnSave: {
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: BorderRadius.md,
  },
  modalBtnText: {
    fontSize: FontSize.sm,
    fontWeight: '700',
  },
});
