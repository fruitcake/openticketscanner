import { create } from 'zustand';

import { storage } from '../storage/mmkv';

const STORAGE_KEY = 'app-settings';

interface Settings {
  /** Vibrate on each scan result (mapped to success/warning/error). */
  hapticsEnabled: boolean;
  /** Play a beep on each scan result. */
  soundEnabled: boolean;
}

const DEFAULTS: Settings = { hapticsEnabled: true, soundEnabled: false };

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
}

function persist({ hapticsEnabled, soundEnabled }: Settings): void {
  storage.set(STORAGE_KEY, JSON.stringify({ hapticsEnabled, soundEnabled }));
}

/** Global app settings (haptics / sound), backed by MMKV. */
export const useSettingsStore = create<SettingsState>((set, get) => ({
  ...load(),
  setHaptics: (hapticsEnabled) => {
    set({ hapticsEnabled });
    persist(get());
  },
  setSound: (soundEnabled) => {
    set({ soundEnabled });
    persist(get());
  },
}));
