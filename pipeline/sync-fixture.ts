/**
 * Slice a small window of the database into the bundled offline fixture.
 *
 *   npx tsx pipeline/sync-fixture.ts [--days 7] [--date MM-DD]
 *
 * The full archive is ~9 MB — far too much to ship inside the app bundle. The
 * fixture only has to cover the first launch before the remote manifest is
 * fetched, so a handful of days around today is plenty. Everything else comes
 * from the hosted manifest (see pipeline/README.md).
 *
 * Pure local slicing: no network, instant, safe to run after every build.
 */
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { z } from 'zod';

import { dayRegisterSchema, manifestSchema } from '../src/data/manifest/schema';
import { todayDateKey } from '../src/lib/dateKey';

const DB_PATH = path.resolve('pipeline/events-db.json');
const PEOPLE_PATH = path.resolve('pipeline/people-db.json');
const FIXTURE_PATH = path.resolve('src/data/manifest/sample-manifest.json');
const DEFAULT_DAYS = 7;

function readArg(flag: string): string | null {
  const i = process.argv.indexOf(flag);
  const v = i >= 0 ? process.argv[i + 1] : undefined;
  return v && !v.startsWith('--') ? v : null;
}

function windowFrom(startKey: string, days: number): string[] {
  const [mm = 1, dd = 1] = startKey.split('-').map(Number);
  return Array.from({ length: Math.max(1, days) }, (_, i) => {
    const d = new Date(2024, mm - 1, dd + i);
    return `${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  });
}

const db = manifestSchema.parse(JSON.parse(readFileSync(DB_PATH, 'utf8')));
const startKey = readArg('--date') ?? todayDateKey();
const days = Number(readArg('--days') ?? String(DEFAULT_DAYS));
const wanted = new Set(windowFrom(startKey, days));

const events = db.events.filter((e) => wanted.has(e.dateKey));
if (events.length === 0) {
  console.error(`No events in the database for ${[...wanted].join(', ')} — build them first.`);
  process.exit(1);
}

/** Same window of the register, when the people pass has produced one. */
function registerForWindow() {
  if (!existsSync(PEOPLE_PATH)) {
    return undefined;
  }
  const parsed = z
    .object({ generatedAt: z.string(), register: z.array(dayRegisterSchema) })
    .safeParse(JSON.parse(readFileSync(PEOPLE_PATH, 'utf8')));
  if (!parsed.success) {
    return undefined;
  }
  const sliced = parsed.data.register.filter((r) => wanted.has(r.dateKey));
  return sliced.length > 0 ? sliced : undefined;
}

const register = registerForWindow();

const fixture = manifestSchema.parse({
  version: 1,
  generatedAt: new Date().toISOString(),
  events,
  ...(register ? { register } : {}),
});
writeFileSync(FIXTURE_PATH, `${JSON.stringify(fixture, null, 2)}\n`);

const kb = Math.round(Buffer.byteLength(JSON.stringify(fixture)) / 1024);
console.log(
  `Fixture: ${events.length} events across ${wanted.size} day(s) from ${startKey} — ${kb} KB bundled` +
    `${register ? ` (register for ${register.length} day(s))` : ''}.`,
);
console.log(`Database still holds ${db.events.length} events across the full archive.`);
