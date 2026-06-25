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

import { DEFAULT_DEBOUNCE_MS, useConfigStore } from '../../../src/state/configStore';
import { CODE_FORMATS, CODE_FORMAT_LABELS, type CodeFormat } from '../../../src/tickets/types';
import { colors } from '../../../src/ui/theme';

export default function ConfigEditScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { add, update, remove, get } = useConfigStore();

  const isNew = id === 'new' || id == null;
  const existing = useMemo(() => (isNew ? undefined : get(id)), [isNew, id, get]);

  const [name, setName] = useState(existing?.name ?? '');
  const [apiUrl, setApiUrl] = useState(existing?.apiUrl ?? '');
  const [apiKey, setApiKey] = useState(existing?.apiKey ?? '');
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
    if (!trimmedName) return Alert.alert('Missing name', 'Give this configuration a name.');
    if (!/^https?:\/\/.+/i.test(trimmedUrl)) {
      return Alert.alert('Invalid API URL', 'Enter a full http(s) URL to POST scans to.');
    }
    if (formats.length === 0) {
      return Alert.alert('No formats', 'Select at least one code format to detect.');
    }
    const debounceMs = Number.parseInt(debounce, 10);

    const draft = {
      name: trimmedName,
      apiUrl: trimmedUrl,
      apiKey: apiKey.trim() || undefined,
      formats,
      continuousMode,
      debounceMs: Number.isFinite(debounceMs) && debounceMs >= 0 ? debounceMs : DEFAULT_DEBOUNCE_MS,
    };

    if (isNew) add(draft);
    else update(id, draft);
    router.back();
  };

  const onDelete = () => {
    Alert.alert('Delete configuration', `Delete "${existing?.name}"?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
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
      <Stack.Screen options={{ title: isNew ? 'New Configuration' : 'Edit Configuration' }} />

      <Field label="Name">
        <TextInput
          style={styles.input}
          value={name}
          onChangeText={setName}
          placeholder="Main gate"
          placeholderTextColor={colors.textMuted}
        />
      </Field>

      <Field label="API URL">
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

      <Field label="API key (optional)">
        <TextInput
          style={styles.input}
          value={apiKey}
          onChangeText={setApiKey}
          placeholder="Sent as Bearer / X-API-Key"
          placeholderTextColor={colors.textMuted}
          autoCapitalize="none"
          autoCorrect={false}
          secureTextEntry
        />
      </Field>

      <Field label="Code formats">
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
          <Text style={styles.switchTitle}>Continuous scanning</Text>
          <Text style={styles.switchSub}>
            Keep scanning hands-free, showing a brief result toast for each ticket.
          </Text>
        </View>
        <Switch
          value={continuousMode}
          onValueChange={setContinuousMode}
          trackColor={{ true: colors.primary }}
        />
      </View>

      <Field label="Debounce (ms)">
        <TextInput
          style={styles.input}
          value={debounce}
          onChangeText={setDebounce}
          keyboardType="number-pad"
          inputMode="numeric"
          placeholder={String(DEFAULT_DEBOUNCE_MS)}
          placeholderTextColor={colors.textMuted}
        />
        <Text style={styles.hint}>Ignore the same code if re-scanned within this time.</Text>
      </Field>

      <Pressable style={styles.saveButton} onPress={onSave}>
        <Text style={styles.saveButtonText}>{isNew ? 'Create configuration' : 'Save changes'}</Text>
      </Pressable>

      {!isNew && (
        <Pressable style={styles.deleteButton} onPress={onDelete}>
          <Text style={styles.deleteButtonText}>Delete configuration</Text>
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
  deleteButton: { paddingVertical: 14, alignItems: 'center' },
  deleteButtonText: { color: colors.danger, fontSize: 15, fontWeight: '600' },
});
