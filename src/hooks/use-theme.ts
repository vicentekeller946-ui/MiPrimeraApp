import { useColorScheme } from 'react-native';
import { VicentColors, VicentColorsLight, type VicentTheme } from '@/constants/theme';

/**
 * Returns the active VicentMusic theme palette based on the device color scheme.
 * Default: dark theme.
 */
export function useVicentTheme(): VicentTheme {
  const scheme = useColorScheme();
  return scheme === 'light' ? VicentColorsLight : VicentColors;
}

// Re-export the legacy hook for backwards compat
export { useVicentTheme as useTheme };
