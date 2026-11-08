import React, { useState } from 'react';
import {
  Modal,
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  SafeAreaView,
  ScrollView,
  Dimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useVicentTheme } from '@/hooks/use-theme';
import { Spacing, BorderRadius, FontSize } from '@/constants/theme';
import DatabaseService from '@/services/DatabaseService';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

interface EqualizerModalProps {
  visible: boolean;
  onClose: () => void;
}

interface Preset {
  id: string;
  name: string;
  icon: string;
  gains: number[]; // 5 bands in dB (-12 to +12)
}

const PRESETS: Preset[] = [
  { id: 'flat', name: 'Plano', icon: 'remove-outline', gains: [0, 0, 0, 0, 0] },
  { id: 'bass', name: 'Graves Potentes', icon: 'radio-outline', gains: [6, 4, 1, 0, -1] },
  { id: 'vocal', name: 'Claridad Vocal', icon: 'mic-outline', gains: [-2, 1, 5, 3, 1] },
  { id: 'treble', name: 'Agudos Brillantes', icon: 'sparkles-outline', gains: [-1, 0, 1, 4, 6] },
  { id: 'electronic', name: 'Electrónica Vicent', icon: 'flash-outline', gains: [5, 3, -1, 2, 4] },
  { id: 'acoustic', name: 'Acústico Calma', icon: 'musical-notes-outline', gains: [3, 2, 0, 2, 3] },
];

const BANDS = ['60 Hz', '230 Hz', '910 Hz', '3.6 kHz', '14 kHz'];

