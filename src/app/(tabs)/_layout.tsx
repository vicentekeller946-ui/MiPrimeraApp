import { Tabs } from 'expo-router';
import { VicentColors } from '@/constants/theme';
import TabBar from '@/components/TabBar';

export default function TabsLayout() {
  return (
    <Tabs
      tabBar={(props) => <TabBar {...props} />}
      screenOptions={{
        headerShown: false,
        tabBarStyle: { display: 'none' },
      }}>
      <Tabs.Screen
        name="index"
        options={{ title: 'Inicio' }}
      />
      <Tabs.Screen
        name="explore"
        options={{ title: 'Explorar' }}
      />
      <Tabs.Screen
        name="downloads"
        options={{ title: 'Descargas' }}
      />
      <Tabs.Screen
        name="library"
        options={{ title: 'Mi Música' }}
      />
      <Tabs.Screen
        name="profile"
        options={{ title: 'Perfil' }}
      />
    </Tabs>
  );
}
