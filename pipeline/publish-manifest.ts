/**
 * Publish the full archive so the app can actually reach every day.
 *
 *   npx tsx pipeline/publish-manifest.ts
 *
 * Writes the same validated manifest to two places:
 *  - `public/manifest.json` — served by the Expo dev server, so the whole
 *    archive works locally (and on a phone over the LAN) with no hosting.
 *  - `docs/manifest.json` — the folder GitHub Pages publishes, for production.
 *
 * The bundled fixture stays a small window (see sync-fixture.ts); shipping a
 * ~9 MB JSON inside the app bundle is not an option.
 */
import { existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { z } from 'zod';

import { dayRegisterSchema, manifestSchema } from '../src/data/manifest/schema';

const DB_PATH = path.resolve('pipeline/events-db.json');
const PEOPLE_PATH = path.resolve('pipeline/people-db.json');
const TARGETS = [path.resolve('public/manifest.json'), path.resolve('docs/manifest.json')];

const db = manifestSchema.parse(JSON.parse(readFileSync(DB_PATH, 'utf8')));
const dates = new Set(db.events.map((e) => e.dateKey));

/**
 * The register is built by a separate pass and is optional: publishing must
 * still work before `pipeline:people` has ever run, and a malformed register
 * must not take the whole archive down with it.
 */
const registerFileSchema = z.object({
  generatedAt: z.string(),
  register: z.array(dayRegisterSchema),
});

function loadRegister() {
  if (!existsSync(PEOPLE_PATH)) {
    return undefined;
  }
  const parsed = registerFileSchema.safeParse(JSON.parse(readFileSync(PEOPLE_PATH, 'utf8')));
  if (!parsed.success) {
    console.warn('people-db.json failed validation — publishing without the register.');
    return undefined;
  }
  return parsed.data.register;
}

const register = loadRegister();

/**
 * The authored questions travel separately.
 *
 * Measured on the finished archive: 21.8 MB raw / 5.73 MB gzipped, of which
 * the quiz pools are 6.3 MB raw / 2.01 MB gzipped. Nothing outside a quiz
 * reads them, so making every reader download them before the first card
 * renders was paying the whole cost up front for a feature most sessions never
 * open. Split, the first download is 3.78 MB gzipped and the pools arrive when
 * a quiz actually starts.
 *
 * What stays behind on the event is `authored` — the FACT that a pool exists,
 * which the deck planner and the simulation picker need synchronously.
 */
const quizzes: Record<string, unknown> = {};
const events = db.events.map((event) => {
  if (event.quizPool.length === 0) {
    return event;
  }
  quizzes[event.id] = event.quizPool;
  return { ...event, quizPool: [], authored: true };
});

const manifest = manifestSchema.parse({
  version: 1,
  generatedAt: new Date().toISOString(),
  events,
  ...(register ? { register } : {}),
});
const json = `${JSON.stringify(manifest)}\n`;
const quizJson = `${JSON.stringify({ version: 1, quizzes })}\n`;

for (const target of TARGETS) {
  mkdirSync(path.dirname(target), { recursive: true });
  writeFileSync(target, json);
  writeFileSync(path.join(path.dirname(target), 'quizzes.json'), quizJson);
  console.log(`Wrote ${path.relative(process.cwd(), target)} + quizzes.json`);
}

const mb = (s: string) => (Buffer.byteLength(s) / 1048576).toFixed(2);
console.log(
  `\nArchive: ${manifest.events.length} events across ${dates.size} of 366 days · ${mb(json)} MB` +
    `\nQuizzes: ${Object.keys(quizzes).length} pools · ${mb(quizJson)} MB, fetched only when a quiz starts`,
);
