/**
 * Archival imagery source — Wikipedia / Wikimedia Commons.
 *
 * For a history app this beats generated art on the axis that matters most:
 * authenticity. A real 1944 photograph or a period painting IS the history;
 * an AI impression of one is a guess. It is also free, keyless, and unlimited,
 * which no image-generation API currently is.
 *
 * Flow: event → Wikipedia article → that article's lead image (human-curated,
 * so it is reliably ON topic) → Commons license metadata. Anything that is not
 * clearly free-licensed is rejected rather than shipped.
 */

export const WIKI_API = 'https://en.wikipedia.org/w/api.php';
export const COMMONS_API = 'https://commons.wikimedia.org/w/api.php';

/** Wikimedia asks API clients to identify themselves. */
const USER_AGENT =
  'HistoryUnlockedBot/0.1 (History Unlocked educational app; archival image resolver)';

export interface ArchivalImage {
  /** Thumbnail URL at roughly the requested width. */
  imageUrl: string;
  /** Display attribution, e.g. "Robert F. Sargent · Public domain". */
  credit: string;
  /** Commons file page — the credit links here. */
  sourceUrl: string;
  fileName: string;
  licenseShortName: string;
  /** width / height — the card letterboxes wide images instead of cropping. */
  aspect: number;
  /**
   * Year the work is dated to on Commons, when it states one.
   *
   * The only reliable way to catch a picture from the wrong era when the
   * filename does not say so — "Adolf_Hitler_in_Memel.png" is 1939 and admits
   * nothing, and it was offered as the backdrop for a 1923 event.
   */
  dateYear?: number;
}

/** First plausible year in a Commons date field, which is free-form text. */
export function metadataYear(meta: Record<string, { value?: string }>): number | undefined {
  const raw = stripHtml(meta.DateTimeOriginal?.value ?? meta.DateTime?.value ?? '');
  const match = raw.match(/(?<![0-9])(1[0-9]{3}|20[0-9]{2})(?![0-9])/);
  return match ? Number(match[1]) : undefined;
}

