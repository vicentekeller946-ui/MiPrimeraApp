import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
} from 'react-native';
import { useVicentTheme } from '@/hooks/use-theme';
import { BorderRadius, FontSize, Spacing } from '@/constants/theme';
import type { Genre } from '@/types/music';

interface GenreCardProps {
  genre: Genre;
  onPress?: () => void;
}

export default function GenreCard({ genre, onPress }: GenreCardProps) {
  const theme = useVicentTheme();

  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.8}
      style={[
        styles.container,
        { backgroundColor: genre.color || theme.surface },
      ]}
    >
      <Text style={styles.emoji}>{genre.icon}</Text>
      <Text
        numberOfLines={2}
        style={[styles.name, { color: '#FFFFFF' }]}
      >
        {genre.name}
      </Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    width: 110,
    height: 110,
    borderRadius: BorderRadius.xl,
    padding: Spacing.lg,
    justifyContent: 'space-between',
    overflow: 'hidden',
    marginRight: Spacing.lg,
  },
  emoji: {
    fontSize: 28,
  },
  name: {
    fontSize: FontSize.sm,
    fontWeight: '700',
    letterSpacing: 0.2,
  },
});
