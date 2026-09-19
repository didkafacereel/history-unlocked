/**
 * Events whose Wikipedia article has the wrong lead image, and where to take
 * one from instead.
 *
 * The archival pipeline takes each event's backdrop from the lead image of its
 * own article, which is right the overwhelming majority of the time and needs
 * no curation. But an article about a battle at a lake can lead with a 2005
 * LandSat photograph of the lake, and the app then shows a satellite view of
 * empty water behind a 14th-century cavalry engagement. That is rule 6 broken
 * — "every image must depict its own event" — and it is worse than a plain
 * mismatch, because a modern orbital photograph next to a medieval scenario
 * reads as a bug rather than as a stand-in.
 *
 * A measurement, so the size of this is honest: roughly 1000 of 8056 events
 * carry a flag, a locator map, a coat of arms or a modern satellite view. Not
 * all are wrong — a period map OF the event is good imagery, and a NASA photo
 * is exactly right for a space mission — but the ones that are wrong are wrong
 * one at a time, and there is no rule that separates them. So this file is a
 * curated list, and it grows when someone sees a bad card.
 *
 * Rules for adding one:
 *  - `wikiTitle` must be an article whose LEAD image depicts something real
 *    from the event: a participant, the place as it was, an object that was there.
 *    Not a symbol of the country it happened in.
 *  - Prefer period artwork over a modern photograph of a monument. A statue
 *    erected in 1990 has the same anachronism problem as a satellite photo.
 *  - Say why in `reason`. The next person needs to know it was a judgement,
 *    not a typo.
 *  - Run `npm run pipeline:overrides` to apply, then republish.
 */

/**
 * Filenames that are a SYMBOL rather than a depiction.
 *
 * A flag, a coat of arms and a locator map all share one defect: they show what
 * country an event happened in, and nothing about the event. The archive holds
 * 576 of these — not because the pipeline misbehaved, but because Wikimedia's
 * "on this day" feed frequently links an entry to the COUNTRY article ("India",
 * "North Korea", "United States") and a country article leads with its flag.
 *
 * Deliberately narrow, twice over. A period map drawn OF an event is good
 * imagery, so only locator/orthographic/blank map names are listed — never
 * "map" on its own. And it does NOT match every SVG: a first attempt ended in
 * `\.svg\.png$`, which quietly reclassified 1426 events instead of 576, because
 * historical maps, machine schematics and battle diagrams are SVGs too. Being
 * a vector file says nothing about whether the picture depicts the event.
 */
const SYMBOL_FILE =
  /(^|[-_])flag[_ ]of|coat[_ ]of[_ ]arms|emblem[_ ]of|[-_]seal\.|(locator|orthographic[_ ]projection|blank[_ ]map|location[_ ]map)/i;

/**
 * Percent-decode, or return the input unchanged.
 *
 * `decodeURIComponent` THROWS on a lone "%" — and Commons has files with one in
 * the name. It killed a multi-hour pass twenty-four events in, from inside a
 * `.filter()` where nothing was catching. Every filename that reaches this
 * module comes from the internet, so none of it may be assumed well-formed.
 */
function safeDecode(value: string): string {
  try {
    return decodeURIComponent(value);
  } catch {
    return value;
  }
}

/** True when this backdrop is a national symbol rather than a depiction. */
export function isSymbolImage(imageUrl: string): boolean {
  return SYMBOL_FILE.test(safeDecode(imageUrl.split('/').pop() ?? ''));
}

/**
 * Events where the symbol IS the subject, and the picture is therefore correct.
 *
 * "The Italian tricolour was first adopted as an official flag" must keep its
 * flag; replacing it would be the same defect in reverse. Matched against the
 * event's own words rather than a list of ids, so it keeps working after a
 * rebuild renumbers everything.
 */
const ABOUT_THE_SYMBOL =
  /\b(flag|tricolou?r|banner|coat of arms|emblem|standard|ensign|heraldic|national anthem)\b/i;

export function symbolIsTheSubject(title: string, summary?: string): boolean {
  return ABOUT_THE_SYMBOL.test(`${title} ${summary ?? ''}`.slice(0, 400));
}