interface PageImagesResponse {
  query?: {
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

interface SearchResponse {
  query?: { search?: { title?: string }[] };
}

interface ImageInfoResponse {
  query?: {
    pages?: Record<
      string,
      {
        imageinfo?: {
          descriptionurl?: string;
          extmetadata?: Record<string, { value?: string }>;
        }[];
      }
    >;
  };
}

const MAX_ATTEMPTS = 5;
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

/**
 * Wikimedia throttles bursts, and a full-year build is one long burst. Rather
 * than crawling slowly enough to never hit a limit, go at a reasonable pace and
 * back off politely when told to — honoring `Retry-After` when the server sends
 * one. A 429 is guidance, not a failure.
 */
export async function callApi<T>(base: string, params: Record<string, string>): Promise<T> {
  return fetchJson<T>(`${base}?${new URLSearchParams({ format: 'json', ...params }).toString()}`);
}

/**
 * Every Wikimedia request in the pipeline goes through here so they all share
 * the same politeness: identify ourselves, and back off when throttled rather
 * than dying mid-run.
 */
export async function fetchJson<T>(url: string): Promise<T> {
  let lastError = '';
  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
    let res: Response;
    try {
      res = await fetch(url, {
        headers: { 'user-agent': USER_AGENT, accept: 'application/json' },
        signal: AbortSignal.timeout(30_000),
      });
    } catch (error) {
      // `fetch` THROWS for anything below HTTP: DNS failure, socket reset, the
      // 30s timeout. These were not retried, and a full-year build — an hour of
      // work — died on a single `ENOTFOUND en.wikipedia.org` blip at day 190.
      // A transient network fault deserves the same patience as a 429.
      lastError = error instanceof Error ? error.message : String(error);
      if (attempt === MAX_ATTEMPTS) {
        break;
      }
      const waitMs = 2000 * 2 ** (attempt - 1);
      console.warn(
        `    network: ${lastError} — waiting ${Math.round(waitMs / 1000)}s (attempt ${attempt}/${MAX_ATTEMPTS})`,
      );
      await sleep(waitMs);
      continue;
    }

    if (res.ok) {
      return (await res.json()) as T;
    }

    const retryable = res.status === 429 || res.status >= 500;
    lastError = `${res.status} ${res.statusText}`;
    if (!retryable || attempt === MAX_ATTEMPTS) {
      break;
    }

    const retryAfter = Number(res.headers.get('retry-after'));
    const waitMs = Number.isFinite(retryAfter) && retryAfter > 0
      ? retryAfter * 1000
      : 1000 * 2 ** (attempt - 1);
    console.warn(`    ${lastError} — waiting ${Math.round(waitMs / 1000)}s (attempt ${attempt}/${MAX_ATTEMPTS})`);
    await sleep(waitMs);
  }

  throw new Error(`Wikimedia ${lastError} for ${url}`);
}

function firstPage<T>(pages: Record<string, T> | undefined): T | null {
  if (!pages) {
    return null;
  }
  const values = Object.values(pages);
  return values[0] ?? null;
}

/**
 * The API appends `utm_*` analytics params to image URLs. They are noise in a
 * shipped manifest (and send tracking params on every card load), so drop them —
 * the path alone resolves the file.
 */
export function cleanImageUrl(url: string): string {
  const parsed = new URL(url);
  parsed.search = '';
  return parsed.toString();
}

/**
 * Commons markup arrives as HTML; the UI wants a plain line.
 *
 * Artist fields commonly nest the same name twice (an outer wrapper plus an
 * inner `fn value` span), which strips to "Unknown author Unknown author" —
 * so collapse an exactly-repeated string back to one copy.
 */
export function stripHtml(value: string): string {
  const flat = value
    .replace(/<[^>]*>/g, ' ')
    .replace(/&[a-z]+;/gi, ' ')
    .replace(/\s+/g, ' ')
    .trim();

  const half = Math.floor(flat.length / 2);
  if (flat.length % 2 === 1 && flat[half] === ' ') {
    const left = flat.slice(0, half);
    if (left === flat.slice(half + 1)) {
      return left;
    }
  }
  return flat;
}

/**
 * Only ship imagery we are clearly allowed to use. Public domain and the CC
 * family are fine; anything else (fair use, "non-free", unknown) is rejected —
 * an app that ships an unlicensed image has a legal problem, not a design one.
 */
export function isFreeLicense(shortName: string): boolean {
  const value = shortName.toLowerCase();
  if (!value) {
    return false;
  }
  if (value.includes('non-free') || value.includes('fair use')) {
    return false;
  }
  return (
    value.includes('public domain') ||
    value.includes('pd-') ||
    value.startsWith('cc') ||
    value.includes('cc0') ||
    value.includes('creative commons')
  );
}

/**
 * Article titles matching a query, best first.
 *
 * Exported and plural because the top hit is not always usable: an event whose
 * article is a country hub needs the SECOND or third result — the one about the
 * event rather than the nation it happened in. Callers that want a single
 * answer take `[0]`.
 */
export async function searchArticleTitles(query: string, limit = 1): Promise<string[]> {
  const data = await callApi<SearchResponse>(WIKI_API, {
    action: 'query',
    list: 'search',
    srsearch: query,
    srlimit: String(limit),
  });
  return (data.query?.search ?? [])
    .map((hit) => hit.title)
    .filter((title): title is string => typeof title === 'string' && title.length > 0);
}

/** Resolve an article title when the event doesn't carry an explicit one. */
async function searchArticleTitle(query: string): Promise<string | null> {
  return (await searchArticleTitles(query, 1))[0] ?? null;
}

interface ArticleImagesResponse {
  query?: {
    pages?: Record<string, { images?: { title?: string }[] }>;
  };
}

interface CommonsFileResponse {
  query?: {
    pages?: Record<
      string,
      {
        imageinfo?: {
          url?: string;
          thumburl?: string;
          thumbwidth?: number;
          thumbheight?: number;
          width?: number;
          height?: number;
          descriptionurl?: string;
          extmetadata?: Record<string, { value?: string }>;
        }[];
      }
    >;
  };
}

/**
 * Every image an article carries, not just its lead.
 *
 * `pageimages` returns the ONE picture Wikipedia chose to head the article, and
 * for a country, a party or an Act of Parliament that choice is a flag, an
 * emblem or a coat of arms. The article is still the right article — the
 * Roman Catholic Relief Act 1829 is exactly the subject of an event about the
 * Roman Catholic Relief Act receiving royal assent — so the fix is to look
 * further down the same page rather than to go and find a different one.
 *
 * Returns file names in page order, which is roughly reading order, so the
 * first usable one is normally the illustration beside the opening paragraph.
 *
 * Forty, not twelve. Every event drawing from one article must end up with a
 * DIFFERENT picture, so the pool has to be deeper than the number of events
 * sharing it — and "World War II" is the backdrop of a hundred-odd cards. At
 * twelve the pool ran dry and the surplus events kept the picture they had.
 * Costs nothing extra: the names arrive in one request and are resolved in one
 * batch either way.
 */
export async function fetchArticleImageNames(title: string, limit = 40): Promise<string[]> {
  const data = await callApi<ArticleImagesResponse>(WIKI_API, {
    action: 'query',
    prop: 'images',
    imlimit: String(limit),
    titles: title,
  });
  return (firstPage(data.query?.pages)?.images ?? [])
    .map((i) => i.title)
    .filter((t): t is string => typeof t === 'string' && /^File:/i.test(t))
    .map((t) => t.replace(/^File:/i, ''));
}

interface CommonsSearchResponse {
  query?: { search?: { title?: string }[] };
}

/**
 * Candidate file names from Commons itself, rather than from a Wikipedia page.
 *
 * `fetchArticleImageNames` can only ever return the handful of pictures an
 * editor chose to place on the article, and for a long-lived subject those are
 * usually the modern ones — which is exactly the material that produced the
 * anachronisms. Commons holds far more: "Category:Richard Petty" has period
 * photographs the article never uses.
 *
 * Searching the File namespace rather than walking a category, because the
 * category name is a guess and the search is not: it matches file titles and
 * descriptions, so the event's own subject words find their own material. The
 * year goes in the query for the same reason it goes in the article search —
 * these are recurring subjects and the 1979 Daytona is not the 2024 one.
 *
 * Noisy by nature. Every caller must still put the results through
 * `replacementFault` and a human.
 */
export async function searchCommonsFiles(query: string, limit = 30): Promise<string[]> {
  const data = await callApi<CommonsSearchResponse>(COMMONS_API, {
    action: 'query',
    list: 'search',
    srnamespace: '6',
    srlimit: String(limit),
    srsearch: query,
  });
  return (data.query?.search ?? [])
    .map((r) => r.title)
    .filter((t): t is string => typeof t === 'string' && /^File:/i.test(t))
    .map((t) => t.replace(/^File:/i, ''));
}

/**
 * Resolve one named Commons file the same way `resolveArchivalImage` resolves a
 * lead image: free licence or nothing, credit and aspect carried with it.
 *
 * Rejects anything small. A 60-pixel-wide file on a Wikipedia page is an icon,
 * a rating star or a navigation arrow, never the illustration.
 */
const MIN_SOURCE_WIDTH = 320;

/**
 * Resolve MANY Commons files in one request, keyed by file name.
 *
 * Commons takes up to 50 titles per `imageinfo` query, and using that is the
 * difference between a usable pass and an unusable one: resolving a page's
 * dozen images one at a time made the backdrop repair run at two events a
 * minute, which is twelve hours for the archive. Batched it is two calls per
 * event. This is the same lesson `pipeline/imagery.ts` already learned for the
 * events build — prefer the batch, always.
 *
 * Files that are missing, non-free or too small are simply absent from the map
 * rather than reported: the caller wants the usable ones.
 *
 * Keys are normalised. `prop=images` returns titles with SPACES ("Foo bar.jpg")
 * while the URL the response carries has UNDERSCORES, so a naive lookup misses
 * every single file — the first batched run proposed nothing at all.
 */
const COMMONS_TITLES_PER_REQUEST = 50;

export function commonsKey(fileName: string): string {
  // The `?utm_source=…` Commons appends to imageinfo URLs was silently part of
  // every key on the first attempt, so nothing ever matched.
  const bare = fileName.split(/[?#]/)[0] ?? '';
  // decodeURIComponent throws on a lone "%", and Commons has such filenames.
  let decoded: string;
  try {
    decoded = decodeURIComponent(bare);
  } catch {
    decoded = bare;
  }
  return decoded.replace(/ /g, '_').replace(/^\d+px-/, '');
}

export async function resolveCommonsFiles(
  fileNames: readonly string[],
  width: number,
): Promise<Map<string, ArchivalImage>> {
  const out = new Map<string, ArchivalImage>();
  if (fileNames.length === 0) {
    return out;
  }

  for (let i = 0; i < fileNames.length; i += COMMONS_TITLES_PER_REQUEST) {
    const slice = fileNames.slice(i, i + COMMONS_TITLES_PER_REQUEST);
    const data = await callApi<CommonsFileResponse>(COMMONS_API, {
      action: 'query',
      prop: 'imageinfo',
      iiprop: 'url|size|extmetadata',
      iiurlwidth: String(width),
      titles: slice.map((name) => `File:${name}`).join('|'),
    });

    for (const page of Object.values(data.query?.pages ?? {})) {
      const info = page.imageinfo?.[0];
      const thumbUrl = info?.thumburl ?? info?.url;
      const thumbWidth = info?.thumbwidth ?? info?.width;
      const thumbHeight = info?.thumbheight ?? info?.height;
      if (!thumbUrl || !thumbWidth || !thumbHeight) {
        continue;
      }
      if ((info?.width ?? 0) < MIN_SOURCE_WIDTH) {
        continue;
      }
      const meta = info?.extmetadata ?? {};
      const licenseShortName = stripHtml(meta.LicenseShortName?.value ?? '');
      if (!isFreeLicense(licenseShortName)) {
        continue;
      }
      // The response does not echo the requested title, so recover the file
      // name from the URL — it is the last path segment, percent-encoded.
      const fileName = commonsKey((info?.url ?? thumbUrl).split('/').pop() ?? '');
      const artist = stripHtml(meta.Artist?.value ?? '');
      const credit = [artist, licenseShortName].filter(Boolean).join(' · ').slice(0, 160);

      out.set(fileName, {
        imageUrl: cleanImageUrl(thumbUrl),
        credit: credit || licenseShortName,
        sourceUrl:
          info?.descriptionurl ??
          `https://commons.wikimedia.org/wiki/File:${encodeURIComponent(fileName)}`,
        fileName,
        licenseShortName,
        aspect: Number((thumbWidth / thumbHeight).toFixed(3)),
        dateYear: metadataYear(meta),
      });
    }
  }

  return out;
}

export interface ResolveOptions {
  /** Preferred: the curated article for this event. */
  wikiTitle?: string;
  /** Fallback search query (the event title + region usually works). */
  fallbackQuery: string;
  /** Target width for the delivered thumbnail. */
  width: number;
}

export async function resolveArchivalImage(
  options: ResolveOptions,
): Promise<ArchivalImage | null> {
  const title = options.wikiTitle ?? (await searchArticleTitle(options.fallbackQuery));
  if (!title) {
    return null;
  }

  const pageData = await callApi<PageImagesResponse>(WIKI_API, {
    action: 'query',
    prop: 'pageimages',
    piprop: 'thumbnail|name',
    pithumbsize: String(options.width),
    titles: title,
  });

  const page = firstPage(pageData.query?.pages);
  const thumbUrl = page?.thumbnail?.source;
  const fileName = page?.pageimage;
  const thumbWidth = page?.thumbnail?.width;
  const thumbHeight = page?.thumbnail?.height;
  if (!thumbUrl || !fileName || !thumbWidth || !thumbHeight) {
    return null;
  }

  const infoData = await callApi<ImageInfoResponse>(COMMONS_API, {
    action: 'query',
    prop: 'imageinfo',
    iiprop: 'url|extmetadata',
    titles: `File:${fileName}`,
  });

  const info = firstPage(infoData.query?.pages)?.imageinfo?.[0];
  const meta = info?.extmetadata ?? {};
  const licenseShortName = stripHtml(meta.LicenseShortName?.value ?? '');
  if (!isFreeLicense(licenseShortName)) {
    return null;
  }

  const artist = stripHtml(meta.Artist?.value ?? '');
  const credit = [artist, licenseShortName].filter(Boolean).join(' · ').slice(0, 160);

  return {
    imageUrl: cleanImageUrl(thumbUrl),
    credit: credit || licenseShortName,
    sourceUrl:
      info?.descriptionurl ??
      `https://commons.wikimedia.org/wiki/File:${encodeURIComponent(fileName)}`,
    fileName,
    licenseShortName,
    aspect: Number((thumbWidth / thumbHeight).toFixed(3)),
    dateYear: metadataYear(meta),
  };
}
