import assert from 'node:assert/strict';
import { test } from 'node:test';

import { formatTime, formatTimestamp } from './format.ts';

test('formatTimestamp returns the raw string for unparseable input', () => {
  assert.equal(formatTimestamp('not-a-date'), 'not-a-date');
  assert.equal(formatTimestamp(''), '');
});

test('formatTimestamp formats a valid ISO into a readable, different string', () => {
  const iso = '2024-01-02T20:14:00Z';
  const out = formatTimestamp(iso, 'en-US');
  assert.equal(typeof out, 'string');
  assert.notEqual(out, iso);
  assert.ok(out.length > 0);
});

test('formatTime returns the raw string for unparseable input', () => {
  assert.equal(formatTime('nope'), 'nope');
});

test('formatTime formats a valid ISO into a clock time (hh:mm present)', () => {
  // The hour shifts with the runner's timezone, but the hh:mm shape is stable.
  assert.match(formatTime('2024-01-02T20:14:00Z', 'en-US'), /\d{1,2}:\d{2}/);
});