/**
 * Why a candidate replacement is not usable, or null when it is.
 *
 * Applied only to REPLACEMENTS, which is why it can be stricter than
 * `isSymbolImage`. Both rules come from watching a dry run pick something worse
 * than the flag it was fixing:
 *
 *  - Any map. `isSymbolImage` deliberately allows period maps because a map
 *    drawn OF an event is good imagery, but a map arriving as a REPLACEMENT is
 *    always the generic outline of a country ("Pm-map.png" for the
 *    assassination of a Panamanian president).
 *  - A photograph taken long after. A 2024 skyline of Phnom Penh is not the
 *    1979 capture of Phnom Penh, in the same way a 2005 satellite photo is not
 *    the Battle of Buir Lake. Twenty-five years of slack, because a photograph
 *    of a person or object often postdates the event it belongs to.
 */
/**
 * Years a filename admits to.
 *
 * A plain boundary match is not enough. Commons names carry dates welded into
 * longer digit runs — "Zeppelin-ride-020100925-195" is 25 September 2010, and
 * "Palace_of_Nations_Geneva_20102014_02" is 20 October 2014. Both slipped a
 * 2010s photograph onto an event from the 1920s while the guard looked only at
 * standalone four-digit years, so YYYYMMDD and DDMMYYYY runs are read too.
 */
/**
 * Catalogue identifiers, stripped before any date is read out of a filename.
 *
 * A Library of Congress number is a long digit run and the sliding window
 * below happily finds a "year" inside it: "KENDRICK,_JOHN_B._LCCN2016857358"
 * is a 1910s portrait that reads as 2016, and "Giacomo_Puccini_LCCN2005685154"
 * as 2005. Both were counted as anachronisms until this existed.
 *
 * NOT anchored with `\b`: an underscore is a word character, so `\bLCCN` never
 * matches inside "KENDRICK,_JOHN_B._LCCN2016857358" — the same trap that once
 * let "Dec_2024" put a 2024 skyline on a 1979 event.
 */
const CATALOGUE_ID =
  /(?<![a-z])(?:lccn|ppmsca|cph|det|hec|npcc|fsa|ggbain|matpc|nara|dpla|rcin|inv|acc)[\s._-]*\d+/gi;

function filenameYears(file: string): number[] {
  const years: number[] = [];
  for (const [digits] of file.replace(CATALOGUE_ID, ' ').matchAll(/\d{4,10}/g)) {
    if (digits.length === 4) {
      years.push(Number(digits));
      continue;
    }
    // Slide a four-digit window: any plausible year inside the run counts,
    // because one of them is almost always the date.
    for (let i = 0; i + 4 <= digits.length; i++) {
      const candidate = Number(digits.slice(i, i + 4));
      if (candidate >= 1500 && candidate <= 2099) {
        years.push(candidate);
      }
    }
  }
  return years.filter((y) => y >= 1500 && y <= 2099);
}

/**
 * Candidate articles that are a subject INDEX rather than a subject.
 *
 * "History of Nigeria" is not the 1970 event; it is everything that ever
 * happened in Nigeria, and its lead image was a photograph of a modern
 * government building. These prefixes are reliable: an article named this way
 * never has a picture of one specific day.
 */
const HUB_TITLE =
  /^(history|timeline|list|outline|index|culture|economy|geography|politics|demographics|military history|foreign relations)\s+of\b/i;

/**
 * Calendar pages — "January 1970", "1999", "1970s".
 *
 * Wikipedia keeps an article for every month and year, holding whatever
 * happened in it, and the search lands on one whenever an event's own subject
 * has no article of its own. Its pictures are then a lucky dip across the
 * whole period: the Tonghai earthquake of January 1970 was offered a
 * photograph of Pat Nixon christening a Boeing 747, and a 2007 British
 * windstorm got the Columbine security-camera still from the page titled
 * "1999".
 */
const CALENDAR_TITLE =
  /^((january|february|march|april|may|june|july|august|september|october|november|december)\s+)?\d{3,4}(s|\s*(bc|ad|bce|ce))?$/i;

export function isHubArticle(articleTitle: string): boolean {
  const title = articleTitle.trim();
  return HUB_TITLE.test(title) || CALENDAR_TITLE.test(title);
}

