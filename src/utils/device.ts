import Constants from 'expo-constants';

import { storage } from '../storage/mmkv';
import { uid } from './id';

const DEVICE_ID_KEY = 'device-id';

/**
 * A stable unique identifier for this install, generated once and persisted.
 * Survives app restarts; resets only on reinstall / data clear.
 */
export function getDeviceId(): string {
  let id = storage.getString(DEVICE_ID_KEY);
  if (!id) {
    id = `${uid()}-${uid()}`;
    storage.set(DEVICE_ID_KEY, id);
  }
  return id;
}

/** The app version from app.json (falls back to the native build version). */
export function getAppVersion(): string {
  return Constants.expoConfig?.version ?? Constants.nativeAppVersion ?? 'unknown';
}
