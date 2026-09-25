/**
 * Start a day's folder: fonts, app icon, project files and a script.json
 * skeleton to fill in.
 *
 *   node video/tools/new-day.mjs 2026-09-26 petrov
 *     → video/day-2026-09-26-petrov/
 *
 * `date` is the day the video is POSTED, which is the anniversary it tells.
 */
import { copyFileSync, existsSync, mkdirSync, readdirSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const videoDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const [date, slug] = process.argv.slice(2);
if (!/^\d{4}-\d\d-\d\d$/.test(date ?? '') || !/^[a-z0-9-]+$/.test(slug ?? '')) {
  console.error('usage: node video/tools/new-day.mjs YYYY-MM-DD short-slug');
  process.exit(1);
}
const name = `day-${date}-${slug}`;
const dir = path.join(videoDir, name);
if (existsSync(path.join(dir, 'script.json'))) {
  console.log(`${name} already exists — leaving it as it is`);
  process.exit(0);
}
mkdirSync(path.join(dir, 'fonts'), { recursive: true });
mkdirSync(path.join(dir, 'assets'), { recursive: true });
for (const f of readdirSync(path.join(videoDir, 'shared', 'fonts'))) {
  copyFileSync(path.join(videoDir, 'shared', 'fonts', f), path.join(dir, 'fonts', f));
}
copyFileSync(path.join(videoDir, 'shared', 'icon.png'), path.join(dir, 'assets', 'icon.png'));

const json = (file, data) => writeFileSync(path.join(dir, file), JSON.stringify(data, null, 2) + '\n');
json('hyperframes.json', {
  $schema: 'https://hyperframes.heygen.com/schema/hyperframes.json',
  registry: 'https://raw.githubusercontent.com/heygen-com/hyperframes/main/registry',
  paths: { blocks: 'compositions', components: 'compositions/components', assets: 'assets' },
  media: { autoProxy: true },
});
json('package.json', {
  name,
  private: true,
  type: 'module',
  scripts: { make: `node ../tools/make.mjs .`, preview: 'npx --yes hyperframes@0.8.72 preview' },
});
json('meta.json', { id: name, name, createdAt: new Date().toISOString() });

const [, mm, dd] = date.split('-');
json('script.json', {
  format: 2,
  date,
  dateKey: `${mm}-${dd}`,
  slug,
  title: '',
  eventId: '',
  category: '',
  sources: [],
  music: { track: '' },
  highlight: [],
  cover: { image: '', focus: '50% 40%', date: '', lines: ['', ''] },
  sentences: [{ id: 's1', say: '', show: '', pauseAfter: 0.45 }],
  scenes: [{ type: 'title', image: '', focus: '50% 50%', date: '', year: '', place: '' }],
  post: { tiktok: '', facebook: '' },
});
console.log(`video/${name}/ — fill in script.json, then: node video/tools/make.mjs video/${name}`);
