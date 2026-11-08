import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useVicentTheme } from '@/hooks/use-theme';
import { BorderRadius, FontSize, Spacing } from '@/constants/theme';
import type { Album } from '@/types/music';

interface AlbumCardProps {
  album: Album;
  onPress?: () => void;
  size?: number;
}

export default function AlbumCard({
  album,
  onPress,
  size = 150,
}: AlbumCardProps) {
  const theme = useVicentTheme();

  const gradientPairs: [string, string][] = [
    ['#4F7FFF', '#6B9AFF'],
    ['#8B5CF6', '#A78BFA'],
    ['#06B6D4', '#22D3EE'],
    ['#EC4899', '#F472B6'],
    ['#F59E0B', '#FBBF24'],
    ['#10B981', '#34D399'],
    ['#EF4444', '#F87171'],
    ['#6366F1', '#818CF8'],
  ];
  const pairIndex = album.title.length % gradientPairs.length;
  const [colorStart, colorEnd] = gradientPairs[pairIndex];

  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.8}
      style={[styles.container, { width: size }]}
    >
      <LinearGradient
        colors={[colorStart, colorEnd]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={[styles.artwork, { width: size, height: size }]}
      >
        <Ionicons name="disc" size={size * 0.35} color="rgba(255,255,255,0.3)" />
      </LinearGradient>
      <Text
        numberOfLines={1}
        style={[styles.title, { color: theme.text }]}
      >
        {album.title}
      </Text>
      <Text
        numberOfLines={1}
        style={[styles.artist, { color: theme.textSecondary }]}
      >
        {album.artist}
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
});
