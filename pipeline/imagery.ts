/**
 * Batched image resolution — what makes a full 366-day build practical.
 *
 * Resolving one article at a time costs two API calls per event (~24 per day,
 * ~8,800 for a year) and reliably trips Wikimedia's rate limiter. But both
 * endpoints accept up to 50 titles at once, so a whole day collapses into two
 * requests: one to en.wikipedia for the thumbnails, one to Commons for the
 * licenses.
 *
 * Note we ask the API for the size we want rather than rewriting the width in a
 * thumbnail URL ourselves — Wikimedia rejects arbitrary widths with a 400, and
 * only serves sizes it has actually rendered.
 */
import {
  callApi,
  cleanImageUrl,
  COMMONS_API,
  isFreeLicense,
  stripHtml,
  WIKI_API,
} from './archival';

/** Both endpoints cap a multi-title query at 50. */
const CHUNK = 50;

export interface ResolvedImage {
  imageUrl: string;
  credit: string;
  sourceUrl: string;
  aspect: number;
  fileName: string;
  licenseShortName: string;
}

interface TitleMapping {
  from?: string;
  to?: string;
}

interface PageImagesResponse {
  query?: {
    normalized?: TitleMapping[];
    redirects?: TitleMapping[];
    pages?: Record<
      string,
      {
        title?: string;
        pageimage?: string;
        thumbnail?: { source?: string; width?: number; height?: number };
      }
    >;
  };
}

interface ImageInfoResponse {
  query?: {
    pages?: Record<
      string,
      {
        title?: string;
        imageinfo?: {
          descriptionurl?: string;
          extmetadata?: Record<string, { value?: string }>;
        }[];
      }
    >;
  };
}

function chunk<T>(items: T[], size: number): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < items.length; i += size) {
    out.push(items.slice(i, i + size));
  }
  return out;
}

/**
 * The API silently rewrites titles (capitalisation, underscores, redirects), so
 * the page it returns may not be keyed by what we asked for. Follow the
 * normalized→redirect chain to get back to the caller's original string.
 */
function buildAliasMap(query: { normalized?: TitleMapping[]; redirects?: TitleMapping[] } | undefined): Map<string, string> {
  const direct = new Map<string, string>();
  for (const mapping of [...(query?.normalized ?? []), ...(query?.redirects ?? [])]) {
    if (mapping.from && mapping.to) {
      direct.set(mapping.from, mapping.to);
    }
  }

  // Resolve each requested title to its final destination.
  const resolved = new Map<string, string>();
  for (const from of direct.keys()) {
    let current = from;
    for (let hop = 0; hop < 5; hop++) {
      const next = direct.get(current);
      if (!next || next === current) break;
      current = next;
    }
    resolved.set(current, from);
  }
  return resolved;
}

interface ThumbInfo {
  imageUrl: string;
  aspect: number;
  fileName: string;
}

async function fetchThumbnails(titles: string[], width: number): Promise<Map<string, ThumbInfo>> {
  const found = new Map<string, ThumbInfo>();

  for (const group of chunk(titles, CHUNK)) {
    const data = await callApi<PageImagesResponse>(WIKI_API, {
      action: 'query',
      prop: 'pageimages',
      piprop: 'thumbnail|name',
      pithumbsize: String(width),
      redirects: '1',
      titles: group.join('|'),
    });

    const finalToRequested = buildAliasMap(data.query);

    for (const page of Object.values(data.query?.pages ?? {})) {
      const source = page.thumbnail?.source;
      const w = page.thumbnail?.width;
      const h = page.thumbnail?.height;
      if (!source || !w || !h || !page.pageimage || !page.title) {
        continue;
      }
      // Record under both the returned title and the one the caller asked for.
      const info: ThumbInfo = {
        imageUrl: cleanImageUrl(source),
        aspect: Number((w / h).toFixed(3)),
        fileName: page.pageimage,
      };
      found.set(page.title, info);
      const requested = finalToRequested.get(page.title);
      if (requested) {
        found.set(requested, info);
      }
    }
  }

  return found;
}

