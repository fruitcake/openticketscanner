import { StyleSheet, Text, View } from 'react-native';

import type { ScanRecord } from '../tickets/types';
import { formatTime } from '../utils/format';
import { STATUS_COLORS } from './theme';

/** A single row in the scan history list. */
export function HistoryRow({ record }: { record: ScanRecord }) {
  return (
    <View style={styles.row}>
      <View style={[styles.dot, { backgroundColor: STATUS_COLORS[record.status] }]} />
      <View style={styles.main}>
        <Text style={styles.message} numberOfLines={1}>
          {record.message}
        </Text>
        <Text style={styles.code} numberOfLines={1}>
          {record.code}
        </Text>
      </View>
      <Text style={styles.time}>{formatTime(record.scannedAt)}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#2a323c',
  },
  dot: { width: 12, height: 12, borderRadius: 6 },
  main: { flex: 1 },
  message: { color: '#e6edf3', fontSize: 15, fontWeight: '600' },
  code: { color: '#9aa7b4', fontSize: 12, fontFamily: 'monospace', marginTop: 2 },
  time: { color: '#9aa7b4', fontSize: 12 },
});
