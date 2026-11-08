import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { PlayerProvider } from '@/context/PlayerContext';
import { VicentColors } from '@/constants/theme';

export default function RootLayout() {
  return (
    <PlayerProvider>
      <StatusBar style="light" />
      <Stack
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: VicentColors.background },
          animation: 'slide_from_bottom',
        }}>
        <Stack.Screen name="(tabs)" />
        <Stack.Screen
          name="player"
          options={{
            presentation: 'modal',
            animation: 'slide_from_bottom',
          }}
        />
      </Stack>
    </PlayerProvider>
  );
}
