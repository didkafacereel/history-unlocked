/**
 * Download any track in music/library.json that is not on disk yet, after
 * checking its licence on Commons again — a file can be relicensed or
 * deleted, and a bed that turns out not to be free gets the video muted.
 *
 *   node video/tools/fetch-music.mjs
 */
import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { commonsApi, download, isPublicDomain } from './lib/wiki.mjs';

const musicDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', 'music');
const { tracks } = JSON.parse(readFileSync(path.join(musicDir, 'library.json'), 'utf8'));

for (const t of tracks) {
  const file = path.join(musicDir, t.file);
  if (existsSync(file)) continue;
  const j = await commonsApi({ action: 'query', titles: t.commons, prop: 'imageinfo', iiprop: 'url|extmetadata' });
  const ii = j.query?.pages?.[0]?.imageinfo?.[0];
  if (!ii) {
    console.log(`  ✗ ${t.id}: ${t.commons} not found on Commons`);
    continue;
  }
  if (!isPublicDomain(ii.extmetadata)) {
    console.log(`  ✗ ${t.id}: REFUSED — now "${ii.extmetadata?.LicenseShortName?.value}"`);
    continue;
  }
  await download(ii.url.replace(/\?.*$/, ''), file);
  console.log(`  ✓ ${t.file}`);
}
console.log('music library complete');