interface LicenseInfo {
  credit: string;
  sourceUrl: string;
  licenseShortName: string;
}

async function fetchLicenses(fileNames: string[]): Promise<Map<string, LicenseInfo>> {
  const found = new Map<string, LicenseInfo>();

  for (const group of chunk(fileNames, CHUNK)) {
    const data = await callApi<ImageInfoResponse>(COMMONS_API, {
      action: 'query',
      prop: 'imageinfo',
      iiprop: 'url|extmetadata',
      titles: group.map((name) => `File:${name}`).join('|'),
    });

    for (const page of Object.values(data.query?.pages ?? {})) {
      const info = page.imageinfo?.[0];
      const meta = info?.extmetadata ?? {};
      const licenseShortName = stripHtml(meta.LicenseShortName?.value ?? '');
      if (!page.title || !isFreeLicense(licenseShortName)) {
        continue;
      }

      const artist = stripHtml(meta.Artist?.value ?? '');
      const fileName = page.title.replace(/^File:/, '').replace(/ /g, '_');

      found.set(fileName, {
        credit: [artist, licenseShortName].filter(Boolean).join(' · ').slice(0, 160) ||
          licenseShortName,
        sourceUrl:
          info?.descriptionurl ??
          `https://commons.wikimedia.org/wiki/${encodeURIComponent(page.title)}`,
        licenseShortName,
      });
    }
  }

  return found;
}

interface ExtractsResponse {
  query?: {
    normalized?: TitleMapping[];
    redirects?: TitleMapping[];
    pages?: Record<string, { title?: string; extract?: string }>;
  };
}

/**
 * Lead-section plain text for many articles at once.
 *
 * A cornerstone is declared as a date and an article title and nothing else, so
 * the builder has to fetch the prose the feed would normally have handed it.
 * Batched at 20, not 50: `prop=extracts` caps a multi-title query at 20 for
 * anonymous clients and silently truncates past it.
 */
const EXTRACT_CHUNK = 20;

export async function fetchArticleExtracts(titles: string[]): Promise<Map<string, string>> {
  const found = new Map<string, string>();

  for (const group of chunk([...new Set(titles)], EXTRACT_CHUNK)) {
    const data = await callApi<ExtractsResponse>(WIKI_API, {
      action: 'query',
      prop: 'extracts',
      exintro: '1',
      explaintext: '1',
      exlimit: String(EXTRACT_CHUNK),
      redirects: '1',
      titles: group.join('|'),
    });

    const finalToRequested = buildAliasMap(data.query);

    for (const page of Object.values(data.query?.pages ?? {})) {
      const text = page.extract?.replace(/\s+/g, ' ').trim();
      if (!text || !page.title) {
        continue;
      }
      found.set(page.title, text);
      const requested = finalToRequested.get(page.title);
      if (requested) {
        found.set(requested, text);
      }
    }
  }

  return found;
}

/**
 * Resolve imagery for many articles at once. Titles with no image, or whose
 * image is not freely licensed, are simply absent from the result — the caller
 * skips those events rather than shipping something we cannot use.
 */
export async function resolveImagesBatch(
  wikiTitles: string[],
  width: number,
): Promise<Map<string, ResolvedImage>> {
  const unique = [...new Set(wikiTitles)];
  const thumbs = await fetchThumbnails(unique, width);

  const fileNames = [...new Set([...thumbs.values()].map((t) => t.fileName))];
  const licenses = await fetchLicenses(fileNames);

  const out = new Map<string, ResolvedImage>();
  for (const title of unique) {
    const thumb = thumbs.get(title);
    if (!thumb) continue;
    const license = licenses.get(thumb.fileName);
    if (!license) continue;

    out.set(title, {
      imageUrl: thumb.imageUrl,
      aspect: thumb.aspect,
      fileName: thumb.fileName,
      credit: license.credit,
      sourceUrl: license.sourceUrl,
      licenseShortName: license.licenseShortName,
    });
  }
  return out;
}
