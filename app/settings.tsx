import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, Switch, Text, View } from 'react-native';

import { playScanFeedback } from '../src/feedback/feedback';
import { LANGUAGE_NAMES, SUPPORTED_LANGUAGES, useT, type LanguageSetting } from '../src/i18n';
import { useSettingsStore } from '../src/state/settingsStore';
import { colors } from '../src/ui/theme';
import { getAppVersion, getDeviceId } from '../src/utils/device';

export default function SettingsScreen() {
  const router = useRouter();
  const t = useT();
  const { hapticsEnabled, soundEnabled, language, setHaptics, setSound, setLanguage } =
    useSettingsStore();
  const [pickerOpen, setPickerOpen] = useState(false);

  const languageOptions: { value: LanguageSetting; label: string }[] = [
    { value: 'system', label: t('settings.systemDefault') },
    ...SUPPORTED_LANGUAGES.map((code) => ({ value: code, label: LANGUAGE_NAMES[code] })),
  ];
  const currentLabel =
    language === 'system' ? t('settings.systemDefault') : LANGUAGE_NAMES[language];

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
      <Text style={styles.section}>{t('settings.feedbackSection')}</Text>

      <ToggleRow
        title={t('settings.vibrateTitle')}
        subtitle={t('settings.vibrateSub')}
        value={hapticsEnabled}
        onValueChange={(v) => {
          setHaptics(v);
          if (v) playScanFeedback('green'); // preview
        }}
      />

      <ToggleRow
        title={t('settings.beepTitle')}
        subtitle={t('settings.beepSub')}
        value={soundEnabled}
        onValueChange={(v) => {
          setSound(v);
          if (v) playScanFeedback('green'); // preview
        }}
      />

      <Text style={styles.section}>{t('settings.languageSection')}</Text>
      <Pressable
        style={({ pressed }) => [styles.infoRow, pressed && styles.rowPressed]}
        onPress={() => setPickerOpen(true)}
      >
        <Text style={styles.rowTitle}>{t('settings.languageRow')}</Text>
        <View style={styles.valueWrap}>
          <Text style={styles.value} numberOfLines={1}>
            {currentLabel}
          </Text>
          <Text style={styles.caret}>▾</Text>
        </View>
      </Pressable>

      <Text style={styles.section}>{t('settings.deviceSection')}</Text>
      <InfoRow label={t('settings.appVersion')} value={getAppVersion()} />
      <InfoRow label={t('settings.deviceId')} value={getDeviceId()} mono />
      <Text style={styles.note}>{t('settings.deviceNote')}</Text>

      <Text style={styles.section}>{t('settings.aboutSection')}</Text>
      <Pressable
        style={({ pressed }) => [styles.infoRow, pressed && styles.rowPressed]}
        onPress={() => router.push('/about')}
      >
        <Text style={styles.rowTitle}>{t('settings.aboutLink')}</Text>
        <Text style={styles.chevron}>›</Text>
      </Pressable>

      <Modal
        visible={pickerOpen}
        transparent
        animationType="fade"
        onRequestClose={() => setPickerOpen(false)}
      >
        <Pressable style={styles.backdrop} onPress={() => setPickerOpen(false)}>
          <Pressable style={styles.sheet} onPress={() => {}}>
            <Text style={styles.sheetTitle}>{t('settings.languageSection')}</Text>
            {languageOptions.map((opt, i) => (
              <Pressable
                key={opt.value}
                style={({ pressed }) => [
                  styles.langRow,
                  i > 0 && styles.langRowBorder,
                  pressed && styles.rowPressed,
                ]}
                onPress={() => {
                  setLanguage(opt.value);
                  setPickerOpen(false);
                }}
              >
                <Text style={styles.langLabel}>{opt.label}</Text>
                {language === opt.value && <Text style={styles.check}>✓</Text>}
              </Pressable>
            ))}
          </Pressable>
        </Pressable>
      </Modal>
    </ScrollView>
  );
}

function ToggleRow({
  title,
  subtitle,
  value,
  onValueChange,
}: {
  title: string;
  subtitle: string;
  value: boolean;
  onValueChange: (v: boolean) => void;
}) {
  return (
    <View style={styles.row}>
      <View style={styles.rowText}>
        <Text style={styles.rowTitle}>{title}</Text>
        <Text style={styles.rowSub}>{subtitle}</Text>
      </View>
      <Switch value={value} onValueChange={onValueChange} trackColor={{ true: colors.primary }} />
    </View>
  );
}

function InfoRow({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <View style={styles.infoRow}>
      <Text style={styles.rowTitle}>{label}</Text>
      <Text style={[styles.infoValue, mono && styles.mono]} selectable numberOfLines={1}>
        {value}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },
  content: { padding: 16, gap: 10 },
  section: {
    color: colors.textMuted,
    fontSize: 13,
    fontWeight: '700',
    textTransform: 'uppercase',
    marginTop: 12,
    marginBottom: 2,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    backgroundColor: colors.surface,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 16,
  },
  rowText: { flex: 1, gap: 2 },
  rowTitle: { color: colors.text, fontSize: 16, fontWeight: '600' },
  rowSub: { color: colors.textMuted, fontSize: 13 },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 12,
    backgroundColor: colors.surface,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 16,
  },
  rowPressed: { opacity: 0.7 },
  valueWrap: { flexDirection: 'row', alignItems: 'center', gap: 6, flexShrink: 1 },
  value: { color: colors.textMuted, fontSize: 15, flexShrink: 1, textAlign: 'right' },
  caret: { color: colors.textMuted, fontSize: 14 },
  chevron: { color: colors.textMuted, fontSize: 22, fontWeight: '600' },
  infoValue: { color: colors.textMuted, fontSize: 14, flexShrink: 1, textAlign: 'right' },
  mono: { fontFamily: 'monospace', fontSize: 12 },
  note: { color: colors.textMuted, fontSize: 12, paddingHorizontal: 4 },

  // Language picker modal
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'center',
    padding: 24,
  },
  sheet: {
    backgroundColor: colors.surface,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.border,
    overflow: 'hidden',
    maxHeight: '80%',
  },
  sheetTitle: {
    color: colors.textMuted,
    fontSize: 13,
    fontWeight: '700',
    textTransform: 'uppercase',
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 6,
  },
  langRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 15,
  },
  langRowBorder: { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.border },
  langLabel: { color: colors.text, fontSize: 16 },
  check: { color: colors.primary, fontSize: 18, fontWeight: '700' },
});
