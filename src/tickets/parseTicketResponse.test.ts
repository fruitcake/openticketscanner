import assert from 'node:assert/strict';
import { test } from 'node:test';

import { errorResult, parseTicketResponse } from './parseTicketResponse.ts';

test('valid string status -> green with message and ticket fields', () => {
  const r = parseTicketResponse(
    {
      status: 'valid',
      message: 'Valid – VIP entry',
      ticket: { name: 'Ada Lovelace', type: 'VIP', gate: 'A', seat: 12 },
    },
    200,
  );
  assert.equal(r.status, 'green');
  assert.equal(r.message, 'Valid – VIP entry');
  assert.deepEqual(r.ticket, { name: 'Ada Lovelace', type: 'VIP', gate: 'A', seat: '12' });
});

test('used status -> yellow', () => {
  const r = parseTicketResponse({ status: 'used' }, 200);
  assert.equal(r.status, 'yellow');
  assert.equal(r.message, 'Already scanned');
});

test('invalid status -> red', () => {
  const r = parseTicketResponse({ status: 'invalid', message: 'Unknown code' }, 200);
  assert.equal(r.status, 'red');
  assert.equal(r.message, 'Unknown code');
});

test('boolean valid:false -> red', () => {
  const r = parseTicketResponse({ valid: false }, 200);
  assert.equal(r.status, 'red');
});

test('boolean valid:true -> green', () => {
  const r = parseTicketResponse({ valid: true }, 200);
  assert.equal(r.status, 'green');
});

test('unknown status -> error', () => {
  const r = parseTicketResponse({ status: 'banana' }, 200);
  assert.equal(r.status, 'error');
});

test('HTTP 500 -> error regardless of body', () => {
  const r = parseTicketResponse({ status: 'valid' }, 500);
  assert.equal(r.status, 'error');
  assert.match(r.message, /Server error/);
});

test('malformed (non-object) body -> error', () => {
  assert.equal(parseTicketResponse('nope', 200).status, 'error');
  assert.equal(parseTicketResponse(null, 200).status, 'error');
});

test('nested objects in ticket are skipped, scalars stringified', () => {
  const r = parseTicketResponse(
    { status: 'valid', ticket: { name: 'X', meta: { a: 1 }, count: 3, vip: true } },
    200,
  );
  assert.deepEqual(r.ticket, { name: 'X', count: '3', vip: 'true' });
});

test('errorResult builds an error ScanResult', () => {
  const r = errorResult('Network request failed');
  assert.equal(r.status, 'error');
  assert.equal(r.message, 'Network request failed');
  assert.deepEqual(r.ticket, {});
});
