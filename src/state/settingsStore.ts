import { create } from 'zustand';

import { applyLanguage, type LanguageSetting } from '../i18n/config';
import { storage } from '../storage/mmkv';

const STORAGE_KEY = 'app-settings';

interface Settings {
  /** Vibrate on each scan result (mapped to success/warning/error). */
  hapticsEnabled: boolean;
  /** Play a beep on each scan result. */
  soundEnabled: boolean;
  /** UI language: a concrete code, or 'system' to follow the device. */
  language: LanguageSetting;
}

const DEFAULTS: Settings = { hapticsEnabled: true, soundEnabled: false, language: 'system' };

function load(): Settings {
  const raw = storage.getString(STORAGE_KEY);
  if (!raw) return DEFAULTS;
  try {
    return { ...DEFAULTS, ...(JSON.parse(raw) as Partial<Settings>) };
  } catch {
    return DEFAULTS;
  }
}

interface SettingsState extends Settings {
  setHaptics: (enabled: boolean) => void;
  setSound: (enabled: boolean) => void;
  setLanguage: (language: LanguageSetting) => void;
}

function persist({ hapticsEnabled, soundEnabled, language }: Settings): void {
  storage.set(STORAGE_KEY, JSON.stringify({ hapticsEnabled, soundEnabled, language }));
}

const initial = load();
// Point i18n at the stored (or device-derived) language before anything renders.
applyLanguage(initial.language);

/** Global app settings (haptics / sound / language), backed by MMKV. */
export const useSettingsStore = create<SettingsState>((set, get) => ({
  ...initial,
  setHaptics: (hapticsEnabled) => {
    set({ hapticsEnabled });
    persist(get());
  },
  setSound: (soundEnabled) => {
    set({ soundEnabled });
    persist(get());
  },
  setLanguage: (language) => {
    applyLanguage(language);
    set({ language });
    persist(get());
  },
}));
