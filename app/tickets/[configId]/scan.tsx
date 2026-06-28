import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';

import { CameraScanner } from '../../../src/camera/CameraScanner';
import { t as translate, useT } from '../../../src/i18n';
import { playScanFeedback } from '../../../src/feedback/feedback';
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
  const t = useT();
  const config = useConfigStore((s) => (configId ? s.get(configId) : undefined));

  const [result, setResult] = useState<ScanResult | null>(null);
  const [previous, setPrevious] = useState<ScanRecord | null>(null);
  const [code, setCode] = useState('');
  const [busy, setBusy] = useState(false);
  const [manualOpen, setManualOpen] = useState(false);
  const [manualCode, setManualCode] = useState('');

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
      if (toastTimer.current) {
        clearTimeout(toastTimer.current);
        toastTimer.current = null;
      }
      setBusy(true);
      setCode(scanned);

      // Look up prior sighting BEFORE recording this one.
      const prior = lookupPrevious(scanned, config.id);

      let scanResult: ScanResult;
      try {
        const res = await postTicket(config, scanned, type);
        // Localized fallbacks for when the server returns no message of its own.
        scanResult = parseTicketResponse(res.body, res.httpStatus, {
          green: translate('result.fallback.green'),
          yellow: translate('result.fallback.yellow'),
          red: translate('result.fallback.red'),
          error: translate('result.fallback.error'),
          serverError: translate('result.fallback.serverError'),
          unexpected: translate('result.fallback.unexpected'),
        });
      } catch (e) {
        const message =
          e instanceof Error && e.name === 'AbortError'
            ? translate('ticketScan.timeout')
            : translate('ticketScan.networkError');
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
      playScanFeedback(scanResult.status);

      // Continuous mode only uses the lightweight toast for SUCCESS. A
      // warning/error/rejection shows the full blocking popup that the operator
      // must dismiss — so problems aren't missed in a fast-scanning flow.
      if (config.continuousMode && scanResult.status === 'green') {
        // Resume scanning immediately; the toast lingers then auto-dismisses.
        busyRef.current = false;
        toastTimer.current = setTimeout(() => setResult(null), TOAST_MS);
      }
      // Otherwise the guard stays held until "Continue" is pressed.
    },
    [config],
  );

  const handleContinue = useCallback(() => {
    setResult(null);
    setPrevious(null);
    busyRef.current = false;
  }, []);

  const submitManual = useCallback(() => {
    const value = manualCode.trim();
    if (!value) return;
    setManualOpen(false);
    setManualCode('');
    void handleScan(value, 'manual');
  }, [manualCode, handleScan]);

  if (!config) {
    return (
      <View style={styles.missing}>
        <Stack.Screen options={{ headerShown: true, title: t('nav.notFound') }} />
        <Text style={styles.missingText}>{t('ticketScan.missing')}</Text>
        <Pressable style={styles.missingButton} onPress={() => router.back()}>
          <Text style={styles.missingButtonText}>{t('common.goBack')}</Text>
        </Pressable>
      </View>
    );
  }

  const continuous = config.continuousMode;
  // Toast = continuous-mode success only. Everything else (non-continuous, or a
  // continuous warning/error) gets the full blocking popup.
  const showToast = continuous && result !== null && result.status === 'green';
  const showOverlay = result !== null && !showToast;
  // The camera stays live unless a blocking popup is up.
  const cameraActive = !showOverlay && !busy;

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
            <Text style={styles.loadingText}>{t('ticketScan.validating')}</Text>
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

        {cameraActive && !result && !busy && (
          <View style={styles.actionRow}>
            <Pressable style={styles.actionPill} onPress={() => setManualOpen(true)}>
              <Text style={styles.actionPillText}>{t('ticketScan.manual')}</Text>
            </Pressable>
            <Pressable
              style={styles.actionPill}
              onPress={() => router.push({ pathname: '/history', params: { configId: config.id } })}
            >
              <Text style={styles.actionPillText}>{t('ticketScan.history')}</Text>
            </Pressable>
          </View>
        )}
      </CameraScanner>

      <Modal
        visible={manualOpen}
        transparent
        animationType="fade"
        onRequestClose={() => setManualOpen(false)}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={styles.manualBackdrop}
        >
          <View style={styles.manualCard}>
            <Text style={styles.manualTitle}>{t('ticketScan.enterCode')}</Text>
            <TextInput
              style={styles.manualInput}
              value={manualCode}
              onChangeText={setManualCode}
              placeholder={t('ticketScan.codePlaceholder')}
              placeholderTextColor={colors.textMuted}
              autoFocus
              autoCapitalize="characters"
              autoCorrect={false}
              onSubmitEditing={submitManual}
              returnKeyType="done"
            />
            <View style={styles.manualActions}>
              <Pressable
                style={[styles.manualAction, styles.manualCancel]}
                onPress={() => {
                  setManualOpen(false);
                  setManualCode('');
                }}
              >
                <Text style={styles.manualCancelText}>{t('common.cancel')}</Text>
              </Pressable>
              <Pressable style={[styles.manualAction, styles.manualSubmit]} onPress={submitManual}>
                <Text style={styles.manualSubmitText}>{t('ticketScan.validate')}</Text>
              </Pressable>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>
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
  actionRow: {
    position: 'absolute',
    bottom: 40,
    alignSelf: 'center',
    flexDirection: 'row',
    gap: 12,
  },
  actionPill: {
    backgroundColor: 'rgba(0,0,0,0.55)',
    borderRadius: 24,
    paddingHorizontal: 20,
    paddingVertical: 12,
  },
  actionPillText: { color: '#fff', fontSize: 15, fontWeight: '600' },
  manualBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.75)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  manualCard: {
    width: '100%',
    maxWidth: 420,
    backgroundColor: colors.surface,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 20,
    gap: 16,
  },
  manualTitle: { color: colors.text, fontSize: 18, fontWeight: '700' },
  manualInput: {
    backgroundColor: colors.surfaceAlt,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.border,
    color: colors.text,
    fontSize: 17,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  manualActions: { flexDirection: 'row', gap: 12 },
  manualAction: { flex: 1, borderRadius: 10, paddingVertical: 14, alignItems: 'center' },
  manualCancel: { backgroundColor: colors.surfaceAlt },
  manualCancelText: { color: colors.text, fontSize: 16, fontWeight: '600' },
  manualSubmit: { backgroundColor: colors.primary },
  manualSubmitText: { color: '#fff', fontSize: 16, fontWeight: '700' },
});
