import { Link, useRouter } from 'expo-router';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { useConfigStore } from '../src/state/configStore';
import { useT } from '../src/i18n';
import { FruitcakeLogo } from '../src/ui/FruitcakeLogo';
import { colors } from '../src/ui/theme';
import { getDeviceId } from '../src/utils/device';

export default function HomeScreen() {
  const router = useRouter();
  const t = useT();
  const configs = useConfigStore((s) => s.configs);

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
      <Text style={styles.lead}>{t('home.chooseMode')}</Text>

      <Pressable style={[styles.tile, styles.primaryTile]} onPress={() => router.push('/scan')}>
        <Text style={styles.tileIcon}>📷</Text>
        <View style={styles.tileText}>
          <Text style={styles.tileTitle}>{t('home.scanModeTitle')}</Text>
          <Text style={styles.tileSub}>{t('home.scanModeSub')}</Text>
        </View>
      </Pressable>

      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>{t('home.ticketConfigs')}</Text>
        <Link href="/tickets/configs" style={styles.manageLink}>
          {t('home.manage')}
        </Link>
      </View>

      {configs.length === 0 ? (
        <Pressable style={styles.emptyCard} onPress={() => router.push('/tickets/configs/new')}>
          <Text style={styles.emptyTitle}>{t('home.noConfigsTitle')}</Text>
          <Text style={styles.emptySub}>{t('home.noConfigsSub')}</Text>
          <Text style={styles.emptyCta}>{t('home.addConfig')}</Text>
        </Pressable>
      ) : (
        configs.map((config) => (
          <Pressable
            key={config.id}
            style={styles.tile}
            onPress={() => router.push(`/tickets/${config.id}/scan`)}
          >
            <Text style={styles.tileIcon}>🎫</Text>
            <View style={styles.tileText}>
              <Text style={styles.tileTitle}>{config.name}</Text>
              <Text style={styles.tileSub} numberOfLines={1}>
                {t('home.formatCount', { count: config.formats.length })} ·{' '}
                {config.continuousMode ? t('home.continuous') : t('home.stopOnEach')}
              </Text>
            </View>
          </Pressable>
        ))
      )}

      <View style={styles.footerRow}>
        <Pressable style={styles.ghostButton} onPress={() => router.push('/history')}>
          <Text style={styles.ghostIcon}>📜</Text>
          <Text style={styles.ghostButtonText} numberOfLines={1}>
            {t('home.history')}
          </Text>
        </Pressable>
        <Pressable style={styles.ghostButton} onPress={() => router.push('/settings')}>
          <Text style={styles.ghostIcon}>⚙️</Text>
          <Text style={styles.ghostButtonText} numberOfLines={1}>
            {t('home.settings')}
          </Text>
        </Pressable>
        <Pressable style={styles.ghostButton} onPress={() => router.push('/about')}>
          <Text style={styles.ghostIcon}>ℹ️</Text>
          <Text style={styles.ghostButtonText} numberOfLines={1}>
            {t('home.about')}
          </Text>
        </Pressable>
      </View>

      <Text style={styles.deviceId} selectable numberOfLines={1}>
        {t('home.deviceId', { id: getDeviceId() })}
      </Text>

      <Pressable
        style={styles.credit}
        onPress={() => router.push('/about')}
        hitSlop={8}
      >
        <Text style={styles.creditText}>{t('home.madeWith')}</Text>
        <FruitcakeLogo size={13} color={colors.textMuted} />
        <Text style={styles.creditText}>Fruitcake</Text>
      </Pressable>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },
  content: { padding: 16, gap: 12 },
  lead: { color: colors.textMuted, fontSize: 14, marginBottom: 4 },
  tile: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    backgroundColor: colors.surface,
    borderRadius: 14,
    padding: 18,
    borderWidth: 1,
    borderColor: colors.border,
  },
  primaryTile: { borderColor: colors.primary },
  tileIcon: { fontSize: 28 },
  tileText: { flex: 1 },
  tileTitle: { color: colors.text, fontSize: 18, fontWeight: '700' },
  tileSub: { color: colors.textMuted, fontSize: 13, marginTop: 2 },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 16,
    marginBottom: 4,
  },
  sectionTitle: { color: colors.text, fontSize: 16, fontWeight: '700' },
  manageLink: { color: colors.primary, fontSize: 15, fontWeight: '600' },
  emptyCard: {
    backgroundColor: colors.surface,
    borderRadius: 14,
    padding: 20,
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: colors.border,
    alignItems: 'center',
    gap: 6,
  },
  emptyTitle: { color: colors.text, fontSize: 16, fontWeight: '700' },
  emptySub: { color: colors.textMuted, fontSize: 13, textAlign: 'center' },
  emptyCta: { color: colors.primary, fontSize: 15, fontWeight: '700', marginTop: 8 },
  footerRow: { flexDirection: 'row', marginTop: 8 },
  ghostButton: { flex: 1, alignItems: 'center', paddingVertical: 14, gap: 4 },
  ghostIcon: { fontSize: 22 },
  ghostButtonText: { color: colors.textMuted, fontSize: 13, fontWeight: '600' },
  deviceId: {
    color: colors.textMuted,
    fontSize: 11,
    fontFamily: 'monospace',
    textAlign: 'center',
    marginTop: 8,
    opacity: 0.7,
  },
  credit: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    marginTop: 16,
    marginBottom: 8,
    opacity: 0.7,
  },
  creditText: { color: colors.textMuted, fontSize: 12 },
});
