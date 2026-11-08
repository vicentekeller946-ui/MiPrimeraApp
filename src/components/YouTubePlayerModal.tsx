import React, { useState, useEffect } from 'react';
import {
  Modal,
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  SafeAreaView,
  ActivityIndicator,
  Alert,
  Linking,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { WebView } from 'react-native-webview';
import { useVicentTheme } from '@/hooks/use-theme';
import { Spacing, BorderRadius, FontSize } from '@/constants/theme';
import type { YouTubeSearchResult } from '@/services/YouTubeService';
import DownloadService from '@/services/DownloadService';
import DatabaseService from '@/services/DatabaseService';

interface YouTubePlayerModalProps {
  visible: boolean;
  item: YouTubeSearchResult | null;
  onClose: () => void;
  onDownloaded?: () => void;
}

export default function YouTubePlayerModal({
  visible,
  item,
  onClose,
  onDownloaded,
}: YouTubePlayerModalProps) {
  const theme = useVicentTheme();
  const [isSaving, setIsSaving] = useState(false);
  const [isSaved, setIsSaved] = useState(false);

  useEffect(() => {
    if (!item) return;
    const checkSaved = async () => {
      const songId = `yt_${item.videoId}`;
      const song = await DatabaseService.getInstance().getSongById(songId);
      setIsSaved(song !== null && song !== undefined);
    };
    checkSaved();
  }, [item]);

  if (!item) return null;

  const handleOpenExternal = async () => {
    const url = `https://www.youtube.com/watch?v=${item.videoId}`;
    try {
      const supported = await Linking.canOpenURL(url);
      if (supported) {
        await Linking.openURL(url);
      } else {
        await Linking.openURL(`https://m.youtube.com/watch?v=${item.videoId}`);
      }
    } catch {
      await Linking.openURL(`https://www.youtube.com/watch?v=${item.videoId}`);
    }
  };

  const handleSaveToLibrary = async () => {
    if (isSaved) {
      Alert.alert(
        'Ya en tu biblioteca',
        `"${item.title}" ya está guardada en tu biblioteca de VicentMusic.`
      );
      return;
    }
    try {
      setIsSaving(true);
      await DownloadService.getInstance().downloadYouTubeItem(item);
      setIsSaved(true);
      onDownloaded?.();
      Alert.alert(
        '¡Guardada en Mi Música!',
        `"${item.title}" se ha guardado en tu colección de VicentMusic para ver y escuchar el vídeo oficial cuando tengas conexión.\n\nNota: Por políticas de derechos de autor de Google, YouTube no permite descargar archivos MP3 a la memoria física del teléfono. Para escuchar música 100% offline y con la pantalla apagada, puedes importar tus archivos MP3 desde la pestaña "Descargas".`
      );
    } catch (e: any) {
      Alert.alert('Error', e.message || 'No se pudo guardar la canción.');
    } finally {
      setIsSaving(false);
    }
  };

  // URL directa del reproductor móvil oficial de YouTube (evita Error 153 de embeds restringidos)
  const youtubeUrl = `https://m.youtube.com/watch?v=${item.videoId}`;

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={false}
      onRequestClose={onClose}>
      <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]}>
        {/* Top Header */}
        <View style={styles.topBar}>
          <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
            <Ionicons name="chevron-down" size={28} color={theme.text} />
          </TouchableOpacity>
          <View style={styles.headerInfo}>
            <Text style={[styles.badgeText, { color: theme.primary }]}>REPRODUCTOR OFICIAL YOUTUBE</Text>
            <Text style={[styles.channelTitle, { color: theme.textSecondary }]} numberOfLines={1}>
              {item.channelTitle}
            </Text>
          </View>
          <TouchableOpacity onPress={handleOpenExternal} style={styles.openExternalIconBtn}>
            <Ionicons name="open-outline" size={22} color={theme.primary} />
          </TouchableOpacity>
        </View>

        {/* Official YouTube Embed Player */}
        <View style={styles.playerContainer}>
          <WebView
            source={{ uri: youtubeUrl }}
            style={styles.webView}
            javaScriptEnabled={true}
            domStorageEnabled={true}
            allowsInlineMediaPlayback={true}
            allowsFullscreenVideo={true}
            mediaPlaybackRequiresUserAction={false}
            originWhitelist={['*']}
            userAgent="Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1"
            onShouldStartLoadWithRequest={(request) => {
              // Permitir YouTube y sus dominios internos
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
        </View>

        {/* Video Info Section */}
        <View style={[styles.infoSection, { backgroundColor: theme.surface, borderColor: theme.border }]}>
          <Text style={[styles.videoTitle, { color: theme.text }]} numberOfLines={2}>
            {item.title}
          </Text>
          <Text style={[styles.videoChannel, { color: theme.textSecondary }]}>
            Canal: {item.channelTitle}
          </Text>

          {/* Action Buttons Row */}
          <View style={styles.actionButtonsRow}>
            {/* Botón Ver en YouTube */}
            <TouchableOpacity
              style={styles.openYouTubeBtn}
              onPress={handleOpenExternal}
              activeOpacity={0.85}>
              <Ionicons name="logo-youtube" size={18} color="#FFFFFF" />
              <Text style={styles.openYouTubeBtnText}>Abrir en YouTube</Text>
            </TouchableOpacity>

            {/* Botón Guardar en Mi Música */}
            <TouchableOpacity
              style={[
                styles.saveBtn,
                {
                  backgroundColor: isSaved ? 'rgba(16, 185, 129, 0.15)' : theme.primary,
                  borderColor: isSaved ? '#10B981' : theme.primary,
                },
              ]}
              onPress={handleSaveToLibrary}
              disabled={isSaving}
              activeOpacity={0.85}>
              {isSaving ? (
                <ActivityIndicator size="small" color="#FFFFFF" />
              ) : (
                <>
                  <Ionicons
                    name={isSaved ? 'checkmark-circle' : 'bookmark-outline'}
                    size={18}
                    color={isSaved ? '#10B981' : '#FFFFFF'}
                  />
                  <Text
                    style={[
                      styles.saveBtnText,
                      { color: isSaved ? '#10B981' : '#FFFFFF' },
                    ]}>
                    {isSaved ? 'En Mi Música' : 'Guardar'}
                  </Text>
                </>
              )}
            </TouchableOpacity>
          </View>

          {item.description ? (
            <Text style={[styles.videoDesc, { color: theme.textMuted }]} numberOfLines={3}>
              {item.description}
            </Text>
          ) : null}

          <View style={styles.noticeBox}>
            <Ionicons name="shield-checkmark-outline" size={16} color={theme.primary} />
            <Text style={[styles.noticeText, { color: theme.textSecondary }]}>
              Reproducción oficial sin evasión de DRM. Si un vídeo comercial tiene restricciones del sello discográfico, ábrelo con el botón oficial de YouTube para escucharlo al instante.
            </Text>
          </View>
        </View>
      </SafeAreaView>
    </Modal>
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
    paddingVertical: Spacing.md,
  },
  closeBtn: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  openExternalIconBtn: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerInfo: {
    alignItems: 'center',
  },
  badgeText: {
    fontSize: 9,
    fontWeight: '700',
    letterSpacing: 1,
  },
  channelTitle: {
    fontSize: FontSize.xs,
    marginTop: 2,
  },
  playerContainer: {
    width: '100%',
    aspectRatio: 16 / 9,
    backgroundColor: '#000000',
  },
  webView: {
    flex: 1,
    backgroundColor: '#000000',
  },
  infoSection: {
    flex: 1,
    margin: Spacing.xl,
    padding: Spacing.xl,
    borderRadius: BorderRadius.xl,
    borderWidth: 1,
  },
  videoTitle: {
    fontSize: FontSize.lg,
    fontWeight: '700',
    marginBottom: Spacing.xs,
  },
  videoChannel: {
    fontSize: FontSize.sm,
    fontWeight: '600',
    marginBottom: Spacing.md,
  },
  actionButtonsRow: {
    flexDirection: 'row',
    gap: Spacing.md,
    marginBottom: Spacing.lg,
  },
  openYouTubeBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 12,
    paddingHorizontal: Spacing.md,
    borderRadius: BorderRadius.lg,
    backgroundColor: '#FF0000',
  },
  openYouTubeBtnText: {
    fontSize: FontSize.xs,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  saveBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 12,
    paddingHorizontal: Spacing.md,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
  },
  saveBtnText: {
    fontSize: FontSize.xs,
    fontWeight: '700',
  },
  videoDesc: {
    fontSize: FontSize.xs,
    lineHeight: 18,
    marginBottom: Spacing.lg,
  },
  noticeBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    padding: Spacing.md,
    borderRadius: BorderRadius.md,
    backgroundColor: 'rgba(79, 127, 255, 0.08)',
    marginTop: 'auto',
  },
  noticeText: {
    fontSize: 10,
    flex: 1,
    lineHeight: 14,
  },
});