/**
 * A backdrop dated long after a modern event — a picture of the subject TODAY
 * standing in for a record of what happened.
 *
 * This class was never checked in the shipped data, because `replacementFault`
 * only ever ran on candidates and the original archival pass took each
 * article's lead image with no era gate at all. It put Clayton Kershaw in 2015
 * over Cy Young's 1904 perfect game, the 2024 Bayern Munich logo over the
 * club's founding in 1900, and a 2020 census map over Jesse Owens in Berlin.
 *
 * Only from 1900. Before photography is commonplace the gap means the opposite
 * thing: a 2019 photograph of a Roman bust of Decius IS the surviving record
 * of a man who died in 251, and rejecting it would throw away the best
 * material the archive has for antiquity.
 */
const PHOTOGRAPHIC_ERA = 1900;
const MODERN_GAP_MAX = 25;

export function isAnachronistic(imageUrl: string, eventYear: number): boolean {
  if (eventYear < PHOTOGRAPHIC_ERA) {
    return false;
  }
  const file = safeDecode(imageUrl.split('/').pop() ?? '');

  /*
   * A standalone token, NOT the sliding window `filenameYears` uses.
   *
   * The window is right for `replacementFault`, where refusing a good
   * candidate costs nothing. It is wrong for deciding what to go and re-crawl:
   * NASA's own photo id "AS17-134-20378" contains "2037", so Gene Cernan
   * standing at the lunar module in 1972 was filed as a picture from the
   * future and queued for replacement. Sixty-four events were listed this way.
   */
  const years = [...file.replace(CATALOGUE_ID, ' ').matchAll(/(?<![0-9])(1[4-9][0-9]{2}|20[0-2][0-9])(?![0-9])/g)]
    .map((match) => Number(match[1]))
    .filter((year) => year <= new Date().getFullYear());
  if (years.length === 0) {
    return false;
  }
  // The closest plausible year is the kindest reading of the filename.
  const nearest = years.reduce((a, b) => (Math.abs(b - eventYear) < Math.abs(a - eventYear) ? b : a));
  return nearest - eventYear > MODERN_GAP_MAX;
}

export function replacementFault(
  imageUrl: string,
  eventYear: number,
  /** Year Commons dates the work to, when it states one. */
  dateYear?: number,
): string | null {
  const file = safeDecode(imageUrl.split('/').pop() ?? '');
  if (isSymbolImage(imageUrl)) {
    return 'another symbol';
  }
  // Vector art, but only as a REPLACEMENT. `isSymbolImage` deliberately allows
  // SVGs because historical maps and machine schematics are vectors too — as a
  // candidate, though, an SVG is a logo, a seal, a route map or a chemical
  // structure essentially every time. Round two proved it: the Space Shuttle
  // programme got its mission patch, sildenafil its molecular diagram, the
  // Communist Party its hammer and sickle, and Boko Haram an Islamic State flag.
  if (/\.svg\.png$/i.test(file)) {
    return 'vector art — a logo, seal, diagram or route map';
  }
  if (/logo|patch|insignia|badge|_structure|schematic|diagram/i.test(file)) {
    return 'a logo or diagram';
  }
  // A scanned page, not a picture. Commons holds whole periodicals and
  // document sets as page images, and searching it by year lands on them
  // constantly: a student newspaper from 1983 was offered for the Hitler
  // Diaries, a League of Nations treaty volume for the synthesis of LSD, and
  // a 1976 Atlanta Falcons media guide for the founding of Apple.
  if (/^(lossy-)?page\d+-|\.pdf\.jpg$|\.tiff?\.jpg$|_complete\.pdf/i.test(file)) {
    return 'a scanned page from a document';
  }
  // Never a synthetic picture in a history archive. The pass proposed
  // "AI-Generated_Image_depicting_Donald_Trump_as_Jesus_Christ.jpg" as the
  // backdrop for a Trump event; an invented image presented as the record of
  // what happened is the one thing this app cannot ship.
  if (/\bai[-_ ]generated|\bai[-_ ]?art|midjourney|stable[-_ ]diffusion|dall[-_ ]?e/i.test(file)) {
    return 'a synthetic image';
  }
  // Charts and animated maps are analysis, not the event.
  if (/_graph\b|composite_graph|\bchart\b|animated\.gif$|\.svg$/i.test(file)) {
    return 'a chart or animation';
  }
  if (/\bmap\b|[_-]map|map[_-]/i.test(file)) {
    return 'a map';
  }
  // NOT \b: an underscore is a word character, so "\b2024" never matches
  // "Dec_2024.jpg" — which is precisely how a 2024 skyline of Phnom Penh got
  // through as the picture for its capture in 1979.
  const years = filenameYears(file);
  const latest = years.length > 0 ? Math.max(...years) : null;
  if (latest !== null && eventYear > 0 && latest > eventYear + 25) {
    return `dated ${latest}, ${latest - eventYear} years after the event`;
  }
  // Commons' own date, which catches what the filename hides:
  // "Adolf_Hitler_in_Memel.png" names no year and is 1939, and it was offered
  // for a 1923 event. Symmetrical, because a picture from long BEFORE is just
  // as wrong — an 1820s engraving illustrated a 1981 investigation.
  if (dateYear !== undefined && eventYear > 0 && Math.abs(dateYear - eventYear) > 25) {
    const gap = Math.abs(dateYear - eventYear);
    return `the work is dated ${dateYear}, ${gap} years ${dateYear > eventYear ? 'after' : 'before'} the event`;
  }
  return null;
}

