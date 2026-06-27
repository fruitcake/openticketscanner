import type { ReactNode } from 'react';
import { Image, Linking, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { FruitcakeLogo } from '../src/ui/FruitcakeLogo';
import { colors } from '../src/ui/theme';
import { getAppVersion } from '../src/utils/device';

const GITHUB_URL = 'https://github.com/fruitcake/openticketscanner';
const FRUITCAKE_URL = 'https://fruitcake.nl';

export default function AboutScreen() {
  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
      <View style={styles.header}>
        <Image source={require('../assets/icon.png')} style={styles.logo} />
        <Text style={styles.appName}>Open Ticket Scanner</Text>
        <Text style={styles.version}>Version {getAppVersion()}</Text>
      </View>

      <Text style={styles.body}>
        A fast, no-nonsense scanner for QR codes, barcodes and event tickets. Point your camera at a
        code to decode it, or validate tickets against your own API.
      </Text>

      <Text style={styles.section}>Open source</Text>
      <Text style={styles.body}>
        Open Ticket Scanner is free and open source. Browse the code, report an issue, or contribute
        on GitHub.
      </Text>
      <LinkRow
        icon={<Text style={styles.rowIcon}>🐙</Text>}
        title="View on GitHub"
        subtitle="github.com/fruitcake/openticketscanner"
        url={GITHUB_URL}
      />

      <Text style={styles.section}>Developed by</Text>
      <Text style={styles.body}>
        Built and maintained by Fruitcake, a development agency from the Netherlands.
      </Text>
      <LinkRow
        icon={<FruitcakeLogo size={26} />}
        title="Fruitcake"
        subtitle="fruitcake.nl"
        url={FRUITCAKE_URL}
      />

      <View style={styles.footer}>
        <Text style={styles.footerText}>Made with care by</Text>
        <FruitcakeLogo size={14} color={colors.textMuted} />
        <Text style={styles.footerText}>Fruitcake</Text>
      </View>
    </ScrollView>
  );
}

function LinkRow({
  icon,
  title,
  subtitle,
  url,
}: {
  icon: ReactNode;
  title: string;
  subtitle: string;
  url: string;
}) {
  return (
    <Pressable
      style={({ pressed }) => [styles.row, pressed && styles.rowPressed]}
      onPress={() => Linking.openURL(url)}
    >
      <View style={styles.rowIconBox}>{icon}</View>
      <View style={styles.rowText}>
        <Text style={styles.rowTitle}>{title}</Text>
        <Text style={styles.rowSub}>{subtitle}</Text>
      </View>
      <Text style={styles.chevron}>↗</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },
  content: { padding: 16, gap: 10 },
  header: { alignItems: 'center', gap: 4, paddingVertical: 16 },
  logo: { width: 88, height: 88, borderRadius: 20, marginBottom: 8 },
  appName: { color: colors.text, fontSize: 22, fontWeight: '800' },
  version: { color: colors.textMuted, fontSize: 14 },
  section: {
    color: colors.textMuted,
    fontSize: 13,
    fontWeight: '700',
    textTransform: 'uppercase',
    marginTop: 12,
    marginBottom: 2,
  },
  body: { color: colors.text, fontSize: 15, lineHeight: 22 },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    backgroundColor: colors.surface,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 16,
    marginTop: 4,
  },
  rowPressed: { opacity: 0.7 },
  rowIcon: { fontSize: 24 },
  rowIconBox: { width: 30, alignItems: 'center', justifyContent: 'center' },
  rowText: { flex: 1, gap: 2 },
  rowTitle: { color: colors.text, fontSize: 16, fontWeight: '600' },
  rowSub: { color: colors.textMuted, fontSize: 13 },
  chevron: { color: colors.primary, fontSize: 18, fontWeight: '700' },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    marginTop: 24,
    opacity: 0.7,
  },
  footerText: { color: colors.textMuted, fontSize: 12 },
});
