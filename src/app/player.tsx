import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  TouchableOpacity,
  Dimensions,
  Platform,
  Alert,
  ActivityIndicator,
  Linking,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { WebView } from 'react-native-webview';
import { useRouter } from 'expo-router';
import { useVicentTheme } from '@/hooks/use-theme';
import { usePlayer } from '@/context/PlayerContext';
import DownloadService from '@/services/DownloadService';
import {
  Spacing,
  BorderRadius,
  FontSize,
} from '@/constants/theme';
import { formatDuration } from '@/data/demoData';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

export default function FullPlayerScreen() {
  const theme = useVicentTheme();
  const router = useRouter();
  const {
    state,
    togglePlay,
    next,
    previous,
    seekTo,
    setVolume,
    toggleRepeat,
    toggleShuffle,
    toggleFavorite,
  } = usePlayer();

  const [showQueue, setShowQueue] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);
  const [repeatNotice, setRepeatNotice] = useState<string | null>(null);

  const song = state.currentSong;

  const hasLocalAudio =
    song != null &&
    Boolean(
      song.isDownloaded ||
      (song.uri && (song.uri.startsWith('file://') || song.uri.includes('.mp3') || song.uri.startsWith('asset://')))
    );

  const isYouTube =
    !hasLocalAudio &&
    song != null &&
    (song.id.startsWith('yt_') ||
      song.uri.includes('youtube.com') ||
      song.genre === 'YouTube');

  const videoId = song
    ? song.id.startsWith('yt_')
      ? song.id.replace('yt_', '')
      : (song.uri.split('v=')[1]?.split('&')[0] || song.id)
    : '';

  const handleToggleRepeatWithNotice = () => {
    toggleRepeat();
    const nextMode =
      state.repeatMode === 'off'
        ? 'all'
        : state.repeatMode === 'all'
        ? 'one'
        : 'off';
    const message =
      nextMode === 'one'
        ? '🔂 Repitiendo esta canción'
        : nextMode === 'all'
        ? '🔁 Repetir lista completa'
        : '⏭️ Reproducción continua automática';
    setRepeatNotice(message);
    setTimeout(() => setRepeatNotice(null), 2500);
  };

  const handleDownloadCurrentSong = async () => {
    if (!song) return;
    if (song.isDownloaded) {
      Alert.alert('Ya descargada', `"${song.title}" ya está disponible sin conexión.`);
      return;
    }
    setIsDownloading(true);
    try {
      if (isYouTube) {
        const vid = song.id.startsWith('yt_') ? song.id.replace('yt_', '') : videoId;
        const downloaded = await DownloadService.getInstance().downloadYouTubeItem({
          id: vid,
          videoId: vid,
          title: song.title,
          channelTitle: song.artist,
          thumbnail: song.artwork,
        });
        if (downloaded.isDownloaded) {
          Alert.alert(
            '¡Descarga MP3 completada!',
            `"${song.title}" se ha descargado como archivo MP3 en tu iPhone.\nPuedes escucharla sin internet y con la pantalla apagada en la sección Descargas.`
          );
        } else {
          Alert.alert(
            '¡Guardada en Mi Música!',
            `"${song.title}" se ha guardado en tu colección.\nPara descargarla en MP3 directamente, recuerda configurar tu EXPO_PUBLIC_BACKEND_URL.`
          );
        }
      } else {
        await DownloadService.getInstance().downloadSong(song);
        Alert.alert('¡Descarga completada!', `"${song.title}" se ha guardado en tu biblioteca para escuchar sin conexión.`);
      }
    } catch (e: any) {
      Alert.alert('Error', e.message || 'No se pudo descargar la canción.');
    } finally {
      setIsDownloading(false);
    }
  };

  if (!song) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]}>
        <View style={styles.topBar}>
          <TouchableOpacity onPress={() => router.back()} style={styles.iconBtn}>
            <Ionicons name="chevron-down" size={28} color={theme.text} />
          </TouchableOpacity>
        </View>
        <View style={styles.emptyContainer}>
          <Ionicons name="musical-notes-outline" size={72} color={theme.textMuted} />
          <Text style={[styles.emptyTitle, { color: theme.text }]}>
            No hay canción seleccionada
          </Text>
          <Text style={[styles.emptySubtitle, { color: theme.textSecondary }]}>
            Elige una canción en Inicio, Explorar o Mi Música para comenzar la reproducción.
          </Text>
          <TouchableOpacity
            onPress={() => router.back()}
            style={[styles.backHomeBtn, { backgroundColor: theme.primary }]}>
            <Text style={styles.backHomeBtnText}>Volver a la biblioteca</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  // Calculate progress percentage
  const duration = song.duration || 180;
  const progressPercent = Math.min(100, (state.position / duration) * 100);

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]}>
      {/* Top Bar */}
      <View style={styles.topBar}>
        <TouchableOpacity onPress={() => router.back()} style={styles.iconBtn}>
          <Ionicons name="chevron-down" size={28} color={theme.text} />
        </TouchableOpacity>
        <View style={styles.headerTitles}>
          <Text style={[styles.headerSubtitle, { color: theme.textMuted }]}>
            REPRODUCIENDO DESDE
          </Text>
          <Text style={[styles.headerMainTitle, { color: theme.text }]} numberOfLines={1}>
            {song.album ?? 'VicentMusic Biblioteca'}
          </Text>
        </View>
        <TouchableOpacity
          onPress={() =>
            Alert.alert(
              song.title,
              `Artista: ${song.artist}\nÁlbum: ${song.album ?? 'Desconocido'}\nFormato: ${song.format?.toUpperCase() ?? 'MP3'} ${song.bitrate ?? 320} kbps\nMuestreo: ${song.sampleRate ?? 44100} Hz`
            )
          }
          style={styles.iconBtn}>
          <Ionicons name="ellipsis-horizontal" size={22} color={theme.text} />
        </TouchableOpacity>
      </View>

      {/* Main Content Area */}
      <View style={styles.content}>
        {/* Artwork Card */}
        <View style={styles.artworkContainer}>
          <View style={[styles.artworkCard, { backgroundColor: theme.surface, borderColor: theme.border }]}>
            {isYouTube && videoId ? (
              <WebView
                source={{ uri: `https://m.youtube.com/watch?v=${videoId}` }}
                style={{ flex: 1, backgroundColor: '#000' }}
                javaScriptEnabled={true}
                domStorageEnabled={true}
                allowsInlineMediaPlayback={true}
                allowsFullscreenVideo={false}
                mediaPlaybackRequiresUserAction={false}
                originWhitelist={['*']}
                userAgent="Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1"
                onShouldStartLoadWithRequest={(request) => {
                  if (
                    request.url.includes('youtube.com') ||
                    request.url.includes('youtu.be') ||
                    request.url.includes('ytimg.com') ||
                    request.url.includes('googlevideo.com') ||
                    request.url.includes('google.com') ||
                    request.url.includes('gstatic.com') ||
                    request.url.includes('googleusercontent.com') ||
                    request.url.startsWith('about:')
                  ) {
                    return true;
                  }
                  Linking.openURL(request.url);
                  return false;
                }}
              />
            ) : (
              <View style={[styles.artworkInnerGlow, { backgroundColor: theme.surfaceLight }]}>
                <Ionicons name="disc-outline" size={130} color={theme.primary} />
              </View>
            )}
          </View>
        </View>

        {/* Title, Artist and Favorite Row */}
        <View style={styles.metaRow}>
          <View style={styles.metaTexts}>
            <Text style={[styles.songTitle, { color: theme.text }]} numberOfLines={1}>
              {song.title}
            </Text>
            <Text style={[styles.songArtist, { color: theme.textSecondary }]} numberOfLines={1}>
              {song.artist}
            </Text>
            {/* Audio Badges */}
            <View style={styles.badgesRow}>
              <View style={[styles.audioBadge, { backgroundColor: theme.surfaceLight }]}>
                <Text style={[styles.badgeText, { color: theme.primary }]}>
                  {song.format?.toUpperCase() ?? 'MP3'}
                </Text>
              </View>
              {song.bitrate && (
                <View style={[styles.audioBadge, { backgroundColor: theme.surfaceLight }]}>
                  <Text style={[styles.badgeText, { color: theme.secondary }]}>
                    {song.bitrate} kbps
                  </Text>
                </View>
              )}
              {song.isDownloaded && (
                <View style={[styles.audioBadge, { backgroundColor: 'rgba(16, 185, 129, 0.15)' }]}>
                  <Ionicons name="cloud-done-outline" size={10} color="#10B981" />
                  <Text style={[styles.badgeText, { color: '#10B981', marginLeft: 3 }]}>Offline</Text>
                </View>
              )}
            </View>
          </View>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
            <TouchableOpacity
              onPress={handleDownloadCurrentSong}
              disabled={isDownloading}
              style={styles.favoriteBtn}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
              {isDownloading ? (
                <ActivityIndicator size="small" color={theme.primary} />
              ) : (
                <Ionicons
                  name={song.isDownloaded ? 'checkmark-circle' : 'arrow-down-circle-outline'}
                  size={26}
                  color={song.isDownloaded ? '#10B981' : theme.textSecondary}
                />
              )}
            </TouchableOpacity>
            <TouchableOpacity onPress={toggleFavorite} style={styles.favoriteBtn}>
              <Ionicons
                name={song.isFavorite ? 'heart' : 'heart-outline'}
                size={28}
                color={song.isFavorite ? '#EF4444' : theme.textMuted}
              />
            </TouchableOpacity>
          </View>
        </View>

        {/* Timeline / Progress Bar */}
        <View style={styles.progressContainer}>
          <TouchableOpacity
            activeOpacity={0.9}
            onPress={(e) => {
              const clickX = e.nativeEvent.locationX;
              const barWidth = SCREEN_WIDTH - Spacing.xl * 2;
              const pct = Math.max(0, Math.min(1, clickX / barWidth));
              seekTo(pct * duration);
            }}
            style={[styles.progressTrack, { backgroundColor: theme.surfaceLight }]}>
            <View
              style={[
                styles.progressFill,
                {
                  backgroundColor: theme.primary,
                  width: `${progressPercent}%`,
                },
              ]}
            />
            <View
              style={[
                styles.scrubberThumb,
                {
                  backgroundColor: '#FFFFFF',
                  left: `${progressPercent}%`,
                },
              ]}
            />
          </TouchableOpacity>
          <View style={styles.timeRow}>
            <Text style={[styles.timeText, { color: theme.textMuted }]}>
              {formatDuration(state.position)}
            </Text>
            <Text style={[styles.timeText, { color: theme.textMuted }]}>
              {formatDuration(duration)}
            </Text>
          </View>
        </View>

        {/* Repeat Toast Notification */}
        {repeatNotice && (
          <View style={[styles.repeatToast, { backgroundColor: theme.surface, borderColor: theme.border }]}>
            <Text style={[styles.repeatToastText, { color: theme.text }]}>{repeatNotice}</Text>
          </View>
        )}

        {/* Primary Controls */}
        <View style={styles.controlsRow}>
          {/* Shuffle Toggle */}
          <TouchableOpacity onPress={toggleShuffle} style={styles.controlSecondaryBtn}>
            <Ionicons
              name="shuffle"
              size={24}
              color={state.shuffleMode === 'on' ? theme.primary : theme.textMuted}
            />
          </TouchableOpacity>

          {/* Previous Track */}
          <TouchableOpacity onPress={previous} style={styles.controlSecondaryBtn}>
            <Ionicons name="play-skip-back" size={28} color={theme.text} />
          </TouchableOpacity>

          {/* Large Play/Pause */}
          <TouchableOpacity
            onPress={togglePlay}
            style={[styles.playPauseBtn, { backgroundColor: theme.primary }]}>
            <Ionicons
              name={state.isPlaying ? 'pause' : 'play'}
              size={34}
              color="#FFFFFF"
              style={{ marginLeft: state.isPlaying ? 0 : 3 }}
            />
          </TouchableOpacity>

          {/* Next Track */}
          <TouchableOpacity onPress={next} style={styles.controlSecondaryBtn}>
            <Ionicons name="play-skip-forward" size={28} color={theme.text} />
          </TouchableOpacity>

          {/* Repeat Mode Toggle */}
          <TouchableOpacity onPress={handleToggleRepeatWithNotice} style={styles.controlSecondaryBtn}>
            <View>
              <Ionicons
                name="repeat"
                size={24}
                color={state.repeatMode !== 'off' ? theme.primary : theme.textMuted}
              />
              {state.repeatMode === 'one' && (
                <View style={styles.repeatBadge}>
                  <Text style={styles.repeatBadgeText}>1</Text>
                </View>
              )}
            </View>
          </TouchableOpacity>
        </View>

        {/* Secondary Volume / Extra Row */}
        <View style={styles.volumeRow}>
          <Ionicons name="volume-low-outline" size={18} color={theme.textMuted} />
          <View style={[styles.volumeTrack, { backgroundColor: theme.surfaceLight }]}>
            <View
              style={[
                styles.volumeFill,
                { backgroundColor: theme.textSecondary, width: `${state.volume * 100}%` },
              ]}
            />
          </View>
          <Ionicons name="volume-high-outline" size={18} color={theme.textMuted} />
        </View>

        {/* Bottom Utility Row */}
        <View style={styles.utilityRow}>
          <TouchableOpacity
            onPress={() =>
              Alert.alert(
                'Cola de reproducción',
                state.queue.length > 0
                  ? `Canciones en cola (${state.queue.length}):\n` +
                      state.queue
                        .slice(0, 5)
                        .map((s, i) => `${i + 1}. ${s.title} — ${s.artist}`)
                        .join('\n')
                  : 'No hay más canciones en la cola.'
              )
            }
            style={styles.utilityBtn}>
            <Ionicons name="list-outline" size={20} color={theme.textSecondary} />
            <Text style={[styles.utilityBtnText, { color: theme.textSecondary }]}>
              Cola ({state.queue.length})
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() =>
              Alert.alert(
                'Ecualizador',
                'Perfil de sonido: Dinámico VicentMusic\nRespuesta mejorada de graves y claridad de agudos.'
              )
            }
            style={styles.utilityBtn}>
            <Ionicons name="pulse-outline" size={20} color={theme.textSecondary} />
            <Text style={[styles.utilityBtnText, { color: theme.textSecondary }]}>Ecualizador</Text>
          </TouchableOpacity>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.xl,
    paddingTop: Spacing.md,
    paddingBottom: Spacing.sm,
  },
  iconBtn: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitles: {
    alignItems: 'center',
    maxWidth: SCREEN_WIDTH - 120,
  },
  headerSubtitle: {
    fontSize: 9,
    fontWeight: '700',
    letterSpacing: 1.2,
  },
  headerMainTitle: {
    fontSize: FontSize.sm,
    fontWeight: '700',
    marginTop: 2,
  },
  content: {
    flex: 1,
    paddingHorizontal: Spacing.xl,
    justifyContent: 'space-between',
    paddingBottom: Spacing.xl,
  },
  artworkContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: Spacing.md,
  },
  artworkCard: {
    width: SCREEN_WIDTH - Spacing.xl * 4,
    aspectRatio: 1,
    maxWidth: 320,
    borderRadius: BorderRadius['2xl'],
    borderWidth: 1,
    overflow: 'hidden',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.5,
    shadowRadius: 16,
    elevation: 10,
  },
  artworkInnerGlow: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: Spacing.sm,
  },
  metaTexts: {
    flex: 1,
    paddingRight: Spacing.md,
  },
  songTitle: {
    fontSize: FontSize['2xl'],
    fontWeight: '800',
    letterSpacing: -0.3,
  },
  songArtist: {
    fontSize: FontSize.md,
    marginTop: 4,
  },
  badgesRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 8,
  },
  audioBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: BorderRadius.sm,
  },
  badgeText: {
    fontSize: 9,
    fontWeight: '700',
  },
  favoriteBtn: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  progressContainer: {
    marginTop: Spacing.lg,
  },
  progressTrack: {
    height: 6,
    borderRadius: 3,
    position: 'relative',
    justifyContent: 'center',
  },
  progressFill: {
    height: '100%',
    borderRadius: 3,
  },
  scrubberThumb: {
    position: 'absolute',
    width: 14,
    height: 14,
    borderRadius: 7,
    marginLeft: -7,
  },
  timeRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: Spacing.xs,
  },
  timeText: {
    fontSize: FontSize.xs,
    fontWeight: '500',
  },
  controlsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.md,
    marginTop: Spacing.md,
  },
  controlSecondaryBtn: {
    width: 48,
    height: 48,
    alignItems: 'center',
    justifyContent: 'center',
  },
  playPauseBtn: {
    width: 70,
    height: 70,
    borderRadius: 35,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#4F7FFF',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.4,
    shadowRadius: 10,
    elevation: 8,
  },
  volumeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    paddingHorizontal: Spacing.md,
    marginTop: Spacing.sm,
  },
  volumeTrack: {
    flex: 1,
    height: 4,
    borderRadius: 2,
    overflow: 'hidden',
  },
  volumeFill: {
    height: '100%',
  },
  utilityRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    paddingTop: Spacing.sm,
  },
  utilityBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 6,
    paddingHorizontal: Spacing.md,
  },
  utilityBtnText: {
    fontSize: FontSize.xs,
    fontWeight: '600',
  },
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: Spacing['3xl'],
    gap: Spacing.md,
  },
  emptyTitle: {
    fontSize: FontSize.xl,
    fontWeight: '700',
    textAlign: 'center',
  },
  emptySubtitle: {
    fontSize: FontSize.sm,
    textAlign: 'center',
    lineHeight: 20,
  },
  backHomeBtn: {
    paddingHorizontal: Spacing.xl,
    paddingVertical: 12,
    borderRadius: BorderRadius.full,
    marginTop: Spacing.md,
  },
  backHomeBtnText: {
    color: '#FFFFFF',
    fontSize: FontSize.md,
    fontWeight: '700',
  },
  repeatBadge: {
    position: 'absolute',
    top: -4,
    right: -4,
    width: 14,
    height: 14,
    borderRadius: 7,
    backgroundColor: '#4F7FFF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  repeatBadgeText: {
    color: '#FFFFFF',
    fontSize: 9,
    fontWeight: '800',
  },
  repeatToast: {
    alignSelf: 'center',
    paddingHorizontal: Spacing.md,
    paddingVertical: 6,
    borderRadius: BorderRadius.full,
    borderWidth: 1,
    marginBottom: Spacing.xs,
  },
  repeatToastText: {
    fontSize: FontSize.xs,
    fontWeight: '600',
  },
});

