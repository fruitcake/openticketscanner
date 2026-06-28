import { Stack, useRouter } from 'expo-router';
import { useCallback, useRef, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { CameraScanner } from '../src/camera/CameraScanner';
import { useT } from '../src/i18n';
import { parseConfigLink } from '../src/tickets/configLink';

/**
 * Scans a provisioning QR code. A valid setup code routes to `/configure` (the
 * same screen a deeplink opens), so scanning and tapping a link match exactly.
 */
export default function ConfigureScanScreen() {
  const router = useRouter();
  const t = useT();
  const [rejected, setRejected] = useState(false);
  const handled = useRef(false);
  const rejectTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const onScan = useCallback(
    (value: string) => {
      if (handled.current) return;
      if (parseConfigLink(value)) {
        handled.current = true;
        router.replace({ pathname: '/configure', params: { link: value } });
      } else {
        setRejected(true);
        if (rejectTimer.current) clearTimeout(rejectTimer.current);
        rejectTimer.current = setTimeout(() => setRejected(false), 2000);
      }
    },
    [router],
  );

  return (
    <View style={styles.fill}>
      <Stack.Screen options={{ headerShown: true, title: t('nav.scanSetupCode') }} />
      <CameraScanner formats={['qr']} active={!handled.current} onScan={onScan}>
        <View pointerEvents="none" style={styles.hintWrap}>
          <Text style={styles.hint}>
            {rejected ? t('configureScan.rejected') : t('configureScan.hint')}
          </Text>
        </View>
      </CameraScanner>
    </View>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1, backgroundColor: '#000' },
  hintWrap: { position: 'absolute', left: 0, right: 0, bottom: 48, alignItems: 'center', padding: 16 },
  hint: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '600',
    backgroundColor: 'rgba(0,0,0,0.55)',
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 10,
    overflow: 'hidden',
  },
});
