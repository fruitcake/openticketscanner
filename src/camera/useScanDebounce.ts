import { useCallback, useRef } from 'react';

/**
 * Debounce repeated scans of the same code. The barcode scanner fires
 * continuously while a code is in frame; this lets through the first sighting of
 * a code and then ignores it until `windowMs` has elapsed since it was last seen.
 *
 * @returns `accept(code, windowMs)` — true if this scan should be handled.
 */
export function useScanDebounce() {
  const lastSeen = useRef<Map<string, number>>(new Map());

  const accept = useCallback((code: string, windowMs: number): boolean => {
    const now = Date.now();
    const previous = lastSeen.current.get(code);
    if (previous != null && now - previous < windowMs) {
      lastSeen.current.set(code, now); // keep extending while still in frame
      return false;
    }
    lastSeen.current.set(code, now);
    return true;
  }, []);

  const reset = useCallback(() => {
    lastSeen.current.clear();
  }, []);

  return { accept, reset };
}
