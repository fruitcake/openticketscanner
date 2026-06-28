import { getLocales } from 'expo-localization';
import { I18n } from 'i18n-js';

import de from './locales/de.json';
import en from './locales/en.json';
import es from './locales/es.json';
import fr from './locales/fr.json';
import it from './locales/it.json';
import nl from './locales/nl.json';
import pt from './locales/pt.json';

/** Languages the app ships UI translations for. */
export const SUPPORTED_LANGUAGES = ['en', 'nl', 'fr', 'de', 'es', 'pt', 'it'] as const;
export type LanguageCode = (typeof SUPPORTED_LANGUAGES)[number];

/** A user's stored choice: a concrete language, or follow the device. */
export type LanguageSetting = 'system' | LanguageCode;

/** Native display names, shown as-is in the language picker. */
export const LANGUAGE_NAMES: Record<LanguageCode, string> = {
  en: 'English',
  nl: 'Nederlands',
  fr: 'Français',
  de: 'Deutsch',
  es: 'Español',
  pt: 'Português',
  it: 'Italiano',
};

export const i18n = new I18n({ en, nl, fr, de, es, pt, it });
i18n.enableFallback = true;
i18n.defaultLocale = 'en';

function isSupported(code: string | null | undefined): code is LanguageCode {
  return !!code && (SUPPORTED_LANGUAGES as readonly string[]).includes(code);
}

/** The device's preferred language if we support it, else English. */
export function deviceLanguage(): LanguageCode {
  for (const loc of getLocales()) {
    const code = loc.languageCode?.toLowerCase();
    if (isSupported(code)) return code;
  }
  return 'en';
}

/** Resolve a stored setting ('system' | code) to a concrete language code. */
export function resolveLanguage(setting: LanguageSetting): LanguageCode {
  return setting === 'system' ? deviceLanguage() : setting;
}

/** Point i18n at the language implied by a setting. */
export function applyLanguage(setting: LanguageSetting): void {
  i18n.locale = resolveLanguage(setting);
}

/** Active locale code, for Intl date/number formatting. */
export function getLocale(): string {
  return i18n.locale;
}

/** Translate a key. Safe to call outside React (uses the current locale). */
export function t(key: string, options?: Record<string, unknown>): string {
  return i18n.t(key, options);
}
