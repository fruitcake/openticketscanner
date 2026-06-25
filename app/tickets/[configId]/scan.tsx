import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback, useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';

import { CameraScanner } from '../../../src/camera/CameraScanner';
import { useConfigStore } from '../../../src/state/configStore';
import { postTicket } from '../../../src/tickets/api';
import { errorResult, parseTicketResponse } from '../../../src/tickets/parseTicketResponse';
import type { ScanRecord, ScanResult } from '../../../src/tickets/types';
import { insertScan, lookupPrevious } from '../../../src/storage/history';
import { ResultOverlay } from '../../../src/ui/ResultOverlay';
import { ScanToast } from '../../../src/ui/ScanToast';
import { colors } from '../../../src/ui/theme';
import { uid } from '../../../src/utils/id';

/** How long the continuous-mode toast stays up before resuming. */
const TOAST_MS = 2500;

export default function TicketScanScreen() {
  const { configId } = useLocalSearchParams<{ configId: string }>();
  const router = useRouter();
  const config = useConfigStore((s) => (configId ? s.get(configId) : undefined));

  const [result, setResult] = useState<ScanResult | null>(null);
  const [previous, setPrevious] = useState<ScanRecord | null>(null);
  const [code, setCode] = useState('');
  const [busy, setBusy] = useState(false);

  // Guards against overlapping validations while a request is in flight.
  const busyRef = useRef(false);
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (toastTimer.current) clearTimeout(toastTimer.current);
    };
  }, []);

  const handleScan = useCallback(
    async (scanned: string, type: string) => {
      if (!config || busyRef.current) return;
      busyRef.current = true;
      setBusy(true);
      setCode(scanned);

      // Look up prior sighting BEFORE recording this one.
      const prior = lookupPrevious(scanned, config.id);

      let scanResult: ScanResult;
      try {
        const res = await postTicket(config, scanned, type);
        scanResult = parseTicketResponse(res.body, res.httpStatus);
      } catch (e) {
        const message =
          e instanceof Error && e.name === 'AbortError'
            ? 'Server timed out'
            : 'Network error — could not reach server';
        scanResult = errorResult(message, e);
      }

      // Persist the scan record.
      insertScan({
        id: uid(),
        configId: config.id,
        code: scanned,
        type,
        status: scanResult.status,
        message: scanResult.message,
        scannedAt: new Date().toISOString(),
      });

      setPrevious(prior);
      setResult(scanResult);
      setBusy(false);

      if (config.continuousMode) {
        // Keep scanning; auto-dismiss the toast and free the guard.
        toastTimer.current = setTimeout(() => {
          setResult(null);
          busyRef.current = false;
        }, TOAST_MS);
      }
      // Non-continuous: guard stays held until "Continue" is pressed.
    },
    [config],
  );

  const handleContinue = useCallback(() => {
    setResult(null);
    setPrevious(null);
    busyRef.current = false;
  }, []);

  if (!config) {
    return (
      <View style={styles.missing}>
        <Stack.Screen options={{ headerShown: true, title: 'Not found' }} />
        <Text style={styles.missingText}>This configuration no longer exists.</Text>
        <Pressable style={styles.missingButton} onPress={() => router.back()}>
          <Text style={styles.missingButtonText}>Go back</Text>
        </Pressable>
      </View>
    );
  }

  const continuous = config.continuousMode;
  // In continuous mode the camera never pauses; otherwise it pauses while a
  // blocking result popup is shown.
  const cameraActive = continuous ? true : result === null && !busy;
  const showOverlay = !continuous && result !== null;
  const showToast = continuous && result !== null;

  return (
    <View style={styles.fill}>
      <Stack.Screen options={{ headerShown: true, title: config.name }} />

      <CameraScanner
        formats={config.formats}
        active={cameraActive}
        debounceMs={config.debounceMs}
        onScan={handleScan}
      >
        {busy && !result && (
          <View style={styles.loading}>
            <ActivityIndicator color="#fff" size="large" />
            <Text style={styles.loadingText}>Validating…</Text>
          </View>
        )}

        {showOverlay && result && (
          <ResultOverlay
            result={result}
            code={code}
            previous={previous}
            onContinue={handleContinue}
          />
        )}

        {showToast && result && <ScanToast result={result} code={code} />}
      </CameraScanner>
    </View>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1, backgroundColor: '#000' },
  loading: {
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(0,0,0,0.45)',
    gap: 12,
  },
  loadingText: { color: '#fff', fontSize: 16, fontWeight: '600' },
  missing: { flex: 1, backgroundColor: colors.bg, alignItems: 'center', justifyContent: 'center', gap: 16, padding: 24 },
  missingText: { color: colors.text, fontSize: 16, textAlign: 'center' },
  missingButton: { backgroundColor: colors.primary, borderRadius: 10, paddingHorizontal: 20, paddingVertical: 12 },
  missingButtonText: { color: '#fff', fontWeight: '700' },
});
