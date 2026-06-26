import * as Clipboard from 'expo-clipboard';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { useMemo, useState } from 'react';
import { Pressable, Share, StyleSheet, Switch, Text, View } from 'react-native';
import QRCode from 'react-native-qrcode-svg';

import { useConfigStore } from '../../src/state/configStore';
import { buildConfigLink } from '../../src/tickets/configLink';
import { colors } from '../../src/ui/theme';

/**
 * Shows a QR code + shareable link that provisions this configuration onto
 * another device. The QR encodes the HTTPS universal link; scanning it (or
 * opening the link) lands on the `/configure` confirmation screen.
 */
export default function ShareConfigScreen() {
  const { configId } = useLocalSearchParams<{ configId: string }>();
  const router = useRouter();
  const config = useConfigStore((s) => (configId ? s.get(configId) : undefined));
  const [includeKey, setIncludeKey] = useState(true);
  const [copied, setCopied] = useState(false);

  const link = useMemo(
    () => (config ? buildConfigLink(config, { includeKey, base: 'https' }) : ''),
    [config, includeKey],
  );

  if (!config) {
    return (
      <View style={styles.centered}>
        <Stack.Screen options={{ title: 'Share' }} />
        <Text style={styles.missing}>This configuration no longer exists.</Text>
        <Pressable style={styles.secondary} onPress={() => router.back()}>
          <Text style={styles.secondaryText}>Go back</Text>
        </Pressable>
      </View>
    );
  }

  const hasKey = Boolean(config.apiKey);

  const onShare = () => Share.share({ message: link }).catch(() => {});
  const onCopy = async () => {
    await Clipboard.setStringAsync(link);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  return (
    <View style={styles.screen}>
      <Stack.Screen options={{ title: `Share “${config.name}”` }} />

      <View style={styles.qrCard}>
        <QRCode value={link} size={240} backgroundColor="#ffffff" color="#000000" />
      </View>

      <Text style={styles.caption}>
        Scan this with another device (Ticket configurations → Scan setup code), or share the link.
      </Text>

      {hasKey && (
        <View style={styles.toggleRow}>
          <View style={styles.toggleText}>
            <Text style={styles.toggleTitle}>Include API key</Text>
            <Text style={[styles.toggleSub, includeKey && styles.warn]}>
              {includeKey
                ? '⚠ The QR/link contains your API key — share it only with trusted devices.'
                : 'The key is omitted; enter it on each device after importing.'}
            </Text>
          </View>
          <Switch
            value={includeKey}
            onValueChange={setIncludeKey}
            trackColor={{ true: colors.primary }}
          />
        </View>
      )}

      <Text style={styles.link} selectable numberOfLines={3}>
        {link}
      </Text>

      <View style={styles.actions}>
        <Pressable style={[styles.action, styles.primary]} onPress={onShare}>
          <Text style={styles.primaryText}>Share link</Text>
        </Pressable>
        <Pressable style={[styles.action, styles.secondary]} onPress={onCopy}>
          <Text style={styles.secondaryText}>{copied ? 'Copied!' : 'Copy link'}</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg, padding: 16, gap: 16, alignItems: 'center' },
  centered: { flex: 1, backgroundColor: colors.bg, alignItems: 'center', justifyContent: 'center', gap: 16, padding: 24 },
  missing: { color: colors.text, fontSize: 16 },
  qrCard: { backgroundColor: '#fff', borderRadius: 16, padding: 20, marginTop: 8 },
  caption: { color: colors.textMuted, fontSize: 13, textAlign: 'center', paddingHorizontal: 8 },
  toggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    backgroundColor: colors.surface,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 16,
    width: '100%',
  },
  toggleText: { flex: 1, gap: 2 },
  toggleTitle: { color: colors.text, fontSize: 16, fontWeight: '600' },
  toggleSub: { color: colors.textMuted, fontSize: 13 },
  warn: { color: '#d9a300' },
  link: {
    color: colors.textMuted,
    fontSize: 12,
    fontFamily: 'monospace',
    width: '100%',
    backgroundColor: colors.surface,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 12,
  },
  actions: { flexDirection: 'row', gap: 12, width: '100%' },
  action: { flex: 1, borderRadius: 12, paddingVertical: 15, alignItems: 'center' },
  primary: { backgroundColor: colors.primary },
  primaryText: { color: '#fff', fontSize: 16, fontWeight: '700' },
  secondary: { backgroundColor: colors.surfaceAlt },
  secondaryText: { color: colors.text, fontSize: 16, fontWeight: '600' },
});
