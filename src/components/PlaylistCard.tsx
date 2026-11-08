import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useVicentTheme } from '@/hooks/use-theme';
import { BorderRadius, FontSize, Spacing } from '@/constants/theme';
import type { Playlist } from '@/types/music';

interface PlaylistCardProps {
  playlist: Playlist;
  onPress?: () => void;
  size?: number;
}

export default function PlaylistCard({
  playlist,
  onPress,
  size = 150,
}: PlaylistCardProps) {
  const theme = useVicentTheme();

  const bgColors = [
    '#4F7FFF',
    '#8B5CF6',
    '#06B6D4',
    '#EC4899',
    '#F59E0B',
    '#10B981',
    '#EF4444',
    '#6366F1',
  ];
  const colorIndex = playlist.name.length % bgColors.length;
  const bgColor = bgColors[colorIndex];

  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.8}
      style={[styles.container, { width: size }]}
    >
      <View
        style={[
          styles.artwork,
          {
            width: size,
            height: size,
            backgroundColor: bgColor,
          },
        ]}
      >
        <Ionicons
          name="musical-notes"
          size={size * 0.3}
          color="rgba(255,255,255,0.4)"
        />
      </View>
      <Text
        numberOfLines={1}
        style={[styles.name, { color: theme.text }]}
      >
        {playlist.name}
      </Text>
      <Text
        numberOfLines={1}
        style={[styles.count, { color: theme.textSecondary }]}
      >
        {playlist.songCount} canciones
      </Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    marginRight: Spacing.lg,
  },
  artwork: {
    borderRadius: BorderRadius.lg,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.md,
  },
  name: {
    fontSize: FontSize.md,
    fontWeight: '600',
    marginBottom: Spacing.xs,
    letterSpacing: 0.1,
  },
  count: {
    fontSize: FontSize.sm,
    fontWeight: '400',
  },
});
