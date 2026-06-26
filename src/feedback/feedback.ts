import { type AudioPlayer, createAudioPlayer, setAudioModeAsync } from 'expo-audio';
import * as Haptics from 'expo-haptics';

import { useSettingsStore } from '../state/settingsStore';
import type { ResultStatus } from '../tickets/types';

let okPlayer: AudioPlayer | null = null;
let errorPlayer: AudioPlayer | null = null;
let audioConfigured = false;

function ensureAudioMode(): void {
  if (audioConfigured) return;
  // Play even when the device is on silent — this is operator feedback.
  setAudioModeAsync({ playsInSilentMode: true }).catch(() => {});
  audioConfigured = true;
}

function getOkPlayer(): AudioPlayer {
  ensureAudioMode();
  if (!okPlayer) okPlayer = createAudioPlayer(require('../../assets/feedback-ok.wav'));
  return okPlayer;
}

function getErrorPlayer(): AudioPlayer {
  ensureAudioMode();
  if (!errorPlayer) errorPlayer = createAudioPlayer(require('../../assets/feedback-error.wav'));
  return errorPlayer;
}

const wait = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));

/**
 * Strong, status-distinct vibration using Heavy impacts (notification haptics
 * felt too weak): success = one pulse, warning = two, error = three.
 */
async function playHaptic(status: ResultStatus): Promise<void> {
  const pulse = () =>
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy).catch(() => {});
  const count = status === 'green' ? 1 : status === 'yellow' ? 2 : 3;
  for (let i = 0; i < count; i++) {
    await pulse();
    if (i < count - 1) await wait(105);
  }
}

/**
 * Fire haptic and/or sound feedback for a scan result, honoring global settings.
 * Success plays a rising chime; warning/error/rejection play the alert buzz.
 */
export function playScanFeedback(status: ResultStatus): void {
  const { hapticsEnabled, soundEnabled } = useSettingsStore.getState();

  if (hapticsEnabled) {
    void playHaptic(status);
  }

  if (soundEnabled) {
    try {
      const player = status === 'green' ? getOkPlayer() : getErrorPlayer();
      player.seekTo(0).catch(() => {});
      player.play();
    } catch {
      // ignore playback errors
    }
  }
}
