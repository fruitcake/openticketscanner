import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import type { ScanRecord, ScanResult } from '../tickets/types';
import { formatTimestamp } from '../utils/format';
import { STATUS_COLORS, STATUS_LABELS } from './theme';

interface ResultOverlayProps {
  result: ScanResult;
  code: string;
  /** The first prior sighting of this code, if any. */
  previous?: ScanRecord | null;
  onContinue: () => void;
}

/**
 * Full-screen blocking result popup shown after a ticket validation in
 * non-continuous mode. Tap "Continue" to scan the next ticket.
 */
export function ResultOverlay({ result, code, previous, onContinue }: ResultOverlayProps) {
  const color = STATUS_COLORS[result.status];
  const fields = Object.entries(result.ticket);

  return (
    <View style={styles.backdrop}>
      <View style={[styles.card, { borderColor: color }]}>
        <View style={[styles.banner, { backgroundColor: color }]}>
          <Text style={styles.bannerText}>{STATUS_LABELS[result.status]}</Text>
        </View>

        <ScrollView contentContainerStyle={styles.body}>
          <Text style={styles.message}>{result.message}</Text>

          {fields.length > 0 && (
            <View style={styles.fields}>
              {fields.map(([key, value]) => (
                <View key={key} style={styles.fieldRow}>
                  <Text style={styles.fieldKey}>{key}</Text>
                  <Text style={styles.fieldValue}>{value}</Text>
                </View>
              ))}
            </View>
          )}

          {previous && (
            <View style={styles.previous}>
              <Text style={styles.previousLabel}>Previously scanned</Text>
              <Text style={styles.previousValue}>{formatTimestamp(previous.scannedAt)}</Text>
            </View>
          )}

          <Text style={styles.code} numberOfLines={2}>
            {code}
          </Text>
        </ScrollView>

        <Pressable style={[styles.continue, { backgroundColor: color }]} onPress={onContinue}>
          <Text style={styles.continueText}>Continue scanning</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    backgroundColor: 'rgba(0,0,0,0.75)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  card: {
    width: '100%',
    maxWidth: 420,
    maxHeight: '85%',
    backgroundColor: '#11161c',
    borderRadius: 18,
    borderWidth: 2,
    overflow: 'hidden',
  },
  banner: { paddingVertical: 18, alignItems: 'center' },
  bannerText: { color: '#fff', fontSize: 28, fontWeight: '800', letterSpacing: 2 },
  body: { padding: 20, gap: 16 },
  message: { color: '#e6edf3', fontSize: 19, fontWeight: '600', textAlign: 'center' },
  fields: { gap: 8 },
  fieldRow: { flexDirection: 'row', justifyContent: 'space-between', gap: 12 },
  fieldKey: { color: '#9aa7b4', fontSize: 14, textTransform: 'capitalize' },
  fieldValue: { color: '#e6edf3', fontSize: 14, fontWeight: '600', flexShrink: 1, textAlign: 'right' },
  previous: {
    backgroundColor: 'rgba(217,163,0,0.12)',
    borderRadius: 10,
    padding: 12,
    gap: 2,
  },
  previousLabel: { color: '#d9a300', fontSize: 12, fontWeight: '700', textTransform: 'uppercase' },
  previousValue: { color: '#e6edf3', fontSize: 14 },
  code: { color: '#5b6772', fontSize: 12, fontFamily: 'monospace', textAlign: 'center' },
  continue: { paddingVertical: 16, alignItems: 'center' },
  continueText: { color: '#fff', fontSize: 17, fontWeight: '700' },
});
