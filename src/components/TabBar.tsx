import React from 'react';
import {
  View,
  Text,
  Pressable,
  StyleSheet,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useVicentTheme } from '@/hooks/use-theme';
import { FontSize, Spacing, TAB_BAR_HEIGHT } from '@/constants/theme';
import { useRouter } from 'expo-router';
import MiniPlayer from '@/components/MiniPlayer';

export interface TabBarProps {
  state: {
    index: number;
    routes: Array<{ key: string; name: string; params?: any }>;
  };
  descriptors?: Record<string, any>;
  navigation?: {
    emit: (event: any) => any;
    navigate: (name: string, params?: any) => void;
  };
  [key: string]: any;
}

interface TabConfig {
  icon: keyof typeof Ionicons.glyphMap;
  iconOutline: keyof typeof Ionicons.glyphMap;
  label: string;
}

const TAB_CONFIG: Record<string, TabConfig> = {
  index: {
    icon: 'home',
    iconOutline: 'home-outline',
    label: 'Inicio',
  },
  explore: {
    icon: 'compass',
    iconOutline: 'compass-outline',
    label: 'Explorar',
  },
  downloads: {
    icon: 'cloud-download',
    iconOutline: 'cloud-download-outline',
    label: 'Descargas',
  },
  library: {
    icon: 'musical-notes',
    iconOutline: 'musical-notes-outline',
    label: 'Mi Música',
  },
  profile: {
    icon: 'person',
    iconOutline: 'person-outline',
    label: 'Perfil',
  },
};

export default function TabBar(props: TabBarProps) {
  const { state, descriptors, navigation } = props;
  const router = useRouter();
  const theme = useVicentTheme();
  const insets = useSafeAreaInsets();
  const bottomPadding = Platform.OS === 'ios' ? insets.bottom : Spacing.md;

  return (
    <View style={{ backgroundColor: theme.tabBar }}>
      {/* Mini Player above the tab bar */}
      <MiniPlayer />

      {/* Tab bar */}
      <View
        style={[
          styles.tabBar,
          {
            backgroundColor: theme.tabBar,
            borderTopColor: theme.border,
            paddingBottom: bottomPadding,
            height: TAB_BAR_HEIGHT + bottomPadding,
          },
        ]}
      >
        {state.routes.map((route, index) => {
          const isFocused = state.index === index;
          const config = TAB_CONFIG[route.name] || {
            icon: 'ellipse' as keyof typeof Ionicons.glyphMap,
            iconOutline: 'ellipse-outline' as keyof typeof Ionicons.glyphMap,
            label: route.name,
          };

          const onPress = () => {
            if (navigation?.emit) {
              const event = navigation.emit({
                type: 'tabPress',
                target: route.key,
                canPreventDefault: true,
              });
              if (event?.defaultPrevented) return;
            }

            if (!isFocused) {
              if (navigation?.navigate) {
                navigation.navigate(route.name, route.params);
              } else if (props.navigateToTab) {
                props.navigateToTab(route.key);
              } else {
                router.navigate(`/(tabs)/${route.name === 'index' ? '' : route.name}` as any);
              }
            }
          };

          const onLongPress = () => {
            if (navigation?.emit) {
              navigation.emit({
                type: 'tabLongPress',
                target: route.key,
              });
            }
          };

          const iconColor = isFocused ? theme.primary : theme.textMuted;
          const iconName = isFocused ? config.icon : config.iconOutline;

          return (
            <Pressable
              key={route.key}
              onPress={onPress}
              onLongPress={onLongPress}
              accessibilityRole="button"
              accessibilityState={isFocused ? { selected: true } : {}}
              accessibilityLabel={config.label}
              style={styles.tab}
            >
              <Ionicons name={iconName} size={22} color={iconColor} />
              <Text
                style={[
                  styles.label,
                  { color: iconColor },
                  isFocused && styles.labelActive,
                ]}
              >
                {config.label}
              </Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  tabBar: {
    flexDirection: 'row',
    borderTopWidth: StyleSheet.hairlineWidth,
    paddingTop: Spacing.md,
  },
  tab: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.xs,
  },
  label: {
    fontSize: FontSize.xs,
    fontWeight: '500',
    marginTop: Spacing.xs,
  },
  labelActive: {
    fontWeight: '700',
  },
});
