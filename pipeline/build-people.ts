/**
 * Build the day register — births, deaths and observances — for a date range.
 *
 *   npx tsx pipeline/build-people.ts --date 01-01 --days 366
 *   npx tsx pipeline/build-people.ts --date 09-12 --dry
 *
 * Writes `pipeline/people-db.json`, deliberately SEPARATE from the events
 * database: the two passes have different costs and different failure modes,
 * and keeping them apart means a long events rebuild and a register run can
 * never clobber each other's file.
 *
 * `publish-manifest.ts` merges the two on the way out.
 */
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { z } from 'zod';

import { dayRegisterSchema } from '../src/data/manifest/schema';
import { todayDateKey } from '../src/lib/dateKey';
import { fetchDayRegister } from './people';

type StoredRegister = z.infer<typeof dayRegisterSchema>;

const DB_PATH = path.resolve('pipeline/people-db.json');
const registerFileSchema = z.object({
  generatedAt: z.string(),
  register: z.array(dayRegisterSchema),
});

/** A dense card holds about this many rows before it stops being scannable. */
const BIRTHS_PER_DAY = 5;
const DEATHS_PER_DAY = 4;

/** Same politeness budget as the events pass; backoff in archival.ts covers spikes. */
const REQUEST_SPACING_MS = 700;
/** Long runs flush periodically so an interruption costs at most this many days. */
const FLUSH_EVERY_DAYS = 15;

function readArg(flag: string): string | null {
  const i = process.argv.indexOf(flag);
  const v = i >= 0 ? process.argv[i + 1] : undefined;
  return v && !v.startsWith('--') ? v : null;
}

function dateRange(startKey: string, days: number): string[] {
  const [mm = 1, dd = 1] = startKey.split('-').map(Number);
  return Array.from({ length: Math.max(1, days) }, (_, i) => {
    // 2024 is a leap year, so 29 February is always reachable.
    const d = new Date(2024, mm - 1, dd + i);
    return `${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  });
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

function loadExisting(): Map<string, StoredRegister> {
  if (!existsSync(DB_PATH)) {
    return new Map();
  }
  const parsed = registerFileSchema.safeParse(JSON.parse(readFileSync(DB_PATH, 'utf8')));
  if (!parsed.success) {
    console.warn('people-db.json failed validation — starting fresh.');
    return new Map();
  }
  return new Map(parsed.data.register.map((r) => [r.dateKey, r]));
}

function write(all: Map<string, StoredRegister>): void {
  const validated = registerFileSchema.parse({
    generatedAt: new Date().toISOString(),
    register: [...all.values()].sort((a, b) => a.dateKey.localeCompare(b.dateKey)),
  });
  writeFileSync(DB_PATH, `${JSON.stringify(validated, null, 2)}\n`);
}

async function main(): Promise<void> {
  const dry = process.argv.includes('--dry');
  const startKey = readArg('--date') ?? todayDateKey();
  const days = Number(readArg('--days') ?? '1');
  const dates = dateRange(startKey, days);

  const all = loadExisting();
  let built = 0;

  for (const [index, dateKey] of dates.entries()) {
    try {
      const register = await fetchDayRegister(dateKey, {
        births: BIRTHS_PER_DAY,
        deaths: DEATHS_PER_DAY,
      });
      const parsed = dayRegisterSchema.safeParse(register);
      if (!parsed.success) {
        console.warn(`  ~ ${dateKey}: ${parsed.error.issues[0]?.message ?? 'invalid'}`);
        continue;
      }

      all.set(dateKey, parsed.data);
      built++;
      console.log(
        `${dateKey}  ${parsed.data.births.length} born · ${parsed.data.deaths.length} died · ` +
          `${parsed.data.observances.length} observances` +
          (parsed.data.births[0] ? `  — e.g. ${parsed.data.births[0].name}` : ''),
      );
    } catch (error) {
      console.warn(`  ! ${dateKey}: ${error instanceof Error ? error.message : String(error)}`);
    }

    if (!dry && built > 0 && (index + 1) % FLUSH_EVERY_DAYS === 0) {
      write(all);
      console.log(`  … flushed ${all.size} days`);
    }
    if (index < dates.length - 1) {
      await sleep(REQUEST_SPACING_MS);
    }
  }

  if (dry) {
    console.log(`\nDry run — ${built} days built, nothing written.`);
    return;
  }

  write(all);
  console.log(`\nREGISTER COMPLETE: ${all.size} days in pipeline/people-db.json`);
}

void main();
