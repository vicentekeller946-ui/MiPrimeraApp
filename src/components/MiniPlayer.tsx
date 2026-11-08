import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useVicentTheme } from '@/hooks/use-theme';
import { usePlayer } from '@/context/PlayerContext';
import { BorderRadius, FontSize, Spacing, MINI_PLAYER_HEIGHT } from '@/constants/theme';

export default function MiniPlayer() {
  const theme = useVicentTheme();
  const router = useRouter();
  const { state, togglePlay, next } = usePlayer();
  const { currentSong, isPlaying } = state;

  if (!currentSong) {
    return null;
  }

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
  const colorIndex = currentSong.title.length % artworkColors.length;
  const artworkColor = artworkColors[colorIndex];

  // Progress bar width (percentage)
  const progress =
    state.duration > 0 ? (state.position / state.duration) * 100 : 0;

  return (
    <View
      style={[
        styles.wrapper,
        {
          backgroundColor: theme.miniPlayer,
          borderTopColor: theme.border,
        },
      ]}
    >
      {/* Thin progress bar at top */}
      <View style={styles.progressTrack}>
        <View
          style={[
            styles.progressFill,
            {
              width: `${progress}%`,
              backgroundColor: theme.primary,
            },
          ]}
        />
      </View>

      <View style={styles.container}>
        {/* Left side: artwork + info (tappable) */}
        <TouchableOpacity
          onPress={() => router.push('/player')}
          activeOpacity={0.8}
          style={styles.leftSection}
        >
          {(() => {
            const isYt =
              currentSong.id.startsWith('yt_') ||
              currentSong.uri?.includes('youtube.com') ||
              currentSong.genre === 'YouTube';
            return (
              <View
                style={[
                  styles.artwork,
                  { backgroundColor: isYt ? '#FF0000' : artworkColor },
                ]}
              >
                <Ionicons
                  name={isYt ? 'logo-youtube' : 'musical-note'}
                  size={20}
                  color="#FFFFFF"
                />
              </View>
            );
          })()}
          <View style={styles.info}>
            <Text
              numberOfLines={1}
              style={[styles.title, { color: theme.text }]}
            >
              {currentSong.title}
            </Text>
            <Text
              numberOfLines={1}
              style={[styles.artist, { color: theme.textSecondary }]}
            >
              {currentSong.artist}
            </Text>
          </View>
        </TouchableOpacity>

        {/* Right side: controls */}
        <View style={styles.controls}>
          <TouchableOpacity
            onPress={togglePlay}
            activeOpacity={0.7}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            style={styles.controlButton}
          >
            <Ionicons
              name={isPlaying ? 'pause' : 'play'}
              size={26}
              color={theme.text}
            />
          </TouchableOpacity>
          <TouchableOpacity
            onPress={next}
            activeOpacity={0.7}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            style={styles.controlButton}
          >
            <Ionicons name="play-forward" size={22} color={theme.text} />
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    height: MINI_PLAYER_HEIGHT,
    borderTopWidth: StyleSheet.hairlineWidth,
    overflow: 'hidden',
  },
  progressTrack: {
    height: 2,
    backgroundColor: 'rgba(255,255,255,0.05)',
  },
  progressFill: {
    height: 2,
  },
  container: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.lg,
  },
  leftSection: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: Spacing.md,
  },
  artwork: {
    width: 48,
    height: 48,
    borderRadius: BorderRadius.md,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: Spacing.lg,
  },
  info: {
    flex: 1,
    justifyContent: 'center',
  },
  title: {
    fontSize: FontSize.md,
    fontWeight: '600',
    marginBottom: 2,
    letterSpacing: 0.1,
  },
  artist: {
    fontSize: FontSize.sm,
    fontWeight: '400',
  },
  controls: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  controlButton: {
    padding: Spacing.md,
  },
});
