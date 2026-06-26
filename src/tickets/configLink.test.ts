import assert from 'node:assert/strict';
import { test } from 'node:test';

import {
  buildConfigLink,
  type ConfigPayload,
  parseConfigLink,
} from './configLink.ts';

const base: ConfigPayload = {
  name: 'Main Gate',
  apiUrl: 'https://example.com/validate',
  apiKey: 'secret-123',
  scannerName: 'Lane 1',
  formats: ['qr', 'code128'],
  continuousMode: true,
  debounceMs: 2000,
};

test('round-trips https link with key included', () => {
  const link = buildConfigLink(base, { includeKey: true, base: 'https' });
  assert.match(link, /^https:\/\/app\.openticketscanner\.com\/configure\?/);
  const parsed = parseConfigLink(link);
  assert.deepEqual(parsed, base);
});

test('round-trips custom-scheme link', () => {
  const link = buildConfigLink(base, { includeKey: true, base: 'scheme' });
  assert.match(link, /^openticketscanner:\/\/configure\?/);
  assert.deepEqual(parseConfigLink(link), base);
});

test('excludes key when includeKey is false', () => {
  const link = buildConfigLink(base, { includeKey: false, base: 'https' });
  assert.doesNotMatch(link, /key=/);
  const parsed = parseConfigLink(link);
  assert.equal(parsed?.apiKey, undefined);
  assert.equal(parsed?.name, 'Main Gate');
});

test('omits scanner when not set', () => {
  const link = buildConfigLink({ ...base, scannerName: undefined }, { includeKey: true });
  assert.doesNotMatch(link, /scanner=/);
  assert.equal(parseConfigLink(link)?.scannerName, undefined);
});

test('encodes/decodes special characters', () => {
  const cfg: ConfigPayload = { ...base, name: 'Gate #1 / North', apiKey: 'a&b=c d' };
  const link = buildConfigLink(cfg, { includeKey: true });
  const parsed = parseConfigLink(link);
  assert.equal(parsed?.name, 'Gate #1 / North');
  assert.equal(parsed?.apiKey, 'a&b=c d');
});

test('filters unknown formats and defaults to qr', () => {
  assert.deepEqual(
    parseConfigLink('configure?endpoint=https://x.com/v&formats=qr,bogus,code39')?.formats,
    ['qr', 'code39'],
  );
  assert.deepEqual(
    parseConfigLink('configure?endpoint=https://x.com/v&formats=nope')?.formats,
    ['qr'],
  );
  assert.deepEqual(parseConfigLink('configure?endpoint=https://x.com/v')?.formats, ['qr']);
});

test('coerces continuous and debounce', () => {
  const a = parseConfigLink('configure?endpoint=https://x.com/v&continuous=1&debounce=500');
  assert.equal(a?.continuousMode, true);
  assert.equal(a?.debounceMs, 500);
  const b = parseConfigLink('configure?endpoint=https://x.com/v&continuous=0&debounce=abc');
  assert.equal(b?.continuousMode, false);
  assert.equal(b?.debounceMs, 3000); // fallback
});

test('name falls back to endpoint host', () => {
  assert.equal(parseConfigLink('configure?endpoint=https://tickets.acme.io/v')?.name, 'tickets.acme.io');
});

test('accepts a bare query string', () => {
  assert.equal(parseConfigLink('?endpoint=https://x.com/v')?.apiUrl, 'https://x.com/v');
});

test('rejects non-configure / invalid inputs', () => {
  assert.equal(parseConfigLink('https://other.com/page?endpoint=https://x.com/v'), null); // wrong host/path
  assert.equal(parseConfigLink('configure?name=No+Endpoint'), null); // missing endpoint
  assert.equal(parseConfigLink('configure?endpoint=not-a-url'), null); // bad endpoint
  assert.equal(parseConfigLink('TICKET-ABC-123'), null); // a normal ticket code
  assert.equal(parseConfigLink(''), null);
});
