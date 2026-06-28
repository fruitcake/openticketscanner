import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { useMemo, useState } from 'react';
import {
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  View,
} from 'react-native';

import { useT } from '../../../src/i18n';
import { DEFAULT_DEBOUNCE_MS, useConfigStore } from '../../../src/state/configStore';
import { CODE_FORMATS, CODE_FORMAT_LABELS, type CodeFormat } from '../../../src/tickets/types';
import { colors } from '../../../src/ui/theme';

export default function ConfigEditScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const t = useT();
  const { add, update, remove, get } = useConfigStore();

  const isNew = id === 'new' || id == null;
  const existing = useMemo(() => (isNew ? undefined : get(id)), [isNew, id, get]);

  const [name, setName] = useState(existing?.name ?? '');
  const [apiUrl, setApiUrl] = useState(existing?.apiUrl ?? '');
  const [apiKey, setApiKey] = useState(existing?.apiKey ?? '');
  const [scannerName, setScannerName] = useState(existing?.scannerName ?? '');
  const [formats, setFormats] = useState<CodeFormat[]>(existing?.formats ?? ['qr']);
  const [continuousMode, setContinuousMode] = useState(existing?.continuousMode ?? false);
  const [debounce, setDebounce] = useState(String(existing?.debounceMs ?? DEFAULT_DEBOUNCE_MS));

  const toggleFormat = (format: CodeFormat) => {
    setFormats((prev) =>
      prev.includes(format) ? prev.filter((f) => f !== format) : [...prev, format],
    );
  };

  const onSave = () => {
    const trimmedName = name.trim();
    const trimmedUrl = apiUrl.trim();
    if (!trimmedName) {
      return Alert.alert(t('configEdit.missingNameTitle'), t('configEdit.missingNameBody'));
    }
    if (!/^https?:\/\/.+/i.test(trimmedUrl)) {
      return Alert.alert(t('configEdit.invalidUrlTitle'), t('configEdit.invalidUrlBody'));
    }
    if (formats.length === 0) {
      return Alert.alert(t('configEdit.noFormatsTitle'), t('configEdit.noFormatsBody'));
    }
    const debounceMs = Number.parseInt(debounce, 10);

    const draft = {
      name: trimmedName,
      apiUrl: trimmedUrl,
      apiKey: apiKey.trim() || undefined,
      scannerName: scannerName.trim() || undefined,
      formats,
      continuousMode,
      debounceMs: Number.isFinite(debounceMs) && debounceMs >= 0 ? debounceMs : DEFAULT_DEBOUNCE_MS,
    };

    if (isNew) add(draft);
    else update(id, draft);
    router.back();
  };

  const onDelete = () => {
    Alert.alert(t('configEdit.deleteTitle'), t('configEdit.deleteConfirm', { name: existing?.name ?? '' }), [
      { text: t('common.cancel'), style: 'cancel' },
      {
        text: t('common.delete'),
        style: 'destructive',
        onPress: () => {
          remove(id);
          router.back();
        },
      },
    ]);
  };

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
      <Stack.Screen options={{ title: isNew ? t('nav.newConfig') : t('nav.editConfig') }} />

      <Field label={t('configEdit.name')}>
        <TextInput
          style={styles.input}
          value={name}
          onChangeText={setName}
          placeholder={t('configEdit.namePlaceholder')}
          placeholderTextColor={colors.textMuted}
        />
      </Field>

      <Field label={t('configEdit.apiUrl')}>
        <TextInput
          style={styles.input}
          value={apiUrl}
          onChangeText={setApiUrl}
          placeholder="https://example.com/api/validate"
          placeholderTextColor={colors.textMuted}
          autoCapitalize="none"
          autoCorrect={false}
          keyboardType="url"
          inputMode="url"
        />
      </Field>

      <Field label={t('configEdit.scannerName')}>
        <TextInput
          style={styles.input}
          value={scannerName}
          onChangeText={setScannerName}
          placeholder={t('configEdit.scannerPlaceholder')}
          placeholderTextColor={colors.textMuted}
        />
        <Text style={styles.hint}>{t('configEdit.scannerHint')}</Text>
      </Field>

      <Field label={t('configEdit.apiKey')}>
        <TextInput
          style={styles.input}
          value={apiKey}
          onChangeText={setApiKey}
          placeholder={t('configEdit.apiKeyPlaceholder')}
          placeholderTextColor={colors.textMuted}
          autoCapitalize="none"
          autoCorrect={false}
          secureTextEntry
        />
      </Field>

      <Field label={t('configEdit.codeFormats')}>
        <View style={styles.chips}>
          {CODE_FORMATS.map((format) => {
            const selected = formats.includes(format);
            return (
              <Pressable
                key={format}
                style={[styles.chip, selected && styles.chipOn]}
                onPress={() => toggleFormat(format)}
              >
                <Text style={[styles.chipText, selected && styles.chipTextOn]}>
                  {CODE_FORMAT_LABELS[format]}
                </Text>
              </Pressable>
            );
          })}
        </View>
      </Field>

      <View style={styles.switchRow}>
        <View style={styles.switchText}>
          <Text style={styles.switchTitle}>{t('configEdit.continuousTitle')}</Text>
          <Text style={styles.switchSub}>{t('configEdit.continuousSub')}</Text>
        </View>
        <Switch
          value={continuousMode}
          onValueChange={setContinuousMode}
          trackColor={{ true: colors.primary }}
        />
      </View>

      <Field label={t('configEdit.debounce')}>
        <TextInput
          style={styles.input}
          value={debounce}
          onChangeText={setDebounce}
          keyboardType="number-pad"
          inputMode="numeric"
          placeholder={String(DEFAULT_DEBOUNCE_MS)}
          placeholderTextColor={colors.textMuted}
        />
        <Text style={styles.hint}>{t('configEdit.debounceHint')}</Text>
      </Field>

      <Pressable style={styles.saveButton} onPress={onSave}>
        <Text style={styles.saveButtonText}>{isNew ? t('configEdit.create') : t('configEdit.save')}</Text>
      </Pressable>

      {!isNew && (
        <Pressable style={styles.shareButton} onPress={() => router.push(`/share/${id}`)}>
          <Text style={styles.shareButtonText}>{t('configEdit.share')}</Text>
        </Pressable>
      )}

      {!isNew && (
        <Pressable style={styles.deleteButton} onPress={onDelete}>
          <Text style={styles.deleteButtonText}>{t('configEdit.delete')}</Text>
        </Pressable>
      )}
    </ScrollView>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <View style={styles.field}>
      <Text style={styles.label}>{label}</Text>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },
  content: { padding: 16, gap: 18, paddingBottom: 48 },
  field: { gap: 8 },
  label: { color: colors.textMuted, fontSize: 13, fontWeight: '600', textTransform: 'uppercase' },
  input: {
    backgroundColor: colors.surface,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.border,
    color: colors.text,
    fontSize: 16,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  hint: { color: colors.textMuted, fontSize: 12 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: {
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  chipOn: { backgroundColor: colors.primary, borderColor: colors.primary },
  chipText: { color: colors.textMuted, fontSize: 14, fontWeight: '600' },
  chipTextOn: { color: '#fff' },
  switchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    backgroundColor: colors.surface,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 16,
  },
  switchText: { flex: 1, gap: 2 },
  switchTitle: { color: colors.text, fontSize: 16, fontWeight: '600' },
  switchSub: { color: colors.textMuted, fontSize: 13 },
  saveButton: {
    backgroundColor: colors.primary,
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
    marginTop: 8,
  },
  saveButtonText: { color: '#fff', fontSize: 16, fontWeight: '700' },
  shareButton: {
    backgroundColor: colors.surfaceAlt,
    borderRadius: 12,
    paddingVertical: 15,
    alignItems: 'center',
  },
  shareButtonText: { color: colors.text, fontSize: 15, fontWeight: '600' },
  deleteButton: { paddingVertical: 14, alignItems: 'center' },
  deleteButtonText: { color: colors.danger, fontSize: 15, fontWeight: '600' },
});
