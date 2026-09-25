/**
 * Step 1 of a daily video: what happened on this day, and which of it can be
 * told with pictures we are allowed to use.
 *
 *   node video/tools/research.mjs 09-26                   candidates for 26 September
 *   node video/tools/research.mjs 09-26 --fetch "Stanislav Petrov" "1983 Soviet nuclear false alarm incident"
 *                                                          save those articles as plain text
 *
 * Writes video/.research/<MM-DD>/
 *   candidates.md   every event of the day — the app's own archive first — with
 *                   how many public-domain images its articles carry, sorted
 *                   so the tellable, illustratable stories come first
 *   sources/*.txt   full article text for the story chosen, read before a word
 *                   of script is written (every claim must come from these)
 *
 * Why count images first: a story with no public-domain pictures cannot be
 * made into a video however good it is, and finding that out after the script
 * is written wastes the evening. Counting is approximate — it only sees the
 * images already on the articles; images.mjs can search Commons more widely.
 */
import { existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { articleText, onThisDay, wikiApi, isPublicDomain } from './lib/wiki.mjs';

const here = path.dirname(fileURLToPath(import.meta.url));
const videoDir = path.resolve(here, '..');
const repo = path.resolve(videoDir, '..');

const argv = process.argv.slice(2);
// "tomorrow" — what the nightly run asks for: the video is made the evening
// before the anniversary it tells.
if (argv[0] === 'tomorrow') {
  const t = new Date();
  t.setDate(t.getDate() + 1);
  const pad = (n) => String(n).padStart(2, '0');
  const iso = `${t.getFullYear()}-${pad(t.getMonth() + 1)}-${pad(t.getDate())}`;
  argv[0] = iso.slice(5);
  const made = existsSync(path.join(videoDir, 'ready'))
    ? readdirSync(path.join(videoDir, 'ready')).filter((d) => d.startsWith(iso))
    : [];
  console.log(`tomorrow = ${iso} (dateKey ${argv[0]})${made.length ? ` — ALREADY MADE: video/ready/${made[0]}` : ''}`);
}
const [dateKey, flag, ...titles] = argv;
if (!/^\d\d-\d\d$/.test(dateKey ?? '')) {
  console.error('usage: node video/tools/research.mjs MM-DD|tomorrow [--fetch "Article" ...]');
  process.exit(1);
}
const out = path.join(videoDir, '.research', dateKey);
mkdirSync(path.join(out, 'sources'), { recursive: true });

if (flag === '--fetch') {
  for (const t of titles) {
    const a = await articleText(t);
    if (!a) {
      console.log(`  ✗ no article "${t}"`);
      continue;
    }
    const file = path.join(out, 'sources', a.title.replace(/[\\/:*?"<>|]/g, '_') + '.txt');
    writeFileSync(file, `${a.title}\n${a.url}\n\n${a.text}`);
    console.log(`  ✓ ${path.relative(repo, file)} — ${a.text.split(/\s+/).length} words`);
  }
  process.exit(0);
}

// ── candidates ────────────────────────────────────────────────────────────
const manifest = JSON.parse(readFileSync(path.join(repo, 'public', 'manifest.json'), 'utf8'));
const archive = manifest.events.filter((e) => e.dateKey === dateKey);
const feed = await onThisDay(dateKey).catch((e) => {
  console.warn(`  (on-this-day feed unavailable: ${e.message})`);
  return [];
});

const candidates = archive.map((e) => ({
  year: e.year,
  title: e.title,
  inApp: true,
  id: e.id,
  category: e.category,
  solemn: e.sensitivity === 'solemn',
  pages: [e.wikiTitle].filter(Boolean),
}));
for (const f of feed) {
  const same = candidates.find((c) => c.year === f.year && (c.pages[0] ? f.pages.includes(c.pages[0]) : false));
  if (same) {
    for (const p of f.pages) if (!same.pages.includes(p)) same.pages.push(p);
    same.feedText = f.text;
  } else {
    candidates.push({ year: f.year, title: f.text, inApp: false, pages: f.pages.slice(0, 5) });
  }
}

// Public-domain image count across each candidate's first few articles.
async function pdImages(pages) {
  if (!pages.length) return { count: 0, sample: [] };
  const j = await wikiApi({
    action: 'query',
    generator: 'images',
    titles: pages.slice(0, 4).join('|'),
    gimlimit: 'max',
    prop: 'imageinfo',
    iiprop: 'extmetadata|size',
  });
  const files = (j.query?.pages ?? []).filter((p) => {
    const ii = p.imageinfo?.[0];
    if (!ii || /\.(svg|gif)$/i.test(p.title)) return false;
    if (ii.width < 500 || ii.height < 400) return false;
    return isPublicDomain(ii.extmetadata);
  });
  return { count: files.length, sample: files.slice(0, 4).map((p) => p.title.replace(/^File:/, '')) };
}

for (const c of candidates) {
  try {
    Object.assign(c, await pdImages(c.pages));
  } catch (e) {
    c.count = -1;
    c.sample = [`(lookup failed: ${e.message.slice(0, 60)})`];
  }
}

// What recent videos covered, so tomorrow is not the third battle in a row.
const logFile = path.join(videoDir, 'log.json');
const log = existsSync(logFile) ? JSON.parse(readFileSync(logFile, 'utf8')) : [];

candidates.sort((a, b) => Number(b.inApp) - Number(a.inApp) || b.count - a.count || a.year - b.year);
const yr = (y) => (y < 0 ? `${-y} BC` : String(y));
const lines = [
  `# ${dateKey} — candidates`,
  '',
  'In the app first, then by public-domain images found on the articles.',
  'Solemn = the archive marks it as a tragedy: tell it with care or skip it.',
  '',
  '## Last videos (avoid repeating the same kind of story)',
  ...(log.length ? log.slice(-7).map((l) => `- ${l.date} · ${l.category ?? ''} · ${l.title}`) : ['- (none yet)']),
  '',
  '## Candidates',
  '',
];
for (const c of candidates) {
  lines.push(
    `- **${yr(c.year)}** ${c.title}${c.inApp ? '' : '  _(not in app)_'}${c.solemn ? '  ⚠ solemn' : ''}` +
      `${c.category ? `  · ${c.category}` : ''}`,
    `  - PD images: ${c.count}${c.sample?.length ? ` — ${c.sample.join(' · ')}` : ''}`,
    `  - articles: ${c.pages.join(' · ') || '—'}${c.id ? `  · id \`${c.id}\`` : ''}`,
  );
  if (c.feedText && c.feedText !== c.title) lines.push(`  - feed: ${c.feedText}`);
}
writeFileSync(path.join(out, 'candidates.md'), lines.join('\n') + '\n');
writeFileSync(path.join(out, 'candidates.json'), JSON.stringify(candidates, null, 2));
console.log(`${candidates.length} candidates → ${path.relative(repo, path.join(out, 'candidates.md'))}`);
for (const c of candidates.slice(0, 12)) {
  console.log(`  ${String(c.count).padStart(3)} PD  ${yr(c.year).padStart(7)}  ${c.title.slice(0, 80)}${c.solemn ? '  ⚠' : ''}`);
}
