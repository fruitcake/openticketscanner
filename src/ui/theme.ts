import type { ResultStatus } from '../tickets/types';

/** Traffic-light colors for result popups and history rows. */
export const STATUS_COLORS: Record<ResultStatus, string> = {
  green: '#1f9d55',
  yellow: '#d9a300',
  red: '#cc2936',
  error: '#6b7280',
};

export const STATUS_LABELS: Record<ResultStatus, string> = {
  green: 'VALID',
  yellow: 'WARNING',
  red: 'REJECTED',
  error: 'ERROR',
};

/** App color palette (dark, high-contrast — suited to dim venues). */
export const colors = {
  bg: '#0b0f14',
  surface: '#161b22',
  surfaceAlt: '#1f2630',
  text: '#e6edf3',
  textMuted: '#9aa7b4',
  border: '#2a323c',
  primary: '#3b82f6',
  danger: '#cc2936',
};
