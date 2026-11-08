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
import type { Artist } from '@/types/music';

interface ArtistCardProps {
  artist: Artist;
  onPress?: () => void;
  size?: number;
}

export default function ArtistCard({
  artist,
  onPress,
  size = 100,
}: ArtistCardProps) {
  const theme = useVicentTheme();

  const avatarColors = [
    '#4F7FFF',
    '#8B5CF6',
    '#06B6D4',
    '#EC4899',
    '#F59E0B',
    '#10B981',
    '#EF4444',
    '#6366F1',
  ];
  const colorIndex = artist.name.length % avatarColors.length;
  const avatarColor = avatarColors[colorIndex];

  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.8}
      style={[styles.container, { width: size }]}
    >
      <View
        style={[
          styles.avatar,
          {
            width: size,
            height: size,
            borderRadius: size / 2,
            backgroundColor: avatarColor,
          },
        ]}
      >
        <Ionicons
          name="person"
          size={size * 0.4}
          color="rgba(255,255,255,0.5)"
        />
      </View>
      <Text
        numberOfLines={1}
        style={[styles.name, { color: theme.text }]}
      >
        {artist.name}
      </Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    marginRight: Spacing.xl,
  },
  avatar: {
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.md,
  },
  name: {
    fontSize: FontSize.sm,
    fontWeight: '600',
    textAlign: 'center',
    letterSpacing: 0.1,
  },
});
