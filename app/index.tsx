import { Link, useRouter } from 'expo-router';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { useConfigStore } from '../src/state/configStore';
import { colors } from '../src/ui/theme';
import { getDeviceId } from '../src/utils/device';

export default function HomeScreen() {
  const router = useRouter();
  const configs = useConfigStore((s) => s.configs);

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
      <Text style={styles.lead}>Choose a mode</Text>

      <Pressable style={[styles.tile, styles.primaryTile]} onPress={() => router.push('/scan')}>
        <Text style={styles.tileIcon}>📷</Text>
        <View style={styles.tileText}>
          <Text style={styles.tileTitle}>Scan mode</Text>
          <Text style={styles.tileSub}>Decode any QR / barcode and show its contents.</Text>
        </View>
      </Pressable>

      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>Ticket configurations</Text>
        <Link href="/tickets/configs" style={styles.manageLink}>
          Manage
        </Link>
      </View>

      {configs.length === 0 ? (
        <Pressable style={styles.emptyCard} onPress={() => router.push('/tickets/configs/new')}>
          <Text style={styles.emptyTitle}>No configurations yet</Text>
          <Text style={styles.emptySub}>
            Add one with an API URL to start validating tickets.
          </Text>
          <Text style={styles.emptyCta}>+ Add configuration</Text>
        </Pressable>
      ) : (
        configs.map((config) => (
          <Pressable
            key={config.id}
            style={styles.tile}
            onPress={() => router.push(`/tickets/${config.id}/scan`)}
          >
            <Text style={styles.tileIcon}>🎫</Text>
            <View style={styles.tileText}>
              <Text style={styles.tileTitle}>{config.name}</Text>
              <Text style={styles.tileSub} numberOfLines={1}>
                {config.formats.length} format{config.formats.length === 1 ? '' : 's'} ·{' '}
                {config.continuousMode ? 'continuous' : 'stop on each'}
              </Text>
            </View>
          </Pressable>
        ))
      )}

      <View style={styles.footerRow}>
        <Pressable style={styles.ghostButton} onPress={() => router.push('/history')}>
          <Text style={styles.ghostButtonText}>📜 History</Text>
        </Pressable>
        <Pressable style={styles.ghostButton} onPress={() => router.push('/settings')}>
          <Text style={styles.ghostButtonText}>⚙️ Settings</Text>
        </Pressable>
      </View>

      <Text style={styles.deviceId} selectable numberOfLines={1}>
        Device ID: {getDeviceId()}
      </Text>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },
  content: { padding: 16, gap: 12 },
  lead: { color: colors.textMuted, fontSize: 14, marginBottom: 4 },
  tile: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    backgroundColor: colors.surface,
    borderRadius: 14,
    padding: 18,
    borderWidth: 1,
    borderColor: colors.border,
  },
  primaryTile: { borderColor: colors.primary },
  tileIcon: { fontSize: 28 },
  tileText: { flex: 1 },
  tileTitle: { color: colors.text, fontSize: 18, fontWeight: '700' },
  tileSub: { color: colors.textMuted, fontSize: 13, marginTop: 2 },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 16,
    marginBottom: 4,
  },
  sectionTitle: { color: colors.text, fontSize: 16, fontWeight: '700' },
  manageLink: { color: colors.primary, fontSize: 15, fontWeight: '600' },
  emptyCard: {
    backgroundColor: colors.surface,
    borderRadius: 14,
    padding: 20,
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: colors.border,
    alignItems: 'center',
    gap: 6,
  },
  emptyTitle: { color: colors.text, fontSize: 16, fontWeight: '700' },
  emptySub: { color: colors.textMuted, fontSize: 13, textAlign: 'center' },
  emptyCta: { color: colors.primary, fontSize: 15, fontWeight: '700', marginTop: 8 },
  footerRow: { flexDirection: 'row', marginTop: 8 },
  ghostButton: { flex: 1, alignItems: 'center', paddingVertical: 16 },
  ghostButtonText: { color: colors.textMuted, fontSize: 15, fontWeight: '600' },
  deviceId: {
    color: colors.textMuted,
    fontSize: 11,
    fontFamily: 'monospace',
    textAlign: 'center',
    marginTop: 8,
    opacity: 0.7,
  },
});
