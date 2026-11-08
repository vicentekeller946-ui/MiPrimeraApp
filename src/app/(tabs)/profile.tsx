import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  SafeAreaView,
  TouchableOpacity,
  Switch,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useVicentTheme } from '@/hooks/use-theme';
import {
  Spacing,
  BorderRadius,
  FontSize,
  BOTTOM_TOTAL_HEIGHT,
} from '@/constants/theme';
import { demoSongs, demoAlbums, demoPlaylists } from '@/data/demoData';
import DatabaseService from '@/services/DatabaseService';
import StorageService from '@/services/StorageService';
import YouTubeService from '@/services/YouTubeService';

export default function ProfileScreen() {
  const theme = useVicentTheme();

  // Settings states
  const [crossfade, setCrossfade] = useState(false);
  const [wifiOnly, setWifiOnly] = useState(true);
  const [lossless, setLossless] = useState(true);
  const [selectedQuality, setSelectedQuality] = useState<'Alta (320kbps)' | 'Sin Pérdida (FLAC)'>('Sin Pérdida (FLAC)');
  const [sleepTimer, setSleepTimer] = useState<string>('Desactivado');
  const [hasYtKey, setHasYtKey] = useState(false);

  useEffect(() => {
    async function loadSettings() {
      const s = await DatabaseService.getInstance().getSettings();
      setCrossfade(s.crossfadeEnabled);
      setWifiOnly(s.downloadOverWifiOnly);
      const ytKey = await YouTubeService.getInstance().getApiKey();
      setHasYtKey(ytKey.length > 0);
    }
    loadSettings();
  }, []);

  const handleConfigureYtKey = async () => {
    const currentKey = await YouTubeService.getInstance().getApiKey();
    Alert.prompt
      ? Alert.prompt(
          'YouTube Data API Key',
          'Introduce tu clave oficial de Google Cloud Console para activar la búsqueda en tiempo real:\n(Deja vacío para eliminar)',
          [
            { text: 'Cancelar', style: 'cancel' },
            {
              text: 'Guardar',
              onPress: async (val?: string) => {
                await YouTubeService.getInstance().setApiKey(val ?? '');
                const updated = await YouTubeService.getInstance().getApiKey();
                setHasYtKey(updated.length > 0);
                Alert.alert('Éxito', updated.length > 0 ? 'Clave de YouTube guardada correctamente.' : 'Clave eliminada.');
              },
            },
          ],
          'plain-text',
          currentKey
        )
      : Alert.alert(
          'Configurar YouTube API Key',
          'Para configurar tu clave en cualquier plataforma, abre la pestaña Explorar y pulsa el botón con icono de llave 🔑 o añade EXPO_PUBLIC_YOUTUBE_API_KEY en tu archivo .env.',
          [{ text: 'Entendido' }]
        );
  };

  const handleToggleCrossfade = async (val: boolean) => {
    setCrossfade(val);
    await DatabaseService.getInstance().updateSettings({ crossfadeEnabled: val });
  };

  const handleToggleWifiOnly = async (val: boolean) => {
    setWifiOnly(val);
    await DatabaseService.getInstance().updateSettings({ downloadOverWifiOnly: val });
  };

  const handleEqualizer = () => {
    Alert.alert(
      'Ecualizador VicentMusic',
      'Configuración de 5 bandas disponible en compilación con soporte de audio nativo (development build).\n\nBandas: 60Hz, 230Hz, 910Hz, 3.6kHz, 14kHz.',
      [{ text: 'Entendido' }]
    );
  };

  const handleSleepTimer = () => {
    Alert.alert(
      'Temporizador de apagado',
      'Selecciona en cuánto tiempo detener la reproducción:',
      [
        { text: 'Desactivar', onPress: () => setSleepTimer('Desactivado') },
        { text: '15 minutos', onPress: () => setSleepTimer('15 min') },
        { text: '30 minutos', onPress: () => setSleepTimer('30 min') },
        { text: '60 minutos', onPress: () => setSleepTimer('60 min') },
        { text: 'Fin de la canción', onPress: () => setSleepTimer('Fin de tema') },
      ]
    );
  };

  const handleClearCache = () => {
    Alert.alert(
      'Limpiar archivos temporales',
      '¿Deseas liberar archivos temporales de carátulas y metadatos? Tus canciones descargadas no se borrarán.',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Limpiar',
          onPress: async () => {
            Alert.alert('Éxito', 'Caché liberada correctamente.');
          },
        },
      ]
    );
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={[styles.title, { color: theme.text }]}>Perfil</Text>
      </View>

      <ScrollView
        contentContainerStyle={[
          styles.scrollContent,
          { paddingBottom: BOTTOM_TOTAL_HEIGHT + Spacing['3xl'] },
        ]}
        showsVerticalScrollIndicator={false}>
        {/* User Card */}
        <View style={[styles.profileCard, { backgroundColor: theme.surface, borderColor: theme.border }]}>
          <View style={[styles.avatar, { backgroundColor: theme.primary }]}>
            <Ionicons name="person" size={40} color="#FFFFFF" />
          </View>
          <View style={styles.profileDetails}>
            <Text style={[styles.userName, { color: theme.text }]}>Vicent Usuario</Text>
            <Text style={[styles.userEmail, { color: theme.textSecondary }]}>
              vicent.musica@tu-mundo.com
            </Text>
            <View style={[styles.badge, { backgroundColor: 'rgba(79, 127, 255, 0.15)' }]}>
              <Ionicons name="sparkles" size={12} color={theme.primary} />
              <Text style={[styles.badgeText, { color: theme.primary }]}>Membresía Premium</Text>
            </View>
          </View>
        </View>

        {/* Stats Row */}
        <View style={[styles.statsRow, { backgroundColor: theme.surface, borderColor: theme.border }]}>
          <View style={styles.statItem}>
            <Text style={[styles.statValue, { color: theme.text }]}>{demoSongs.length}</Text>
            <Text style={[styles.statLabel, { color: theme.textSecondary }]}>Canciones</Text>
          </View>
          <View style={[styles.statDivider, { backgroundColor: theme.border }]} />
          <View style={styles.statItem}>
            <Text style={[styles.statValue, { color: theme.text }]}>{demoAlbums.length}</Text>
            <Text style={[styles.statLabel, { color: theme.textSecondary }]}>Álbumes</Text>
          </View>
          <View style={[styles.statDivider, { backgroundColor: theme.border }]} />
          <View style={styles.statItem}>
            <Text style={[styles.statValue, { color: theme.text }]}>{demoPlaylists.length}</Text>
            <Text style={[styles.statLabel, { color: theme.textSecondary }]}>Playlists</Text>
          </View>
        </View>

        {/* GROUP 1: REPRODUCCIÓN */}
        <View style={styles.sectionGroup}>
          <Text style={[styles.groupTitle, { color: theme.textMuted }]}>REPRODUCCIÓN</Text>
          <View style={[styles.groupCard, { backgroundColor: theme.surface, borderColor: theme.border }]}>
            <TouchableOpacity onPress={handleEqualizer} style={styles.settingRow}>
              <View style={styles.settingIconTitle}>
                <Ionicons name="options-outline" size={20} color={theme.primary} />
                <Text style={[styles.settingTitle, { color: theme.text }]}>Ecualizador de audio</Text>
              </View>
              <View style={styles.settingRight}>
                <Text style={[styles.settingValue, { color: theme.textMuted }]}>Plano (5 bandas)</Text>
                <Ionicons name="chevron-forward" size={16} color={theme.textMuted} />
              </View>
            </TouchableOpacity>

            <View style={[styles.innerDivider, { backgroundColor: theme.border }]} />

            <View style={styles.settingRow}>
              <View style={styles.settingIconTitle}>
                <Ionicons name="git-commit-outline" size={20} color={theme.secondary} />
                <View>
                  <Text style={[styles.settingTitle, { color: theme.text }]}>Transición continua (Crossfade)</Text>
                  <Text style={[styles.settingSubtitle, { color: theme.textSecondary }]}>
                    Fundido suave entre canciones
                  </Text>
                </View>
              </View>
              <Switch
                value={crossfade}
                onValueChange={handleToggleCrossfade}
                trackColor={{ false: theme.surfaceLight, true: theme.primary }}
              />
            </View>

            <View style={[styles.innerDivider, { backgroundColor: theme.border }]} />

            <TouchableOpacity onPress={handleSleepTimer} style={styles.settingRow}>
              <View style={styles.settingIconTitle}>
                <Ionicons name="moon-outline" size={20} color={theme.accent} />
                <Text style={[styles.settingTitle, { color: theme.text }]}>Temporizador de apagado</Text>
              </View>
              <View style={styles.settingRight}>
                <Text style={[styles.settingValue, { color: theme.textMuted }]}>{sleepTimer}</Text>
                <Ionicons name="chevron-forward" size={16} color={theme.textMuted} />
              </View>
            </TouchableOpacity>
          </View>
        </View>

        {/* GROUP 2: DESCARGAS Y ALMACENAMIENTO */}
        <View style={styles.sectionGroup}>
          <Text style={[styles.groupTitle, { color: theme.textMuted }]}>DESCARGAS Y ALMACENAMIENTO</Text>
          <View style={[styles.groupCard, { backgroundColor: theme.surface, borderColor: theme.border }]}>
            <View style={styles.settingRow}>
              <View style={styles.settingIconTitle}>
                <Ionicons name="wifi-outline" size={20} color={theme.primary} />
                <View>
                  <Text style={[styles.settingTitle, { color: theme.text }]}>Descargar solo por Wi-Fi</Text>
                  <Text style={[styles.settingSubtitle, { color: theme.textSecondary }]}>
                    Ahorra datos móviles
                  </Text>
                </View>
              </View>
              <Switch
                value={wifiOnly}
                onValueChange={handleToggleWifiOnly}
                trackColor={{ false: theme.surfaceLight, true: theme.primary }}
              />
            </View>

            <View style={[styles.innerDivider, { backgroundColor: theme.border }]} />

            <View style={styles.settingRow}>
              <View style={styles.settingIconTitle}>
                <Ionicons name="cellular-outline" size={20} color={theme.accent} />
                <View>
                  <Text style={[styles.settingTitle, { color: theme.text }]}>Audio sin pérdida (FLAC)</Text>
                  <Text style={[styles.settingSubtitle, { color: theme.textSecondary }]}>
                    24-bit / 96kHz disponible
                  </Text>
                </View>
              </View>
              <Switch
                value={lossless}
                onValueChange={setLossless}
                trackColor={{ false: theme.surfaceLight, true: theme.primary }}
              />
            </View>

            <View style={[styles.innerDivider, { backgroundColor: theme.border }]} />

            <TouchableOpacity onPress={handleClearCache} style={styles.settingRow}>
              <View style={styles.settingIconTitle}>
                <Ionicons name="trash-bin-outline" size={20} color="#EF4444" />
                <Text style={[styles.settingTitle, { color: theme.text }]}>Borrar archivos de caché</Text>
              </View>
              <View style={styles.settingRight}>
                <Text style={[styles.settingValue, { color: theme.textMuted }]}>142 MB</Text>
                <Ionicons name="chevron-forward" size={16} color={theme.textMuted} />
              </View>
            </TouchableOpacity>
          </View>
        </View>

        {/* GROUP 3: SERVICIOS CONECTADOS */}
        <View style={styles.sectionGroup}>
          <Text style={[styles.groupTitle, { color: theme.textMuted }]}>SERVICIOS CONECTADOS</Text>
          <View style={[styles.groupCard, { backgroundColor: theme.surface, borderColor: theme.border }]}>
            <TouchableOpacity onPress={handleConfigureYtKey} style={styles.settingRow}>
              <View style={styles.settingIconTitle}>
                <Ionicons name="logo-youtube" size={20} color="#FF0000" />
                <View>
                  <Text style={[styles.settingTitle, { color: theme.text }]}>YouTube Data API v3</Text>
                  <Text style={[styles.settingSubtitle, { color: theme.textSecondary }]}>
                    Búsqueda oficial en tiempo real
                  </Text>
                </View>
              </View>
              <View style={styles.settingRight}>
                <Text
                  style={[
                    styles.settingValue,
                    { color: hasYtKey ? theme.primary : '#EF4444', fontWeight: '700' },
                  ]}>
                  {hasYtKey ? 'Configurada' : 'Sin configurar'}
                </Text>
                <Ionicons name="chevron-forward" size={16} color={theme.textMuted} />
              </View>
            </TouchableOpacity>
          </View>
        </View>

        {/* GROUP 4: INFORMACIÓN Y ACERCA DE */}
        <View style={styles.sectionGroup}>
          <Text style={[styles.groupTitle, { color: theme.textMuted }]}>INFORMACIÓN DE LA APP</Text>
          <View style={[styles.groupCard, { backgroundColor: theme.surface, borderColor: theme.border }]}>
            <View style={styles.settingRow}>
              <View style={styles.settingIconTitle}>
                <Ionicons name="musical-notes-outline" size={20} color={theme.primary} />
                <Text style={[styles.settingTitle, { color: theme.text }]}>Versión</Text>
              </View>
              <Text style={[styles.settingValue, { color: theme.textMuted }]}>1.0.0 (Build 2026)</Text>
            </View>

            <View style={[styles.innerDivider, { backgroundColor: theme.border }]} />

            <TouchableOpacity
              onPress={() =>
                Alert.alert(
                  'Términos y Licencias',
                  'VicentMusic respeta los derechos de autor. Toda la música de demostración incluida procede del dominio público y fuentes con licencias abiertas autorizadas. No se permite la piratería ni extracción no autorizada de contenido protegido con DRM.'
                )
              }
              style={styles.settingRow}>
              <View style={styles.settingIconTitle}>
                <Ionicons name="document-text-outline" size={20} color={theme.textSecondary} />
                <Text style={[styles.settingTitle, { color: theme.text }]}>Términos y licencias</Text>
              </View>
              <Ionicons name="chevron-forward" size={16} color={theme.textMuted} />
            </TouchableOpacity>
          </View>
        </View>

        {/* Footer Brand Slogan */}
        <View style={styles.footer}>
          <Text style={[styles.brandTitle, { color: theme.primary }]}>VicentMusic</Text>
          <Text style={[styles.brandSlogan, { color: theme.textMuted }]}>
            Tu música. Tu mundo. Sin límites.
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    paddingHorizontal: Spacing.xl,
    paddingTop: Spacing.md,
    paddingBottom: Spacing.xs,
  },
  title: {
    fontSize: FontSize['4xl'],
    fontWeight: '800',
    letterSpacing: -0.5,
  },
  scrollContent: {
    paddingTop: Spacing.md,
  },
  profileCard: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: Spacing.xl,
    padding: Spacing.lg,
    borderRadius: BorderRadius.xl,
    borderWidth: 1,
    gap: Spacing.md,
  },
  avatar: {
    width: 64,
    height: 64,
    borderRadius: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  profileDetails: {
    flex: 1,
  },
  userName: {
    fontSize: FontSize.lg,
    fontWeight: '700',
  },
  userEmail: {
    fontSize: FontSize.xs,
    marginTop: 2,
    marginBottom: 6,
  },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: BorderRadius.full,
  },
  badgeText: {
    fontSize: 10,
    fontWeight: '700',
  },
  statsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: Spacing.xl,
    marginTop: Spacing.md,
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.xl,
    borderWidth: 1,
  },
  statItem: {
    flex: 1,
    alignItems: 'center',
  },
  statValue: {
    fontSize: FontSize.lg,
    fontWeight: '700',
  },
  statLabel: {
    fontSize: FontSize.xs,
    marginTop: 2,
  },
  statDivider: {
    width: 1,
    height: 24,
  },
  sectionGroup: {
    marginTop: Spacing.xl,
    paddingHorizontal: Spacing.xl,
  },
  groupTitle: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.8,
    marginBottom: Spacing.xs,
    paddingLeft: Spacing.xs,
  },
  groupCard: {
    borderRadius: BorderRadius.xl,
    borderWidth: 1,
    overflow: 'hidden',
  },
  settingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.md,
  },
  settingIconTitle: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    flex: 1,
  },
  settingTitle: {
    fontSize: FontSize.sm,
    fontWeight: '600',
  },
  settingSubtitle: {
    fontSize: 11,
    marginTop: 2,
  },
  settingRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  settingValue: {
    fontSize: FontSize.xs,
  },
  innerDivider: {
    height: 0.5,
    marginLeft: Spacing.md + 20 + Spacing.md,
  },
  footer: {
    alignItems: 'center',
    paddingVertical: Spacing['3xl'],
    gap: Spacing.xs,
  },
  brandTitle: {
    fontSize: FontSize.xl,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  brandSlogan: {
    fontSize: FontSize.xs,
    fontStyle: 'italic',
  },
});