export default function EqualizerModal({ visible, onClose }: EqualizerModalProps) {
  const theme = useVicentTheme();
  const [selectedPreset, setSelectedPreset] = useState<string>('electronic');
  const [currentGains, setCurrentGains] = useState<number[]>([5, 3, -1, 2, 4]);
  const [eqEnabled, setEqEnabled] = useState(true);

  const handleSelectPreset = (preset: Preset) => {
    setSelectedPreset(preset.id);
    setCurrentGains([...preset.gains]);
    DatabaseService.getInstance().updateSettings({ equalizerPreset: preset.id });
  };

  const adjustGain = (index: number, delta: number) => {
    setSelectedPreset('custom');
    setCurrentGains((prev) => {
      const next = [...prev];
      next[index] = Math.max(-12, Math.min(12, next[index] + delta));
      return next;
    });
  };

  return (
    <Modal visible={visible} animationType="slide" transparent={true} onRequestClose={onClose}>
      <View style={styles.overlay}>
        <SafeAreaView style={[styles.modalCard, { backgroundColor: theme.surface, borderColor: theme.border }]}>
          {/* Header */}
          <View style={styles.header}>
            <View style={styles.headerTitleRow}>
              <Ionicons name="pulse" size={22} color={theme.primary} />
              <Text style={[styles.headerTitle, { color: theme.text }]}>Ecualizador de Audio</Text>
            </View>
            <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
              <Ionicons name="close" size={22} color={theme.textMuted} />
            </TouchableOpacity>
          </View>

          <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>
            {/* Presets Horizontal Row */}
            <Text style={[styles.sectionSubtitle, { color: theme.textMuted }]}>PERFILES DE SONIDO</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.presetsRow}>
              {PRESETS.map((p) => {
                const isSelected = selectedPreset === p.id;
                return (
                  <TouchableOpacity
                    key={p.id}
                    onPress={() => handleSelectPreset(p)}
                    style={[
                      styles.presetChip,
                      {
                        backgroundColor: isSelected ? theme.primary : theme.surfaceLight,
                        borderColor: theme.border,
                      },
                    ]}>
                    <Ionicons
                      name={p.icon as any}
                      size={14}
                      color={isSelected ? '#FFFFFF' : theme.textSecondary}
                    />
                    <Text
                      style={[
                        styles.presetName,
                        { color: isSelected ? '#FFFFFF' : theme.textSecondary },
                      ]}>
                      {p.name}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>

            {/* 5-Band Equalizer Sliders Display */}
            <View style={[styles.eqBoard, { backgroundColor: theme.background, borderColor: theme.border }]}>
              <Text style={[styles.dbReference, { color: theme.textMuted }]}>+12 dB</Text>
              <View style={styles.bandsRow}>
                {BANDS.map((band, idx) => {
                  const gain = currentGains[idx];
                  // Convert dB (-12 to +12) to percentage height (0 to 100)
                  const heightPercent = Math.max(10, Math.min(100, ((gain + 12) / 24) * 100));

                  return (
                    <View key={band} style={styles.bandColumn}>
                      <TouchableOpacity
                        onPress={() => adjustGain(idx, 2)}
                        style={styles.stepBtn}>
                        <Ionicons name="chevron-up" size={16} color={theme.textMuted} />
                      </TouchableOpacity>

                      <View style={[styles.sliderTrack, { backgroundColor: theme.surfaceLight }]}>
                        <View
                          style={[
                            styles.sliderFill,
                            {
                              backgroundColor: theme.primary,
                              height: `${heightPercent}%`,
                            },
                          ]}
                        />
                      </View>

                      <TouchableOpacity
                        onPress={() => adjustGain(idx, -2)}
                        style={styles.stepBtn}>
                        <Ionicons name="chevron-down" size={16} color={theme.textMuted} />
                      </TouchableOpacity>

                      <Text style={[styles.gainText, { color: theme.text }]}>
                        {gain > 0 ? `+${gain}` : gain}
                      </Text>
                      <Text style={[styles.bandLabel, { color: theme.textMuted }]}>{band}</Text>
                    </View>
                  );
                })}
              </View>
              <Text style={[styles.dbReferenceBottom, { color: theme.textMuted }]}>-12 dB</Text>
            </View>

            {/* Hardware Status Note */}
            <View style={[styles.techNote, { backgroundColor: theme.surfaceLight }]}>
              <Ionicons name="hardware-chip-outline" size={16} color={theme.secondary} />
              <Text style={[styles.techNoteText, { color: theme.textSecondary }]}>
                Procesamiento digital de señal (DSP) de punto flotante activo para audio de alta fidelidad.
              </Text>
            </View>
          </ScrollView>
        </SafeAreaView>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.75)',
    justifyContent: 'flex-end',
  },
  modalCard: {
    borderTopLeftRadius: BorderRadius['2xl'],
    borderTopRightRadius: BorderRadius['2xl'],
    borderTopWidth: 1,
    maxHeight: '80%',
    paddingBottom: Spacing.xl,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.xl,
    paddingVertical: Spacing.lg,
    borderBottomWidth: 0.5,
    borderBottomColor: 'rgba(255, 255, 255, 0.1)',
  },
  headerTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  headerTitle: {
    fontSize: FontSize.lg,
    fontWeight: '700',
  },
  closeBtn: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
  content: {
    padding: Spacing.xl,
  },
  sectionSubtitle: {
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 1,
    marginBottom: Spacing.sm,
  },
  presetsRow: {
    gap: Spacing.sm,
    paddingBottom: Spacing.lg,
  },
  presetChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: Spacing.md,
    paddingVertical: 8,
    borderRadius: BorderRadius.full,
    borderWidth: 1,
  },
  presetName: {
    fontSize: FontSize.xs,
    fontWeight: '600',
  },
  eqBoard: {
    borderRadius: BorderRadius.xl,
    borderWidth: 1,
    padding: Spacing.lg,
    marginVertical: Spacing.md,
    position: 'relative',
  },
  dbReference: {
    fontSize: 9,
    fontWeight: '600',
    textAlign: 'right',
  },
  dbReferenceBottom: {
    fontSize: 9,
    fontWeight: '600',
    textAlign: 'right',
    marginTop: 4,
  },
  bandsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: Spacing.md,
  },
  bandColumn: {
    alignItems: 'center',
    flex: 1,
  },
  stepBtn: {
    padding: 4,
  },
  sliderTrack: {
    width: 8,
    height: 120,
    borderRadius: 4,
    overflow: 'hidden',
    justifyContent: 'flex-end',
    marginVertical: 4,
  },
  sliderFill: {
    width: '100%',
    borderRadius: 4,
  },
  gainText: {
    fontSize: 10,
    fontWeight: '700',
    marginTop: 4,
  },
  bandLabel: {
    fontSize: 9,
    marginTop: 2,
  },
  techNote: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    padding: Spacing.md,
    borderRadius: BorderRadius.lg,
    marginTop: Spacing.sm,
  },
  techNoteText: {
    fontSize: 11,
    flex: 1,
    lineHeight: 15,
  },
});

