import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useVicentTheme } from '@/hooks/use-theme';
import { BorderRadius, FontSize, Spacing } from '@/constants/theme';
import { formatDuration } from '@/data/demoData';
import type { Song } from '@/types/music';

interface SongItemProps {
  song: Song;
  index?: number;
  onPress?: () => void;
  onMenuPress?: () => void;
  onDownloadPress?: () => void;
  showArtwork?: boolean;
  isPlaying?: boolean;
  isDownloading?: boolean;
}

export default function SongItem({
  song,
  index,
  onPress,
  onMenuPress,
  onDownloadPress,
  showArtwork = false,
  isPlaying = false,
  isDownloading = false,
}: SongItemProps) {
  const theme = useVicentTheme();

  const artworkColors = [
    '#4F7FFF',
    '#8B5CF6',
    '#06B6D4',
    '#EC4899',
    '#F59E0B',
    '#10B981',
    '#EF4444',
    '#6366F1',
  ];
  const colorIndex = song.title.length % artworkColors.length;
  const artworkColor = artworkColors[colorIndex];

  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.7}
      style={[
        styles.container,
        isPlaying && { backgroundColor: theme.surfaceHighlight },
      ]}
    >
      {/* Left section: track number or artwork */}
      {showArtwork ? (
        <View style={[styles.artwork, { backgroundColor: artworkColor }]}>
          <Ionicons name="musical-note" size={18} color="rgba(255,255,255,0.8)" />
        </View>
      ) : (
        <View style={styles.trackNumberContainer}>
          {isPlaying ? (
            <Ionicons name="volume-high" size={16} color={theme.primary} />
          ) : (
            <Text style={[styles.trackNumber, { color: theme.textMuted }]}>
              {index !== undefined ? index + 1 : ''}
            </Text>
          )}
        </View>
      )}

      {/* Middle section: title + artist */}
      <View style={styles.info}>
        <Text
          numberOfLines={1}
          style={[
            styles.title,
            { color: isPlaying ? theme.primary : theme.text },
          ]}
        >
          {song.title}
        </Text>
        <Text
          numberOfLines={1}
          style={[styles.artist, { color: theme.textSecondary }]}
        >
          {song.artist}
        </Text>
      </View>

      {/* Right section: duration + download button + menu */}
      <Text style={[styles.duration, { color: theme.textMuted }]}>
        {formatDuration(song.duration)}
      </Text>

      {/* Botón de descargar al costado */}
      <TouchableOpacity
        onPress={onDownloadPress}
        activeOpacity={0.6}
        hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        style={styles.actionButton}
      >
        {isDownloading ? (
          <ActivityIndicator size="small" color={theme.primary} />
        ) : song.isDownloaded ? (
          <Ionicons name="checkmark-circle" size={20} color="#10B981" />
        ) : (
          <Ionicons name="arrow-down-circle-outline" size={20} color={theme.textSecondary} />
        )}
      </TouchableOpacity>

      <TouchableOpacity
        onPress={onMenuPress}
        activeOpacity={0.6}
        hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        style={styles.actionButton}
      >
        <Ionicons name="ellipsis-vertical" size={18} color={theme.textMuted} />
      </TouchableOpacity>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: Spacing.lg,
    paddingHorizontal: Spacing.xl,
    minHeight: 60,
  },
  trackNumberContainer: {
    width: 32,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: Spacing.lg,
  },
  trackNumber: {
    fontSize: FontSize.md,
    fontWeight: '500',
    textAlign: 'center',
  },
  artwork: {
    width: 44,
    height: 44,
    borderRadius: BorderRadius.md,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: Spacing.lg,
  },
  info: {
    flex: 1,
    marginRight: Spacing.md,
    justifyContent: 'center',
  },
  title: {
    fontSize: FontSize.md,
    fontWeight: '600',
    marginBottom: Spacing.xs,
    letterSpacing: 0.1,
  },
  artist: {
    fontSize: FontSize.sm,
    fontWeight: '400',
  },
  duration: {
    fontSize: FontSize.sm,
    fontWeight: '400',
    marginRight: Spacing.sm,
  },
  actionButton: {
    padding: Spacing.sm,
  },
});