/**
 * Words too common to prove anything about a match.
 */
const STOPWORDS = new Set([
  'the', 'and', 'for', 'from', 'with', 'into', 'that', 'this', 'their', 'they',
  'were', 'was', 'has', 'had', 'his', 'her', 'its', 'are', 'been', 'first',
  'war', 'battle', 'city', 'state', 'states', 'national', 'party', 'day',
  'history', 'list', 'timeline', 'republic', 'united', 'new', 'south', 'north',
  'east', 'west', 'general', 'president', 'government', 'international',
]);

function significantTokens(text: string): string[] {
  return [
    ...new Set(
      text
        .toLowerCase()
        .normalize('NFD')
        .replace(/[̀-ͯ]/g, '')
        .split(/[^a-z0-9]+/)
        .filter((w) => w.length >= 4 && !STOPWORDS.has(w)),
    ),
  ];
}

/**
 * Is `articleTitle` plausibly about this event?
 *
 * EVERY significant word of the article's title must appear in the event's own
 * words. Strict on purpose, and the strictness was earned: a loose match sent
 * the World Trade Organization's founding to a photograph of the 1993 World
 * Trade Center bombing (they share "world" and "trade"), a British police
 * investigation to a portrait of a Colombian serial killer, and Boko Haram to a
 * decade collage. A wrong picture is worse than a flag — the flag is merely
 * uninformative, while a picture of the wrong atrocity is a lie the reader has
 * no way to catch.
 *
 * The cost of being strict is that some events keep their flag, which is
 * exactly where they started. That is the right way to be wrong.
 */
export function articleMatchesEvent(
  articleTitle: string,
  eventTitle: string,
  summary?: string,
  eventYear?: number,
): boolean {
  // A year in the article title is checked against the event's year, never
  // against its words — and this was the single most expensive mistake in the
  // whole pass. Requiring "2014" to appear in the sentence rejected "2014 Kabul
  // Serena Hotel shooting" as the source for an event about a shooting at the
  // Kabul Serena Hotel, and did the same to hundreds of dated article titles,
  // which is exactly how Wikipedia names the articles we most want.
  const titleYears = [...articleTitle.matchAll(/(?<![0-9])(1[0-9]{3}|20[0-9]{2})(?![0-9])/g)].map(
    (m) => Number(m[1]),
  );
  if (eventYear !== undefined && eventYear > 0 && titleYears.length > 0) {
    // A dated title that names a DIFFERENT year is a different episode: "2025
    // Nobel Peace Prize" is not a 2012 event, "War in Afghanistan (2001–2021)"
    // is not 1998. One year of slack for events that straddle a New Year.
    if (!titleYears.some((y) => Math.abs(y - eventYear) <= 1)) {
      return false;
    }
  }

  const wanted = significantTokens(articleTitle).filter((t) => !/^(1[0-9]{3}|20[0-9]{2})$/.test(t));
  if (wanted.length === 0) {
    return false;
  }
  const haystack = significantTokens(`${eventTitle} ${summary ?? ''}`);
  const have = new Set(haystack);
  return wanted.every((token) => have.has(token));
}

