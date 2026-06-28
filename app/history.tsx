import { Stack, useFocusEffect, useLocalSearchParams } from 'expo-router';
import { useCallback, useState } from 'react';
import { Alert, FlatList, Pressable, StyleSheet, Text, View } from 'react-native';

import { useT } from '../src/i18n';
import { useConfigStore } from '../src/state/configStore';
import { clearHistory, listScans } from '../src/storage/history';
import type { ScanRecord } from '../src/tickets/types';
import { HistoryRow } from '../src/ui/HistoryRow';
import { colors } from '../src/ui/theme';

export default function HistoryScreen() {
  const { configId } = useLocalSearchParams<{ configId?: string }>();
  const t = useT();
  const config = useConfigStore((s) => (configId ? s.get(configId) : undefined));
  const [scans, setScans] = useState<ScanRecord[]>([]);

  const refresh = useCallback(
    () => setScans(listScans({ configId, limit: 500 })),
    [configId],
  );

  // Reload whenever the screen comes into focus (e.g. after scanning).
  useFocusEffect(
    useCallback(() => {
      refresh();
    }, [refresh]),
  );

  const scopeLabel = config ? `“${config.name}”` : t('history.scopeAll');

  const onClear = () => {
    Alert.alert(
      t('history.clearTitle'),
      t('history.clearConfirm', { scope: scopeLabel }),
      [
        { text: t('common.cancel'), style: 'cancel' },
        {
          text: t('history.clearAction'),
          style: 'destructive',
          onPress: () => {
            clearHistory(configId);
            refresh();
          },
        },
      ],
    );
  };

  return (
    <View style={styles.screen}>
      <Stack.Screen
        options={{ title: config ? t('nav.historyNamed', { name: config.name }) : t('nav.history') }}
      />
      <FlatList
        data={scans}
        keyExtractor={(s) => s.id}
        renderItem={({ item }) => <HistoryRow record={item} />}
        ListEmptyComponent={<Text style={styles.empty}>{t('history.empty')}</Text>}
      />
      {scans.length > 0 && (
        <Pressable style={styles.clear} onPress={onClear}>
          <Text style={styles.clearText}>{t('history.clearButton', { count: scans.length })}</Text>
        </Pressable>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },
  empty: { color: colors.textMuted, textAlign: 'center', marginTop: 48, fontSize: 15 },
  clear: {
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.border,
    paddingVertical: 16,
    alignItems: 'center',
  },
  clearText: { color: colors.danger, fontSize: 15, fontWeight: '600' },
});
