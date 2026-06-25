import { createMMKV } from 'react-native-mmkv';

/** Shared synchronous key-value store for configs and app settings. */
export const storage = createMMKV({ id: 'open-ticket-scanner' });