/**
 * A candidate that is just the PLACE the event happened in.
 *
 * A city article passes `articleMatchesEvent` easily — the city is named in the
 * event — and then supplies a tourist photograph of the modern skyline. "Phnom
 * Penh" for the 1979 capture of Phnom Penh, "Klaipėda" for the 1923 revolt.
 * The place is not the event, exactly as the flag was not the event.
 */
/**
 * Is the event's own article about a PLACE or a POLITY?
 *
 * `region` is not a region: the lite pipeline fills it with the Wikidata
 * description of the linked article, so "Country in West Asia" or "British
 * colony in East Asia" is a statement about what the ARTICLE is. That makes it
 * the cheapest reliable way to tell a country page from an event page.
 *
 * It matters because the two behave completely differently when you go looking
 * past the lead image. An article about an organisation or a war has pictures
 * OF that subject — the Saur Revolution photograph sits on the page about the
 * party that carried it out. A country article has a gallery of everything:
 * asking the United Kingdom page for a second picture returned a portrait of
 * James VI and I for a 1981 police investigation, and British Hong Kong
 * returned a photograph of the actor Andy Lau.
 */
const PLACE_DESCRIPTION =
  /\b(countr(y|ies)|nation|city|capital|town|village|island|archipelago|province|prefecture|county|district|region|territory|colony|protectorate|dependency|state|republic|kingdom|empire|emirate|sultanate|principality|federation|municipality|peninsula|lake|river|mountain)\b/i;

export function articleIsAPlace(region: string): boolean {
  return PLACE_DESCRIPTION.test(region);
}

export function isPlaceHub(articleTitle: string, region: string): boolean {
  const title = articleTitle.toLowerCase().trim();
  const place = region.toLowerCase();
  return title.length > 0 && (place.includes(title) || title.includes(place));
}

export interface ImageOverride {
  /** Event id in `pipeline/events-db.json`. */
  eventId: string;
  /** Article to take the backdrop from instead. */
  wikiTitle: string;
  /** Why the article's own image is unusable. */
  reason: string;
}

