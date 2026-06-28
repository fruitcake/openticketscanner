import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { useMemo } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { useT } from '../src/i18n';
import { useConfigStore } from '../src/state/configStore';
import { parseConfigLink, payloadFromParams } from '../src/tickets/configLink';
import { CODE_FORMAT_LABELS, type CodeFormat } from '../src/tickets/types';
import { colors } from '../src/ui/theme';

/**
 * Confirmation screen where every provisioning path converges — opened by a
 * deeplink (`openticketscanner://configure?…` or the HTTPS universal link) or
 * navigated to from the in-app setup scanner. Reviews the incoming config and
 * adds or updates it.
 */
export default function ConfigureScreen() {
  const params = useLocalSearchParams();
  const router = useRouter();
  const t = useT();
  const { configs, add, update } = useConfigStore();

  const payload = useMemo(() => {
    const link = params.link;
    if (typeof link === 'string') return parseConfigLink(link);
    return payloadFromParams(params);
  }, [params]);

  const duplicate = useMemo(
    () => (payload ? configs.find((c) => c.apiUrl === payload.apiUrl) : undefined),
    [configs, payload],
  );

  if (!payload) {
    return (
      <View style={styles.centered}>
        <Stack.Screen options={{ title: t('nav.setup') }} />
        <Text style={styles.errorTitle}>{t('configure.invalidTitle')}</Text>
        <Text style={styles.errorBody}>{t('configure.invalidBody')}</Text>
        <Pressable style={styles.secondary} onPress={() => router.replace('/')}>
          <Text style={styles.secondaryText}>{t('common.goHome')}</Text>
        </Pressable>
      </View>
    );
  }

  const goToScan = (id: string) => router.replace(`/tickets/${id}/scan`);

  const onAddNew = () => goToScan(add(payload).id);
  const onUpdate = () => {
    if (!duplicate) return;
    update(duplicate.id, payload);
    goToScan(duplicate.id);
  };

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
      <Stack.Screen
        options={{ title: duplicate ? t('nav.updateConfig') : t('nav.addConfig') }}
      />

      <Text style={styles.lead}>
        {duplicate ? t('configure.duplicateLead') : t('configure.reviewLead')}
      </Text>

      <View style={styles.card}>
        <Row label={t('configure.name')} value={payload.name} />
        <Row label={t('configure.apiUrl')} value={payload.apiUrl} />
        <Row label={t('configure.scannerName')} value={payload.scannerName ?? t('configure.dash')} />
        <Row
          label={t('configure.formats')}
          value={payload.formats.map((f) => CODE_FORMAT_LABELS[f as CodeFormat] ?? f).join(', ')}
        />
        <Row
          label={t('configure.continuous')}
          value={payload.continuousMode ? t('configure.on') : t('configure.off')}
        />
        <Row label={t('configure.debounce')} value={t('configure.debounceValue', { ms: payload.debounceMs })} />
        <Row
          label={t('configure.apiKey')}
          value={payload.apiKey ? t('configure.keyIncluded') : t('configure.keyNotIncluded')}
          last
        />
      </View>

      {duplicate ? (
        <>
          <Pressable style={styles.primary} onPress={onUpdate}>
            <Text style={styles.primaryText}>{t('configure.updateNamed', { name: duplicate.name })}</Text>
          </Pressable>
          <Pressable style={styles.secondary} onPress={onAddNew}>
            <Text style={styles.secondaryText}>{t('configure.addAsNew')}</Text>
          </Pressable>
        </>
      ) : (
        <Pressable style={styles.primary} onPress={onAddNew}>
          <Text style={styles.primaryText}>{t('configure.addConfig')}</Text>
        </Pressable>
      )}

      <Pressable style={styles.ghost} onPress={() => router.replace('/')}>
        <Text style={styles.ghostText}>{t('common.cancel')}</Text>
      </Pressable>
    </ScrollView>
  );
}

function Row({ label, value, last }: { label: string; value: string; last?: boolean }) {
  return (
    <View style={[styles.row, last && styles.rowLast]}>
      <Text style={styles.rowLabel}>{label}</Text>
      <Text style={styles.rowValue} numberOfLines={2}>
        {value}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },
  content: { padding: 16, gap: 14 },
  centered: { flex: 1, backgroundColor: colors.bg, alignItems: 'center', justifyContent: 'center', gap: 14, padding: 24 },
  lead: { color: colors.textMuted, fontSize: 14 },
  card: {
    backgroundColor: colors.surface,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: 16,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 16,
    paddingVertical: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
  rowLast: { borderBottomWidth: 0 },
  rowLabel: { color: colors.textMuted, fontSize: 14 },
  rowValue: { color: colors.text, fontSize: 14, fontWeight: '600', flexShrink: 1, textAlign: 'right' },
  primary: { backgroundColor: colors.primary, borderRadius: 12, paddingVertical: 16, alignItems: 'center' },
  primaryText: { color: '#fff', fontSize: 16, fontWeight: '700' },
  secondary: {
    backgroundColor: colors.surfaceAlt,
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
  },
  secondaryText: { color: colors.text, fontSize: 15, fontWeight: '600' },
  ghost: { paddingVertical: 12, alignItems: 'center' },
  ghostText: { color: colors.textMuted, fontSize: 15, fontWeight: '600' },
  errorTitle: { color: colors.text, fontSize: 18, fontWeight: '700' },
  errorBody: { color: colors.textMuted, fontSize: 14, textAlign: 'center' },
});
