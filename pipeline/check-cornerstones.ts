/**
 * Verify every cornerstone before a build trusts it.
 *
 *   npx tsx pipeline/check-cornerstones.ts
 *
 * A mistyped article title fails SILENTLY in the builder — the event is simply
 * absent from the day, which is the exact failure this list exists to prevent.
 * So the list gets its own gate: every title must resolve to a real article
 * with a lead extract and a freely licensed image.
 *
 * Exits non-zero when anything fails, so it can guard a build.
 */
import { fetchArticleExtracts, resolveImagesBatch } from './imagery';
import { CORNERSTONES } from './cornerstones';

const THUMB_WIDTH = 1200;
const BATCH = 40;

function chunk<T>(items: readonly T[], size: number): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < items.length; i += size) {
    out.push(items.slice(i, i + size));
  }
  return out;
}

async function main(): Promise<void> {
  const titles = [...new Set(CORNERSTONES.map((c) => c.wikiTitle))];
  console.log(`Checking ${CORNERSTONES.length} cornerstones (${titles.length} distinct articles)…\n`);

  const images = new Map<string, boolean>();
  const extracts = new Map<string, number>();

  for (const group of chunk(titles, BATCH)) {
    const resolved = await resolveImagesBatch(group, THUMB_WIDTH);
    for (const title of group) {
      images.set(title, resolved.has(title));
    }
    const texts = await fetchArticleExtracts(group);
    for (const title of group) {
      extracts.set(title, (texts.get(title) ?? '').length);
    }
    await new Promise((r) => setTimeout(r, 700));
  }

  const problems: string[] = [];
  for (const c of CORNERSTONES) {
    const hasImage = images.get(c.wikiTitle) ?? false;
    const extract = extracts.get(c.wikiTitle) ?? 0;
    const ok = hasImage && extract > 120;
    if (!ok) {
      problems.push(
        `  ${c.dateKey} ${String(c.year).padStart(5)}  "${c.wikiTitle}" — ` +
          `${hasImage ? '' : 'no free image; '}${extract > 120 ? '' : `extract ${extract} chars`}`,
      );
    }
  }

  const byDate = new Map<string, number>();
  for (const c of CORNERSTONES) {
    byDate.set(c.dateKey, (byDate.get(c.dateKey) ?? 0) + 1);
  }

  console.log(`Dates covered: ${byDate.size} of 366`);
  console.log(`Usable: ${CORNERSTONES.length - problems.length} of ${CORNERSTONES.length}`);

  if (problems.length > 0) {
    console.log('\nFAILING — fix the title, or drop the entry:');
    for (const p of problems) console.log(p);
    process.exitCode = 1;
    return;
  }
  console.log('\nAll cornerstones resolve to a free-licensed article image.');
}

void main();
