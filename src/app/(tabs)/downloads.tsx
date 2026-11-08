import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  SafeAreaView,
  TouchableOpacity,
  Dimensions,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from 'expo-router';
import { useVicentTheme } from '@/hooks/use-theme';
import { usePlayer } from '@/context/PlayerContext';
import {
  Spacing,
  BorderRadius,
  FontSize,
  BOTTOM_TOTAL_HEIGHT,
} from '@/constants/theme';
import { formatDuration, formatFileSize } from '@/data/demoData';
import type { Song, Download } from '@/types/music';
import DatabaseService from '@/services/DatabaseService';
import StorageService from '@/services/StorageService';
import DownloadService from '@/services/DownloadService';
import YouTubePlayerModal from '@/components/YouTubePlayerModal';
import type { YouTubeSearchResult } from '@/services/YouTubeService';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

export default function DownloadsScreen() {
  const theme = useVicentTheme();
  const { playSong } = usePlayer();
  const [activeTab, setActiveTab] = useState<'downloaded' | 'active' | 'history'>('downloaded');
  const [downloads, setDownloads] = useState<Song[]>([]);
  const [activeDownloadsList, setActiveDownloadsList] = useState<Download[]>([]);
  const [storageBytes, setStorageBytes] = useState<number>(0);
  const [isImporting, setIsImporting] = useState<boolean>(false);
  const [selectedYoutubeItem, setSelectedYoutubeItem] = useState<YouTubeSearchResult | null>(null);

  // Load downloaded songs and disk usage
  const loadDownloads = async () => {
    const db = DatabaseService.getInstance();
    const list = await db.getDownloadedSongs();
    setDownloads(list);

    const used = await StorageService.getInstance().getMusicStorageUsage();
    setStorageBytes(used > 0 ? used : list.reduce((a, b) => a + (b.fileSize || 1024 * 1024 * 7), 0));
  };

  useEffect(() => {
    loadDownloads();

    const unsubscribe = DownloadService.getInstance().addListener((list) => {
      setActiveDownloadsList(list);
      loadDownloads();
    });

    return () => unsubscribe();
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadDownloads();
    }, [])
  );

  // Real import using expo-document-picker
  const handleImport = async () => {
    try {
      setIsImporting(true);
      const newSong = await DownloadService.getInstance().importAudioFile();
      if (newSong) {
        await loadDownloads();
        Alert.alert(
          '¡Música importada con éxito!',
          `"${newSong.title}" se ha guardado en tu biblioteca local y está disponible 100% offline.`
        );
      }
    } catch (error: any) {
      Alert.alert('Importación de archivo', error.message || 'No se pudo importar el archivo.');
    } finally {
      setIsImporting(false);
    }
  };

  // Direct download prompt
  const handleDirectDownload = () => {
    Alert.prompt
      ? Alert.prompt(
          'Descarga autorizada',
          'Introduce la URL directa de un archivo de audio (MP3/FLAC) autorizado:',
          async (url) => {
            if (url && url.startsWith('http')) {
              try {
                await DownloadService.getInstance().startDownload(url, 'Audio_Descargado.mp3');
                setActiveTab('active');
              } catch (e: any) {
                Alert.alert('Error', e.message);
              }
            }
          }
        )
      : Alert.alert(
          'Descargas directas autorizadas',
          'Puedes importar música directamente desde tus carpetas locales del dispositivo o descargar feeds de podcasts y música libre.',
          [
            { text: 'Cancelar', style: 'cancel' },
            {
              text: 'Probar descarga demo',
              onPress: async () => {
                try {
                  await DownloadService.getInstance().startDownload(
                    'https://upload.wikimedia.org/wikipedia/commons/5/50/Hypnotic_ambient_electronic_music_by_MusicLM.mp3',
                    'Hypnotic_Ambient.mp3',
                    { title: 'Hypnotic Ambient (CC-BY)', artist: 'Música Libre' }
                  );
                  setActiveTab('active');
                } catch (e: any) {
                  Alert.alert('Aviso', e.message);
                }
              },
            },
          ]
        );
  };

  const handleDeleteSong = (song: Song) => {
    Alert.alert(
      'Eliminar descarga local',
      `¿Deseas eliminar "${song.title}" de tu almacenamiento offline? Se liberará el espacio en disco.`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Eliminar',
          style: 'destructive',
          onPress: async () => {
            if (song.uri) {
              await StorageService.getInstance().deleteAudioFile(song.uri);
            }
            await DatabaseService.getInstance().deleteSong(song.id);
            await loadDownloads();
          },
        },
      ]
    );
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]}>
      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={[styles.title, { color: theme.text }]}>Descargas</Text>
          <Text style={[styles.subtitle, { color: theme.textSecondary }]}>
            {downloads.length} canciones • {formatFileSize(storageBytes)}
          </Text>
        </View>
        <View style={styles.headerActions}>
          <TouchableOpacity
            onPress={handleDirectDownload}
            style={[styles.directBtn, { backgroundColor: theme.surface, borderColor: theme.border }]}>
            <Ionicons name="cloud-download-outline" size={18} color={theme.primary} />
          </TouchableOpacity>
          <TouchableOpacity
            onPress={handleImport}
            disabled={isImporting}
            style={[styles.importBtn, { backgroundColor: theme.primary }]}>
            {isImporting ? (
              <ActivityIndicator size="small" color="#FFFFFF" />
            ) : (
              <>
                <Ionicons name="folder-open-outline" size={18} color="#FFFFFF" />
                <Text style={styles.importBtnText}>Importar</Text>
              </>
            )}
          </TouchableOpacity>
        </View>
      </View>

      {/* Tabs */}
      <View style={[styles.tabsRow, { borderBottomColor: theme.border }]}>
        <TouchableOpacity
          onPress={() => setActiveTab('downloaded')}
          style={[
            styles.tabItem,
            activeTab === 'downloaded' && [styles.activeTab, { borderBottomColor: theme.primary }],
          ]}>
          <Text
            style={[
              styles.tabText,
              { color: activeTab === 'downloaded' ? theme.text : theme.textMuted },
            ]}>
            Completadas ({downloads.length})
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          onPress={() => setActiveTab('active')}
          style={[
            styles.tabItem,
            activeTab === 'active' && [styles.activeTab, { borderBottomColor: theme.primary }],
          ]}>
          <Text
            style={[
              styles.tabText,
              { color: activeTab === 'active' ? theme.text : theme.textMuted },
            ]}>
            En curso ({activeDownloadsList.length})
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          onPress={() => setActiveTab('history')}
          style={[
            styles.tabItem,
            activeTab === 'history' && [styles.activeTab, { borderBottomColor: theme.primary }],
          ]}>
          <Text
            style={[
              styles.tabText,
              { color: activeTab === 'history' ? theme.text : theme.textMuted },
            ]}>
            Historial
          </Text>
        </TouchableOpacity>
      </View>

      <ScrollView
        contentContainerStyle={[styles.scrollContent, { paddingBottom: BOTTOM_TOTAL_HEIGHT + Spacing.xl }]}
        showsVerticalScrollIndicator={false}>
        {activeTab === 'downloaded' && (
          <>
            {/* Banner de Importación Directa Offline */}
            <TouchableOpacity
              onPress={handleImport}
              activeOpacity={0.85}
              style={[styles.importBannerCard, { backgroundColor: theme.primary }]}>
              <View style={styles.importBannerIconWrapper}>
                <Ionicons name="folder-open" size={26} color={theme.primary} />
              </View>
              <View style={styles.importBannerTexts}>
                <Text style={styles.importBannerTitle}>Importar música desde tu iPhone</Text>
                <Text style={styles.importBannerSubtitle}>
                  Toca aquí para añadir archivos MP3 locales y escucharlos sin conexión y con la pantalla apagada.
                </Text>
              </View>
              <Ionicons name="chevron-forward" size={20} color="#FFFFFF" />
            </TouchableOpacity>

            {/* Storage Card */}
            <View style={[styles.storageCard, { backgroundColor: theme.surface, borderColor: theme.border }]}>
              <View style={[styles.storageIconWrapper, { backgroundColor: theme.surfaceLight }]}>
                <Ionicons name="hardware-chip-outline" size={24} color={theme.primary} />
              </View>
              <View style={styles.storageInfo}>
                <Text style={[styles.storageTitle, { color: theme.text }]}>Almacenamiento local</Text>
                <Text style={[styles.storageSubtitle, { color: theme.textSecondary }]}>
                  {formatFileSize(storageBytes)} ocupados en archivos de música
                </Text>
                <View style={[styles.progressBarTrack, { backgroundColor: theme.surfaceLight }]}>
                  <View
                    style={[
                      styles.progressBarFill,
                      {
                        backgroundColor: theme.primary,
                        width: `${Math.min(100, Math.max(5, (storageBytes / (1024 * 1024 * 1024)) * 10))}%`,
                      },
                    ]}
                  />
                </View>
              </View>
            </View>

            {/* Downloaded Songs List */}
            {downloads.length > 0 ? (
              <View style={styles.listContainer}>
                {downloads.map((song, idx) => {
                  // Si tiene un archivo local físico .mp3 o no es streaming web, es audio nativo offline
                  const hasLocalAudio =
                    Boolean(song.uri && (song.uri.startsWith('file://') || song.uri.endsWith('.mp3') || song.uri.startsWith('asset://')));

                  const isStreamingOnly =
                    !hasLocalAudio && (song.uri?.includes('youtube.com') || song.genre === 'YouTube');

                  const ytVideoId = song.id.startsWith('yt_')
                    ? song.id.replace('yt_', '')
                    : song.uri?.split('v=')[1]?.split('&')[0] || '';

                  return (
                    <View
                      key={song.id}
                      style={[styles.songItemRow, { borderBottomColor: theme.border }]}>
                      <TouchableOpacity
                        onPress={() => {
                          if (isStreamingOnly && ytVideoId) {
                            setSelectedYoutubeItem({
                              id: ytVideoId,
                              videoId: ytVideoId,
                              title: song.title,
                              channelTitle: song.artist,
                              description: '',
                              thumbnail: song.artwork || `https://i.ytimg.com/vi/${ytVideoId}/hqdefault.jpg`,
                              publishedAt: '',
                            });
                          } else {
                            // Reproducir como AUDIO real con expo-audio (funciona sin internet y con pantalla apagada)
                            playSong(song, downloads, idx);
                          }
                        }}
                        style={styles.songMainTouchable}>
                        <View style={[styles.artwork, { backgroundColor: isStreamingOnly ? 'rgba(255, 0, 0, 0.15)' : theme.surfaceLight }]}>
                          <Ionicons
                            name={isStreamingOnly ? 'logo-youtube' : 'musical-notes'}
                            size={20}
                            color={isStreamingOnly ? '#FF0000' : theme.primary}
                          />
                        </View>
                        <View style={styles.songDetails}>
                          <Text style={[styles.songTitle, { color: theme.text }]} numberOfLines={1}>
                            {song.title}
                          </Text>
                          <Text style={[styles.songArtist, { color: theme.textSecondary }]} numberOfLines={1}>
                            {song.artist} • {hasLocalAudio ? 'Audio MP3' : 'YouTube Oficial'} • {formatDuration(song.duration)} • {formatFileSize(song.fileSize ?? 1024 * 1024 * 6)}
                          </Text>
                        </View>
                      </TouchableOpacity>

                      <View style={styles.songActions}>
                        <View
                          style={[
                            styles.offlineBadge,
                            {
                              backgroundColor: hasLocalAudio
                                ? 'rgba(16, 185, 129, 0.15)'
                                : 'rgba(255, 0, 0, 0.15)',
                            },
                          ]}>
                          <Ionicons
                            name={hasLocalAudio ? 'checkmark-circle' : 'play'}
                            size={14}
                            color={hasLocalAudio ? '#10B981' : '#FF0000'}
                          />
                          <Text
                            style={[
                              styles.offlineText,
                              { color: hasLocalAudio ? '#10B981' : '#FF0000' },
                            ]}>
                            {hasLocalAudio ? 'Audio Offline' : 'Vídeo'}
                          </Text>
                        </View>
                        <TouchableOpacity
                          onPress={() => handleDeleteSong(song)}
                          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
                          <Ionicons name="trash-outline" size={18} color={theme.textMuted} />
                        </TouchableOpacity>
                      </View>
                    </View>
                  );
                })}
              </View>
            ) : (
              <View style={styles.emptyContainer}>
                <Ionicons name="cloud-download-outline" size={54} color={theme.textMuted} />
                <Text style={[styles.emptyTitle, { color: theme.text }]}>Sin descargas aún</Text>
                <Text style={[styles.emptySubtitle, { color: theme.textSecondary }]}>
                  Importa archivos locales de tu teléfono o descarga fuentes autorizadas para escuchar sin conexión.
                </Text>
                <TouchableOpacity
                  onPress={handleImport}
                  style={[styles.primaryActionBtn, { backgroundColor: theme.primary }]}>
                  <Ionicons name="folder-open-outline" size={18} color="#FFFFFF" />
                  <Text style={styles.primaryActionBtnText}>Importar desde el teléfono</Text>
                </TouchableOpacity>
              </View>
            )}
          </>
        )}

        {activeTab === 'active' && (
          <View style={styles.activeDownloadsContainer}>
            {activeDownloadsList.length > 0 ? (
              activeDownloadsList.map((dl) => (
                <View
                  key={dl.id}
                  style={[styles.activeCard, { backgroundColor: theme.surface, borderColor: theme.border }]}>
                  <View style={styles.activeHeader}>
                    <Ionicons name="arrow-down-circle" size={24} color={theme.primary} />
                    <View style={styles.activeInfo}>
                      <Text style={[styles.activeFileName, { color: theme.text }]} numberOfLines={1}>
                        {dl.fileName}
                      </Text>
                      <Text style={[styles.activeStats, { color: theme.textSecondary }]}>
                        {formatFileSize(dl.downloadedSize ?? 0)} de {formatFileSize(dl.fileSize ?? 0)} • {formatFileSize(dl.speed ?? 0)}/s
                      </Text>
                    </View>
                    <TouchableOpacity
                      onPress={() => DownloadService.getInstance().cancelDownload(dl.id)}>
                      <Ionicons name="close" size={20} color={theme.textMuted} />
                    </TouchableOpacity>
                  </View>

                  <View style={[styles.progressBarTrack, { backgroundColor: theme.surfaceLight, marginTop: Spacing.sm }]}>
                    <View
                      style={[
                        styles.progressBarFill,
                        {
                          backgroundColor: theme.primary,
                          width: `${Math.round(dl.progress * 100)}%`,
                        },
                      ]}
                    />
                  </View>
                  <Text style={[styles.percentageText, { color: theme.textMuted }]}>
                    {Math.round(dl.progress * 100)}% {dl.status === 'paused' ? '• Pausado' : ''}
                  </Text>
                </View>
              ))
            ) : (
              <View style={styles.emptyContainer}>
                <Ionicons name="checkmark-done-circle-outline" size={54} color={theme.textMuted} />
                <Text style={[styles.emptyTitle, { color: theme.text }]}>No hay descargas activas</Text>
                <Text style={[styles.emptySubtitle, { color: theme.textSecondary }]}>
                  Todas las transferencias se encuentran completadas.
                </Text>
              </View>
            )}
          </View>
        )}

        {activeTab === 'history' && (
          <View style={styles.historyContainer}>
            <Text style={[styles.historyNotice, { color: theme.textSecondary }]}>
              Historial de las últimas transferencias completadas en tu dispositivo.
            </Text>
            {downloads.slice(0, 8).map((song) => (
              <View key={song.id} style={[styles.historyRow, { borderBottomColor: theme.border }]}>
                <Ionicons name="checkmark-circle-outline" size={18} color="#10B981" />
                <View style={styles.historyInfo}>
                  <Text style={[styles.historySong, { color: theme.text }]}>{song.title}</Text>
                  <Text style={[styles.historyDate, { color: theme.textMuted }]}>
                    Guardado en almacenamiento local
                  </Text>
                </View>
                <Text style={[styles.historySize, { color: theme.textSecondary }]}>
                  {formatFileSize(song.fileSize ?? 1024 * 1024 * 7)}
                </Text>
              </View>
            ))}
          </View>
        )}
      </ScrollView>

      {/* Modal oficial de YouTube si se reproduce una canción guardada de YouTube */}
      <YouTubePlayerModal
        visible={selectedYoutubeItem !== null}
        item={selectedYoutubeItem}
        onClose={() => setSelectedYoutubeItem(null)}
        onDownloaded={loadDownloads}
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
    paddingBottom: Spacing.md,
  },
  title: {
    fontSize: FontSize['4xl'],
    fontWeight: '800',
    letterSpacing: -0.5,
  },
  subtitle: {
    fontSize: FontSize.sm,
    marginTop: 2,
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  directBtn: {
    width: 38,
    height: 38,
    borderRadius: BorderRadius.full,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  importBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.md,
    paddingVertical: 8,
    borderRadius: BorderRadius.full,
    gap: 6,
  },
  importBtnText: {
    color: '#FFFFFF',
    fontSize: FontSize.sm,
    fontWeight: '700',
  },
  tabsRow: {
    flexDirection: 'row',
    paddingHorizontal: Spacing.xl,
    borderBottomWidth: 1,
  },
  tabItem: {
    paddingVertical: Spacing.md,
    marginRight: Spacing.xl,
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  activeTab: {
    borderBottomWidth: 2,
  },
  tabText: {
    fontSize: FontSize.sm,
    fontWeight: '600',
  },
  scrollContent: {
    paddingTop: Spacing.lg,
  },
  importBannerCard: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: Spacing.xl,
    padding: Spacing.lg,
    borderRadius: BorderRadius.xl,
    gap: Spacing.md,
    marginBottom: Spacing.md,
    shadowColor: '#4F7FFF',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  importBannerIconWrapper: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  importBannerTexts: {
    flex: 1,
  },
  importBannerTitle: {
    color: '#FFFFFF',
    fontSize: FontSize.md,
    fontWeight: '700',
    marginBottom: 2,
  },
  importBannerSubtitle: {
    color: 'rgba(255, 255, 255, 0.85)',
    fontSize: FontSize.xs,
    lineHeight: 16,
  },
  storageCard: {
    flexDirection: 'row',
    marginHorizontal: Spacing.xl,
    padding: Spacing.lg,
    borderRadius: BorderRadius.xl,
    borderWidth: 1,
    alignItems: 'center',
    gap: Spacing.md,
    marginBottom: Spacing.lg,
  },
  storageIconWrapper: {
    width: 44,
    height: 44,
    borderRadius: BorderRadius.lg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  storageInfo: {
    flex: 1,
  },
  storageTitle: {
    fontSize: FontSize.md,
    fontWeight: '700',
  },
  storageSubtitle: {
    fontSize: FontSize.xs,
    marginTop: 2,
    marginBottom: 6,
  },
  progressBarTrack: {
    height: 4,
    borderRadius: 2,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    borderRadius: 2,
  },
  listContainer: {
    paddingHorizontal: Spacing.xl,
  },
  songItemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: Spacing.md,
    borderBottomWidth: 0.5,
  },
  songMainTouchable: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    gap: Spacing.md,
  },
  artwork: {
    width: 44,
    height: 44,
    borderRadius: BorderRadius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  songDetails: {
    flex: 1,
  },
  songTitle: {
    fontSize: FontSize.md,
    fontWeight: '600',
  },
  songArtist: {
    fontSize: FontSize.xs,
    marginTop: 2,
  },
  songActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
  },
  offlineBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: BorderRadius.full,
  },
  offlineText: {
    color: '#10B981',
    fontSize: 10,
    fontWeight: '700',
  },
  emptyContainer: {
    alignItems: 'center',
    paddingVertical: Spacing['5xl'],
    paddingHorizontal: Spacing.xl,
    gap: Spacing.md,
  },
  emptyTitle: {
    fontSize: FontSize.xl,
    fontWeight: '700',
  },
  emptySubtitle: {
    fontSize: FontSize.sm,
    textAlign: 'center',
    lineHeight: 20,
  },
  primaryActionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: Spacing.xl,
    paddingVertical: 12,
    borderRadius: BorderRadius.full,
    marginTop: Spacing.md,
  },
  primaryActionBtnText: {
    color: '#FFFFFF',
    fontSize: FontSize.md,
    fontWeight: '700',
  },
  activeDownloadsContainer: {
    paddingHorizontal: Spacing.xl,
    gap: Spacing.md,
  },
  activeCard: {
    padding: Spacing.md,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
  },
  activeHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
  },
  activeInfo: {
    flex: 1,
  },
  activeFileName: {
    fontSize: FontSize.sm,
    fontWeight: '600',
  },
  activeStats: {
    fontSize: FontSize.xs,
    marginTop: 2,
  },
  percentageText: {
    fontSize: 10,
    textAlign: 'right',
    marginTop: 4,
  },
  historyContainer: {
    paddingHorizontal: Spacing.xl,
  },
  historyNotice: {
    fontSize: FontSize.xs,
    marginBottom: Spacing.md,
  },
  historyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: Spacing.md,
    borderBottomWidth: 0.5,
    gap: Spacing.md,
  },
  historyInfo: {
    flex: 1,
  },
  historySong: {
    fontSize: FontSize.sm,
    fontWeight: '600',
  },
  historyDate: {
    fontSize: FontSize.xs,
    marginTop: 2,
  },
  historySize: {
    fontSize: FontSize.xs,
  },
});
