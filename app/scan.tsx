import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { CameraScanner } from '../src/camera/CameraScanner';
import { CODE_FORMATS } from '../src/tickets/types';
import { colors } from '../src/ui/theme';

interface Decoded {
  value: string;
  type: string;
}

export default function ScanModeScreen() {
  const [decoded, setDecoded] = useState<Decoded | null>(null);

  return (
    <View style={styles.fill}>
      <CameraScanner
        formats={[...CODE_FORMATS]}
        active={decoded === null}
        onScan={(value, type) => setDecoded({ value, type })}
      >
        {decoded && (
          <View style={styles.backdrop}>
            <View style={styles.card}>
              <Text style={styles.type}>{decoded.type.toUpperCase()}</Text>
              <Text selectable style={styles.value}>
                {decoded.value}
              </Text>
              <Pressable style={styles.button} onPress={() => setDecoded(null)}>
                <Text style={styles.buttonText}>Scan again</Text>
              </Pressable>
            </View>
          </View>
        )}
      </CameraScanner>
    </View>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1, backgroundColor: '#000' },
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
    backgroundColor: colors.surface,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 24,
    gap: 16,
  },
  type: { color: colors.primary, fontSize: 13, fontWeight: '800', letterSpacing: 1 },
  value: { color: colors.text, fontSize: 18, fontWeight: '600', fontFamily: 'monospace' },
  button: {
    backgroundColor: colors.primary,
    borderRadius: 10,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 8,
  },
  buttonText: { color: '#fff', fontSize: 16, fontWeight: '700' },
});
