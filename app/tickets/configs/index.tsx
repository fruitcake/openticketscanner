import { useRouter } from 'expo-router';
import { FlatList, Pressable, StyleSheet, Text, View } from 'react-native';

import { useT } from '../../../src/i18n';
import { useConfigStore } from '../../../src/state/configStore';
import { colors } from '../../../src/ui/theme';

export default function ConfigListScreen() {
  const router = useRouter();
  const t = useT();
  const configs = useConfigStore((s) => s.configs);

  return (
    <View style={styles.screen}>
      <FlatList
        data={configs}
        keyExtractor={(c) => c.id}
        contentContainerStyle={styles.list}
        ListEmptyComponent={<Text style={styles.empty}>{t('configList.empty')}</Text>}
        renderItem={({ item }) => (
          <View style={styles.row}>
            <Pressable
              style={styles.rowMain}
              onPress={() => router.push(`/tickets/configs/${item.id}`)}
            >
              <Text style={styles.name}>{item.name}</Text>
              <Text style={styles.url} numberOfLines={1}>
                {item.apiUrl}
              </Text>
              <Text style={styles.meta}>
                {t('home.formatCount', { count: item.formats.length })} ·{' '}
                {item.continuousMode ? t('home.continuous') : t('home.stopOnEach')} · {item.debounceMs}ms
              </Text>
            </Pressable>
            <Pressable
              style={styles.shareButton}
              onPress={() => router.push(`/share/${item.id}`)}
              hitSlop={8}
              accessibilityLabel={t('configList.shareA11y', { name: item.name })}
            >
              <Text style={styles.shareIcon}>📤</Text>
            </Pressable>
          </View>
        )}
      />

      <View style={styles.footer}>
        <Pressable style={styles.scanButton} onPress={() => router.push('/configure-scan')}>
          <Text style={styles.scanButtonText}>{t('configList.scanSetup')}</Text>
        </Pressable>
        <Pressable style={styles.addButton} onPress={() => router.push('/tickets/configs/new')}>
          <Text style={styles.addButtonText}>{t('configList.addConfig')}</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },
  list: { padding: 16, gap: 10 },
  empty: { color: colors.textMuted, textAlign: 'center', marginTop: 40, fontSize: 15 },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 16,
  },
  rowMain: { flex: 1, gap: 3 },
  name: { color: colors.text, fontSize: 17, fontWeight: '700' },
  url: { color: colors.textMuted, fontSize: 13 },
  meta: { color: colors.textMuted, fontSize: 12 },
  shareButton: {
    paddingLeft: 12,
    paddingVertical: 8,
    alignSelf: 'center',
  },
  shareIcon: { fontSize: 20 },
  footer: { padding: 16, paddingTop: 0, gap: 10 },
  scanButton: {
    backgroundColor: colors.surface,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    paddingVertical: 16,
    alignItems: 'center',
  },
  scanButtonText: { color: colors.text, fontSize: 16, fontWeight: '700' },
  addButton: {
    backgroundColor: colors.primary,
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
  },
  addButtonText: { color: '#fff', fontSize: 16, fontWeight: '700' },
});
