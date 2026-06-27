import { useRouter } from 'expo-router';
import { Pressable, ScrollView, StyleSheet, Switch, Text, View } from 'react-native';

import { playScanFeedback } from '../src/feedback/feedback';
import { useSettingsStore } from '../src/state/settingsStore';
import { colors } from '../src/ui/theme';
import { getAppVersion, getDeviceId } from '../src/utils/device';

export default function SettingsScreen() {
  const router = useRouter();
  const { hapticsEnabled, soundEnabled, setHaptics, setSound } = useSettingsStore();

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
      <Text style={styles.section}>Scan feedback</Text>

      <ToggleRow
        title="Vibrate on scan"
        subtitle="Haptic buzz mapped to valid / warning / rejected."
        value={hapticsEnabled}
        onValueChange={(v) => {
          setHaptics(v);
          if (v) playScanFeedback('green'); // preview
        }}
      />

      <ToggleRow
        title="Beep on scan"
        subtitle="Play a short tone for each result (plays on silent too)."
        value={soundEnabled}
        onValueChange={(v) => {
          setSound(v);
          if (v) playScanFeedback('green'); // preview
        }}
      />

      <Text style={styles.section}>About this device</Text>
      <InfoRow label="App version" value={getAppVersion()} />
      <InfoRow label="Device ID" value={getDeviceId()} mono />
      <Text style={styles.note}>
        The device ID and app version are sent with every ticket scan (ID in the body, version as
        the X-App-Version header).
      </Text>

      <Text style={styles.section}>About</Text>
      <Pressable
        style={({ pressed }) => [styles.infoRow, pressed && styles.rowPressed]}
        onPress={() => router.push('/about')}
      >
        <Text style={styles.rowTitle}>About Open Ticket Scanner</Text>
        <Text style={styles.chevron}>›</Text>
      </Pressable>
    </ScrollView>
  );
}

function ToggleRow({
  title,
  subtitle,
  value,
  onValueChange,
}: {
  title: string;
  subtitle: string;
  value: boolean;
  onValueChange: (v: boolean) => void;
}) {
  return (
    <View style={styles.row}>
      <View style={styles.rowText}>
        <Text style={styles.rowTitle}>{title}</Text>
        <Text style={styles.rowSub}>{subtitle}</Text>
      </View>
      <Switch value={value} onValueChange={onValueChange} trackColor={{ true: colors.primary }} />
    </View>
  );
}

function InfoRow({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <View style={styles.infoRow}>
      <Text style={styles.rowTitle}>{label}</Text>
      <Text style={[styles.infoValue, mono && styles.mono]} selectable numberOfLines={1}>
        {value}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },
  content: { padding: 16, gap: 10 },
  section: {
    color: colors.textMuted,
    fontSize: 13,
    fontWeight: '700',
    textTransform: 'uppercase',
    marginTop: 12,
    marginBottom: 2,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    backgroundColor: colors.surface,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 16,
  },
  rowText: { flex: 1, gap: 2 },
  rowTitle: { color: colors.text, fontSize: 16, fontWeight: '600' },
  rowSub: { color: colors.textMuted, fontSize: 13 },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 12,
    backgroundColor: colors.surface,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 16,
  },
  rowPressed: { opacity: 0.7 },
  chevron: { color: colors.textMuted, fontSize: 22, fontWeight: '600' },
  infoValue: { color: colors.textMuted, fontSize: 14, flexShrink: 1, textAlign: 'right' },
  mono: { fontFamily: 'monospace', fontSize: 12 },
  note: { color: colors.textMuted, fontSize: 12, paddingHorizontal: 4 },
});
