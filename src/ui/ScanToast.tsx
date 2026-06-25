import { StyleSheet, Text, View } from 'react-native';

import type { ScanResult } from '../tickets/types';
import { STATUS_COLORS, STATUS_LABELS } from './theme';

interface ScanToastProps {
  result: ScanResult;
  code: string;
}

/**
 * Compact, non-blocking banner shown in continuous mode. The camera keeps
 * scanning underneath; the parent auto-dismisses this after a short delay.
 */
export function ScanToast({ result, code }: ScanToastProps) {
  const color = STATUS_COLORS[result.status];
  const primary = Object.values(result.ticket)[0];

  return (
    <View pointerEvents="none" style={styles.wrap}>
      <View style={[styles.toast, { borderLeftColor: color }]}>
        <View style={[styles.badge, { backgroundColor: color }]}>
          <Text style={styles.badgeText}>{STATUS_LABELS[result.status]}</Text>
        </View>
        <View style={styles.text}>
          <Text style={styles.message} numberOfLines={1}>
            {result.message}
          </Text>
          <Text style={styles.sub} numberOfLines={1}>
            {primary ?? code}
          </Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { position: 'absolute', left: 0, right: 0, bottom: 40, alignItems: 'center', padding: 16 },
  toast: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: 'rgba(17,22,28,0.95)',
    borderLeftWidth: 5,
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 14,
    width: '100%',
    maxWidth: 420,
  },
  badge: { borderRadius: 6, paddingHorizontal: 8, paddingVertical: 4 },
  badgeText: { color: '#fff', fontSize: 12, fontWeight: '800', letterSpacing: 1 },
  text: { flex: 1 },
  message: { color: '#e6edf3', fontSize: 15, fontWeight: '600' },
  sub: { color: '#9aa7b4', fontSize: 13, marginTop: 2 },
});
