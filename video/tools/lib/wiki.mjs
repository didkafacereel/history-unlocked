/**
 * Wikipedia / Wikimedia Commons helpers shared by the daily-video tools.
 *
 * Wikimedia asks every automated client to identify itself with a User-Agent
 * that says who to contact; anonymous scripts get throttled first.
 */
import { writeFileSync } from 'node:fs';

const UA = 'HistoryUnlockedShorts/1.0 (https://history-unlocked-fa9a9.web.app; support@gridconvertpro.com)';

export async function getJson(url, tries = 3) {
  for (let i = 1; ; i++) {
    const res = await fetch(url, { headers: { 'User-Agent': UA, 'Api-User-Agent': UA } });
    if (res.ok) return res.json();
    if (i >= tries || (res.status < 500 && res.status !== 429)) {
      throw new Error(`${res.status} ${res.statusText} — ${url}`);
    }
    await new Promise((r) => setTimeout(r, 1500 * i));
  }
}

export async function download(url, file, tries = 3) {
  for (let i = 1; ; i++) {
    const res = await fetch(url, { headers: { 'User-Agent': UA } });
    if (res.ok) {
      writeFileSync(file, Buffer.from(await res.arrayBuffer()));
      return;
    }
    if (i >= tries || (res.status < 500 && res.status !== 429)) {
      throw new Error(`${res.status} ${res.statusText} — ${url}`);
    }
    await new Promise((r) => setTimeout(r, 1500 * i));
  }
}

const api = (host, params) =>
  `https://${host}/w/api.php?` + new URLSearchParams({ format: 'json', formatversion: '2', origin: '*', ...params });

export const wikiApi = (params) => getJson(api('en.wikipedia.org', params));
export const commonsApi = (params) => getJson(api('commons.wikimedia.org', params));

/** Full plain text of an article, following redirects. */
export async function articleText(title) {
  const j = await wikiApi({ action: 'query', prop: 'extracts|info', explaintext: '1', redirects: '1', inprop: 'url', titles: title });
  const page = j.query?.pages?.[0];
  if (!page || page.missing) return null;
  return { title: page.title, url: page.fullurl, text: page.extract ?? '' };
}

/** The Wikimedia "on this day" events for a date (MM-DD). */
export async function onThisDay(dateKey) {
  const [mm, dd] = dateKey.split('-');
  const j = await getJson(`https://en.wikipedia.org/api/rest_v1/feed/onthisday/events/${mm}/${dd}`);
  return (j.events ?? []).map((e) => ({
    year: e.year,
    text: e.text,
    pages: (e.pages ?? []).map((p) => p.titles?.normalized ?? p.title),
  }));
}

/*
 * Licence gate. ONLY public domain and CC0 pass — CC BY-SA carries
 * share-alike, which a video would inherit, and CC BY needs an on-screen
 * attribution per image that a daily automated video cannot promise to get
 * right. "PD-..." template names and "Public domain" both count.
 */
export function isPublicDomain(meta) {
  const short = (meta?.LicenseShortName?.value ?? '').trim();
  const lic = (meta?.License?.value ?? '').trim().toLowerCase();
  if (/^public domain$/i.test(short) || /^pd\b/i.test(short) || /^cc0/i.test(short)) return true;
  if (lic === 'pd' || lic.startsWith('pd-') || lic === 'cc0') return true;
  return false;
}

export const stripHtml = (s) =>
  String(s ?? '')
    .replace(/<[^>]+>/g, '')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&gt;/g, '>')
    .replace(/&lt;/g, '<')
    .replace(/&#0?39;/g, "'")
    .replace(/\s+/g, ' ')
    .trim();

/**
 * imageinfo for up to 50 File: titles at a time: dimensions, licence, author,
 * description, and a thumbnail URL at the requested width. Only standard
 * thumbnail steps are served (1920 works, 1600 is refused with a 400).
 */
export async function fileInfo(titles, thumbWidth = 1920) {
  const out = [];
  for (let i = 0; i < titles.length; i += 50) {
    const batch = titles.slice(i, i + 50);
    const j = await commonsApi({
      action: 'query',
      prop: 'imageinfo',
      iiprop: 'url|size|extmetadata|mime',
      iiurlwidth: String(thumbWidth),
      titles: batch.join('|'),
    });
    for (const p of j.query?.pages ?? []) {
      const ii = p.imageinfo?.[0];
      if (!ii) continue;
      const m = ii.extmetadata ?? {};
      out.push({
        title: p.title,
        width: ii.width,
        height: ii.height,
        mime: ii.mime,
        url: ii.url,
        thumb: ii.thumburl ?? ii.url,
        page: ii.descriptionurl,
        publicDomain: isPublicDomain(m),
        licence: m.LicenseShortName?.value ?? '',
        artist: stripHtml(m.Artist?.value).slice(0, 120),
        date: stripHtml(m.DateTimeOriginal?.value).slice(0, 40),
        description: stripHtml(m.ImageDescription?.value).slice(0, 240),
      });
    }
  }
  return out;
}
