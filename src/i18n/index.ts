import { useSettingsStore } from '../state/settingsStore';
import { i18n } from './config';

export * from './config';

/**
 * Returns a translate function and re-renders the calling component whenever the
 * app language changes (by subscribing to the language setting).
 */
export function useT() {
  useSettingsStore((s) => s.language);
  return (key: string, options?: Record<string, unknown>): string => i18n.t(key, options);
}