export const IMAGE_OVERRIDES: ImageOverride[] = [
  {
    eventId: 'evt-05-18-1388-battle-of-buir-lake',
    wikiTitle: 'Hongwu Emperor',
    reason:
      "The battle's own article leads with a 2005 LandSat satellite photograph of the lake — the right place, 617 years too late, seen from orbit. The campaign was the Hongwu Emperor's, and his article leads with a contemporary Ming portrait: real 14th-century material about a person in the event. Lan Yu, named in the headline, was considered first and rejected — his article's image is a modern statue, which is the same anachronism in a different medium.",
  },

  /*
   * ---------------------------------------------------------------------
   * The NASA seal, eighteen times over.
   *
   * Every one of these events names a specific mission, and every mission has
   * its own article with a picture of the actual spacecraft — but the feed
   * linked them all to "NASA", whose article leads with the agency seal. The
   * automated pass cannot reach them: `topicArticles` correctly forbids it
   * from taking pictures off a page 19 events share, and a title search for
   * "NASA launches the MAVEN probe to Mars" does not reliably surface the
   * MAVEN article. Naming the article by hand is the only route, and every
   * title below was resolved against Wikimedia before being written down.
   *
   * Three of the eighteen are deliberately absent: Mariner 10 and the Space
   * Station Processing Facility have no usable free image, and MAVEN's
   * article leads with the mission LOGO, which is the same failure as the
   * seal it would replace.
   * ---------------------------------------------------------------------
   */
  {
    eventId: 'evt-09-17-1962-nasa',
    wikiTitle: 'NASA Astronaut Group 2',
    reason: 'The event is the selection of the Next Nine; their group photograph exists.',
  },
  {
    eventId: 'evt-02-18-1977-nasa',
    wikiTitle: 'Space Shuttle Enterprise',
    reason: "The event IS Enterprise's first free flight, which is the article's lead image.",
  },
  { eventId: 'evt-11-22-1989-nasa', wikiTitle: 'STS-33', reason: 'The mission the event launches.' },
  {
    eventId: 'evt-02-14-1990-nasa',
    wikiTitle: 'Pale Blue Dot',
    reason: 'The headline says "detail pictured" and means this photograph specifically.',
  },
  { eventId: 'evt-09-25-1992-nasa', wikiTitle: 'Mars Observer', reason: 'The probe itself.' },
  { eventId: 'evt-02-17-1996-nasa', wikiTitle: 'NEAR Shoemaker', reason: 'The spacecraft itself.' },
  {
    eventId: 'evt-11-07-1996-nasa',
    wikiTitle: 'Mars Global Surveyor',
    reason: 'The spacecraft the event launches.',
  },
  { eventId: 'evt-12-03-1999-nasa', wikiTitle: 'Mars Polar Lander', reason: 'The lander itself.' },
  { eventId: 'evt-12-18-1999-nasa', wikiTitle: 'Terra (satellite)', reason: 'The platform itself.' },
  {
    eventId: 'evt-04-07-2001-nasa',
    wikiTitle: '2001 Mars Odyssey',
    reason: 'The headline says "artist\'s conception pictured" and means this one.',
  },
  {
    eventId: 'evt-03-10-2006-nasa',
    wikiTitle: 'Mars Reconnaissance Orbiter',
    reason: 'The headline says "artist\'s impression pictured" and means this one.',
  },
  { eventId: 'evt-08-04-2007-nasa', wikiTitle: 'Phoenix (spacecraft)', reason: 'The lander itself.' },
  {
    eventId: 'evt-07-21-2011-nasa',
    wikiTitle: 'STS-135',
    reason: "The event is the programme's final landing, which is STS-135.",
  },
  { eventId: 'evt-12-31-2011-nasa', wikiTitle: 'GRAIL', reason: 'The mission the event describes.' },
  {
    eventId: 'evt-09-12-2013-nasa',
    wikiTitle: 'Voyager 1',
    reason: 'The probe that crossed into interstellar space.',
  },

  /*
   * The eight Acts of Congress under one coat of arms are NOT here, and the
   * reason is worth recording so nobody spends the afternoon again: every one
   * of "Missouri Compromise", "Fugitive Slave Act of 1850", "Mann Act" and the
   * rest leads with the Great Seal of the United States. Re-pointing the
   * article swaps one national symbol for another. Fixing that group needs a
   * specific image chosen from inside each article, not a better title.
   */
  {
    eventId: 'evt-07-20-1867-united-states-congress',
    wikiTitle: 'Indian Peace Commission',
    reason: 'The only one of the eight Acts whose article leads with a photograph of the thing.',
  },

  /*
   * Soviet spacecraft, photographed in museums decades later.
   *
   * `isAnachronistic` flags all three and is right to, as a rule: after 1900 a
   * picture taken long afterwards is usually a substitute for a record that
   * exists. These are the exception the rule cannot see — the object in the
   * photograph is the actual craft, so the picture is of the subject and not
   * of something standing in for it. That is a judgement, which is what this
   * file is for; the flag of the Soviet Union tells a reader nothing at all.
   */
  {
    eventId: 'evt-02-03-1966-soviet-union',
    wikiTitle: 'Luna 9',
    reason: 'The probe itself, at Le Bourget. Was the Soviet flag.',
  },
  {
    eventId: 'evt-10-18-1967-soviet-union',
    wikiTitle: 'Venera 4',
    reason: 'The probe itself. Was the Soviet flag.',
  },
  {
    eventId: 'evt-02-21-1972-soviet-union',
    wikiTitle: 'Luna 20',
    reason: "The craft's descent stage. Was the Soviet flag.",
  },
  {
    eventId: 'evt-02-16-1986-soviet-union',
    wikiTitle: 'MS Mikhail Lermontov',
    reason: 'The liner that ran aground, photographed at Tilbury while in service.',
  },
];
