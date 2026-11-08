import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ViewStyle,
  StyleProp,
} from 'react-native';
import { useVicentTheme } from '@/hooks/use-theme';
import { FontSize, Spacing } from '@/constants/theme';

interface SectionHeaderProps {
  title: string;
  onSeeAll?: () => void;
  style?: StyleProp<ViewStyle>;
}

export default function SectionHeader({
  title,
  onSeeAll,
  style,
}: SectionHeaderProps) {
  const theme = useVicentTheme();

  return (
    <View style={[styles.container, style]}>
      <Text style={[styles.title, { color: theme.text }]}>{title}</Text>
      {onSeeAll && (
        <TouchableOpacity onPress={onSeeAll} activeOpacity={0.7}>
          <Text style={[styles.seeAll, { color: theme.primary }]}>
            Ver todo
          </Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.xl,
    paddingVertical: Spacing.lg,
  },
  title: {
    fontSize: FontSize.xl,
    fontWeight: '700',
    letterSpacing: 0.3,
  },
  seeAll: {
    fontSize: FontSize.md,
    fontWeight: '600',
  },
});
