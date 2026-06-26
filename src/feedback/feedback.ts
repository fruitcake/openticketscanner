import { type AudioPlayer, createAudioPlayer, setAudioModeAsync } from 'expo-audio';
import * as Haptics from 'expo-haptics';

import { useSettingsStore } from '../state/settingsStore';
import type { ResultStatus } from '../tickets/types';

let beep: AudioPlayer | null = null;

function getBeep(): AudioPlayer {
  if (!beep) {
    beep = createAudioPlayer(require('../../assets/beep.wav'));
    // Beep even when the device is on silent — this is operator feedback.
    setAudioModeAsync({ playsInSilentMode: true }).catch(() => {});
  }
  return beep;
}

function hapticForStatus(status: ResultStatus): Haptics.NotificationFeedbackType {
  switch (status) {
    case 'green':
      return Haptics.NotificationFeedbackType.Success;
    case 'yellow':
      return Haptics.NotificationFeedbackType.Warning;
    default:
      return Haptics.NotificationFeedbackType.Error;
  }
}

/**
 * Fire haptic and/or sound feedback for a scan result, honoring the global
 * settings. Safe to call from anywhere; failures are swallowed.
 */
export function playScanFeedback(status: ResultStatus): void {
  const { hapticsEnabled, soundEnabled } = useSettingsStore.getState();

  if (hapticsEnabled) {
    Haptics.notificationAsync(hapticForStatus(status)).catch(() => {});
  }

  if (soundEnabled) {
    try {
      const player = getBeep();
      player.seekTo(0).catch(() => {});
      player.play();
    } catch {
      // ignore playback errors
    }
  }
}
