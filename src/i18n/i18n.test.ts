import assert from 'node:assert/strict';
import { readdirSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { test } from 'node:test';
import { fileURLToPath } from 'node:url';

// Pure test: reads the locale JSON straight off disk so it stays free of RN /
// expo-localization imports (config.ts pulls in native modules). Its job is to
// catch translation drift — a locale missing a key, or dropping a `%{var}` /
// `{{status}}` placeholder a string depends on.

const localesDir = join(dirname(fileURLToPath(import.meta.url)), 'locales');

// Mirrors SUPPORTED_LANGUAGES in config.ts. Hard-coded on purpose: the test
// asserts the shipped files match this set exactly (catches an orphaned or
// forgotten locale file).
const EXPECTED_LANGS = ['de', 'en', 'es', 'fr', 'it', 'nl', 'pt'];
// Mirrors ResultStatus in ../tickets/types.ts (a type, so not readable here).
const RESULT_STATUSES = ['error', 'green', 'red', 'yellow'];

type Json = Record<string, unknown>;

function load(lang: string): Json {
  return JSON.parse(readFileSync(join(localesDir, `${lang}.json`), 'utf8'));
}

/** Flatten nested catalogs to dotted leaf keys: { "home.history": "History" }. */
function flatten(obj: Json, prefix = ''): Record<string, string> {
  const out: Record<string, string> = {};
  for (const [k, v] of Object.entries(obj)) {
    const key = prefix ? `${prefix}.${k}` : k;
    if (v && typeof v === 'object') Object.assign(out, flatten(v as Json, key));
    else out[key] = String(v);
  }
  return out;
}

/** The interpolation tokens a string carries: `%{name}` and `{{status}}`. */
function placeholders(s: string): string[] {
  return (s.match(/%\{[a-zA-Z0-9_]+\}|\{\{[a-zA-Z0-9_]+\}\}/g) ?? []).sort();
}

const shipped = readdirSync(localesDir)
  .filter((f) => f.endsWith('.json'))
  .map((f) => f.replace(/\.json$/, ''))
  .sort();

test('ships exactly the supported locale files', () => {
  assert.deepEqual(shipped, EXPECTED_LANGS);
});

const en = flatten(load('en'));
const enKeys = Object.keys(en).sort();

for (const lang of EXPECTED_LANGS.filter((l) => l !== 'en')) {
  const flat = flatten(load(lang));

  test(`${lang}: has exactly the same keys as en`, () => {
    assert.deepEqual(Object.keys(flat).sort(), enKeys);
  });

  test(`${lang}: preserves interpolation placeholders for every key`, () => {
    for (const key of enKeys) {
      assert.deepEqual(
        placeholders(flat[key] ?? ''),
        placeholders(en[key]),
        `placeholders differ for "${key}" in ${lang}`,
      );
    }
  });
}

test('status namespace covers every ResultStatus', () => {
  const status = load('en').status as Json;
  assert.deepEqual(Object.keys(status).sort(), RESULT_STATUSES);
});

test('result.fallback covers every ResultStatus plus server/unexpected', () => {
  const fallback = (load('en').result as Json).fallback as Json;
  assert.deepEqual(
    Object.keys(fallback).sort(),
    [...RESULT_STATUSES, 'serverError', 'unexpected'].sort(),
  );
});
