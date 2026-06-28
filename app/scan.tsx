import { useRouter } from 'expo-router';
import { useMemo, useState } from 'react';
import { Linking, Pressable, StyleSheet, Text, View } from 'react-native';

import { CameraScanner } from '../src/camera/CameraScanner';
import { useT } from '../src/i18n';
import { parseConfigLink } from '../src/tickets/configLink';
import { CODE_FORMATS } from '../src/tickets/types';
import { colors } from '../src/ui/theme';

interface Decoded {
  value: string;
  type: string;
}

/**
 * - `config` — one of our provisioning links → offer to import it.
 * - `url`    — any other web URL → offer to open it in the browser.
 * - `plain`  — anything else → just show the decoded value.
 */
type Kind = 'config' | 'url' | 'plain';

function classify(value: string): Kind {
  if (parseConfigLink(value)) return 'config';
  if (/^https?:\/\/\S+/i.test(value.trim())) return 'url';
  return 'plain';
}

export default function ScanModeScreen() {
  const router = useRouter();
  const t = useT();
  const [decoded, setDecoded] = useState<Decoded | null>(null);
  const kind = useMemo<Kind>(() => (decoded ? classify(decoded.value) : 'plain'), [decoded]);

  const reset = () => setDecoded(null);

  const processConfig = () => {
    if (!decoded) return;
    const link = decoded.value;
    reset();
    router.push({ pathname: '/configure', params: { link } });
  };

  const openInBrowser = () => {
    if (!decoded) return;
    const url = decoded.value;
    reset();
    Linking.openURL(url).catch(() => {});
  };

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
              <Text style={styles.type}>
                {kind === 'config'
                  ? t('scan.setupLink')
                  : kind === 'url'
                    ? t('scan.link')
                    : decoded.type.toUpperCase()}
              </Text>
              <Text selectable style={styles.value}>
                {decoded.value}
              </Text>

              {kind === 'config' && (
                <>
                  <Text style={styles.note}>{t('scan.isSetupLink')}</Text>
                  <Pressable style={styles.button} onPress={processConfig}>
                    <Text style={styles.buttonText}>{t('scan.processConfig')}</Text>
                  </Pressable>
                </>
              )}

              {kind === 'url' && (
                <Pressable style={styles.button} onPress={openInBrowser}>
                  <Text style={styles.buttonText}>{t('scan.openInBrowser')}</Text>
                </Pressable>
              )}

              <Pressable
                style={kind === 'plain' ? styles.button : styles.secondary}
                onPress={reset}
              >
                <Text style={kind === 'plain' ? styles.buttonText : styles.secondaryText}>
                  {t('common.scanAgain')}
                </Text>
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
  note: { color: colors.textMuted, fontSize: 13, marginTop: -4 },
  button: {
    backgroundColor: colors.primary,
    borderRadius: 10,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 8,
  },
  buttonText: { color: '#fff', fontSize: 16, fontWeight: '700' },
  secondary: {
    backgroundColor: colors.surfaceAlt,
    borderRadius: 10,
    paddingVertical: 13,
    alignItems: 'center',
  },
  secondaryText: { color: colors.text, fontSize: 15, fontWeight: '600' },
});
