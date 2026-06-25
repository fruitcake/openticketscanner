import { create } from 'zustand';

import { storage } from '../storage/mmkv';
import type { TicketConfig } from '../tickets/types';
import { uid } from '../utils/id';

const STORAGE_KEY = 'ticket-configs';

function load(): TicketConfig[] {
  const raw = storage.getString(STORAGE_KEY);
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as TicketConfig[]) : [];
  } catch {
    return [];
  }
}

function persist(configs: TicketConfig[]): void {
  storage.set(STORAGE_KEY, JSON.stringify(configs));
}

export const DEFAULT_DEBOUNCE_MS = 3000;

export type ConfigDraft = Omit<TicketConfig, 'id'>;

interface ConfigState {
  configs: TicketConfig[];
  get: (id: string) => TicketConfig | undefined;
  add: (draft: ConfigDraft) => TicketConfig;
  update: (id: string, draft: ConfigDraft) => void;
  remove: (id: string) => void;
}

/**
 * Reactive store of ticket configs, backed by MMKV. Any screen that reads
 * `configs` re-renders when a config is added/edited/removed.
 */
export const useConfigStore = create<ConfigState>((set, getState) => ({
  configs: load(),

  get: (id) => getState().configs.find((c) => c.id === id),

  add: (draft) => {
    const config: TicketConfig = { ...draft, id: uid() };
    const configs = [...getState().configs, config];
    persist(configs);
    set({ configs });
    return config;
  },

  update: (id, draft) => {
    const configs = getState().configs.map((c) => (c.id === id ? { ...draft, id } : c));
    persist(configs);
    set({ configs });
  },

  remove: (id) => {
    const configs = getState().configs.filter((c) => c.id !== id);
    persist(configs);
    set({ configs });
  },
}));
