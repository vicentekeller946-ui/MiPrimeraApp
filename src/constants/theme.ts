/**
 * VicentMusic — Design System & Theme
 *
 * Colores: Negro, gris oscuro, azul eléctrico, morado.
 * Tema predeterminado: Oscuro.
 */

import { Platform } from 'react-native';

/* ─── VicentMusic Dark Palette ─── */
export const VicentColors = {
  // Core backgrounds
  background: '#0A0A0F',
  surface: '#1A1A2E',
  surfaceLight: '#252540',
  surfaceHighlight: '#2E2E4A',
  cardBg: '#16162A',
  backgroundElement: '#1A1A2E',
  backgroundSelected: '#252540',

  // Accent colors
  primary: '#4F7FFF',        // Electric Blue
  primaryLight: '#6B9AFF',
  secondary: '#8B5CF6',      // Purple
  secondaryLight: '#A78BFA',
  accent: '#06B6D4',         // Cyan

  // Text
  text: '#FFFFFF',
  textSecondary: '#9CA3AF',
  textMuted: '#6B7280',
  textInverse: '#0A0A0F',

  // UI elements
  border: '#2A2A3E',
  borderLight: '#3A3A50',
  tabBar: '#0F0F1A',
  miniPlayer: '#1A1A2E',

  // Status
  error: '#EF4444',
  success: '#10B981',
  warning: '#F59E0B',

  // Gradient
  gradientStart: '#4F7FFF',
  gradientEnd: '#8B5CF6',

  // Overlay
  overlay: 'rgba(0, 0, 0, 0.6)',
  overlayLight: 'rgba(0, 0, 0, 0.3)',
} as const;

/* ─── VicentMusic Light Palette ─── */
export const VicentColorsLight = {
  background: '#F8F9FA',
  surface: '#FFFFFF',
  surfaceLight: '#F0F1F5',
  surfaceHighlight: '#E8E9ED',
  cardBg: '#FFFFFF',
  backgroundElement: '#F0F1F5',
  backgroundSelected: '#E8E9ED',

  primary: '#4F7FFF',
  primaryLight: '#6B9AFF',
  secondary: '#8B5CF6',
  secondaryLight: '#A78BFA',
  accent: '#06B6D4',

  text: '#1A1A2E',
  textSecondary: '#6B7280',
  textMuted: '#9CA3AF',
  textInverse: '#FFFFFF',

  border: '#E5E7EB',
  borderLight: '#D1D5DB',
  tabBar: '#FFFFFF',
  miniPlayer: '#FFFFFF',

  error: '#EF4444',
  success: '#10B981',
  warning: '#F59E0B',

  gradientStart: '#4F7FFF',
  gradientEnd: '#8B5CF6',

  overlay: 'rgba(0, 0, 0, 0.4)',
  overlayLight: 'rgba(0, 0, 0, 0.1)',
} as const;

export type VicentTheme = {
  [K in keyof typeof VicentColors]: string;
};

/* ─── Legacy Colors (backward compatibility) ─── */
export const Colors = {
  light: {
    text: VicentColorsLight.text,
    background: VicentColorsLight.background,
    backgroundElement: VicentColorsLight.surface,
    backgroundSelected: VicentColorsLight.surfaceLight,
    textSecondary: VicentColorsLight.textSecondary,
  },
  dark: {
    text: VicentColors.text,
    background: VicentColors.background,
    backgroundElement: VicentColors.surface,
    backgroundSelected: VicentColors.surfaceLight,
    textSecondary: VicentColors.textSecondary,
  },
} as const;

export type ThemeColor = keyof VicentTheme;

/* ─── Typography ─── */
export const Fonts = Platform.select({
  ios: {
    sans: 'system-ui',
    serif: 'ui-serif',
    rounded: 'ui-rounded',
    mono: 'ui-monospace',
  },
  default: {
    sans: 'normal',
    serif: 'serif',
    rounded: 'normal',
    mono: 'monospace',
  },
  web: {
    sans: 'var(--font-display)',
    serif: 'var(--font-serif)',
    rounded: 'var(--font-rounded)',
    mono: 'var(--font-mono)',
  },
});

/* ─── Spacing ─── */
export const Spacing = {
  xs: 2,
  sm: 4,
  md: 8,
  lg: 12,
  xl: 16,
  '2xl': 20,
  '3xl': 24,
  '4xl': 32,
  '5xl': 48,
  '6xl': 64,
  // Legacy aliases
  half: 2,
  one: 4,
  two: 8,
  three: 16,
  four: 24,
  five: 32,
  six: 64,
} as const;

/* ─── Border Radius ─── */
export const BorderRadius = {
  sm: 4,
  md: 8,
  lg: 12,
  xl: 16,
  '2xl': 20,
  full: 9999,
} as const;

/* ─── Font Sizes ─── */
export const FontSize = {
  xs: 10,
  sm: 12,
  md: 14,
  lg: 16,
  xl: 18,
  '2xl': 20,
  '3xl': 24,
  '4xl': 28,
  '5xl': 32,
  '6xl': 40,
  '7xl': 48,
} as const;

/* ─── Layout Constants ─── */
export const MINI_PLAYER_HEIGHT = 64;
export const TAB_BAR_HEIGHT = Platform.select({ ios: 85, android: 65 }) ?? 65;
export const BOTTOM_TOTAL_HEIGHT = MINI_PLAYER_HEIGHT + TAB_BAR_HEIGHT;

// Legacy
export const BottomTabInset = Platform.select({ ios: 50, android: 80 }) ?? 0;
export const MaxContentWidth = 800;
