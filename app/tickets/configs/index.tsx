import { useRouter } from 'expo-router';
import { FlatList, Pressable, StyleSheet, Text, View } from 'react-native';

import { useConfigStore } from '../../../src/state/configStore';
import { colors } from '../../../src/ui/theme';

export default function ConfigListScreen() {
  const router = useRouter();
  const configs = useConfigStore((s) => s.configs);

  return (
    <View style={styles.screen}>
      <FlatList
        data={configs}
        keyExtractor={(c) => c.id}
        contentContainerStyle={styles.list}
        ListEmptyComponent={
          <Text style={styles.empty}>No configurations yet. Add one below.</Text>
        }
        renderItem={({ item }) => (
          <Pressable
            style={styles.row}
            onPress={() => router.push(`/tickets/configs/${item.id}`)}
          >
            <View style={styles.rowMain}>
              <Text style={styles.name}>{item.name}</Text>
              <Text style={styles.url} numberOfLines={1}>
                {item.apiUrl}
              </Text>
              <Text style={styles.meta}>
                {item.formats.length} format{item.formats.length === 1 ? '' : 's'} ·{' '}
                {item.continuousMode ? 'continuous' : 'stop on each'} · {item.debounceMs}ms
              </Text>
            </View>
            <Text style={styles.chevron}>›</Text>
          </Pressable>
        )}
      />

      <Pressable style={styles.addButton} onPress={() => router.push('/tickets/configs/new')}>
        <Text style={styles.addButtonText}>+ Add configuration</Text>
      </Pressable>
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
  chevron: { color: colors.textMuted, fontSize: 28, paddingLeft: 8 },
  addButton: {
    margin: 16,
    backgroundColor: colors.primary,
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
  },
  addButtonText: { color: '#fff', fontSize: 16, fontWeight: '700' },
});
