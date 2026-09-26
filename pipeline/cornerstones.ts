/**
 * Dates the app is not allowed to miss.
 *
 * The Wikimedia feed is excellent but it is not a guarantee. Its curated list
 * for 7 December contains a furry convention and an Australian cricketer and
 * **no Pearl Harbor** — the attack is not among the day's 51 candidates at all.
 * A "today in history" app that opens on 7 December without Pearl Harbor has
 * failed at the one thing its name promises, and no amount of depth elsewhere
 * makes up for it.
 *
 * So these are forced in. Each entry names a date and the English Wikipedia
 * article for the event; the builder resolves imagery and prose through exactly
 * the same path as a feed candidate, and injects it at the front of the day's
 * ranking so it can never be crowded out.
 *
 * Rules for adding one:
 *  - It has to be an event a reasonable person would name if you said the date.
 *    "Notable" is not the bar; "the date is known FOR this" is the bar.
 *  - `wikiTitle` must be the article about THE EVENT, not a hub. "Normandy
 *    landings", never "World War II" — a hub article yields a generic summary
 *    about a whole war and a picture of something else.
 *  - Run `npm run pipeline:cornerstones` after editing. It checks every title
 *    resolves to an article with a FREE image, and names the ones that do not.
 *  - `headline` is optional. Left out, the card takes the article's own opening
 *    sentence, which for a well-titled event article is exactly right.
 */

import { CORNERSTONE_HEADLINES, headlineKey } from './cornerstone-headlines';
import { fetchArticleExtracts } from './imagery';
import { EventCandidate } from './onthisday';

export interface Cornerstone {
  /** "MM-DD". */
  dateKey: string;
  year: number;
  /** English Wikipedia article about the event itself. */
  wikiTitle: string;
  /** Overrides the article's opening sentence as the card headline. */
  headline?: string;
}

export const CORNERSTONES: Cornerstone[] = [
  // — Antiquity and the medieval world —
  { dateKey: '08-02', year: -216, wikiTitle: 'Battle of Cannae' },
  { dateKey: '09-02', year: -31, wikiTitle: 'Battle of Actium' },
  { dateKey: '03-15', year: -44, wikiTitle: 'Assassination of Julius Caesar' },
  { dateKey: '09-09', year: 9, wikiTitle: 'Battle of the Teutoburg Forest' },
  { dateKey: '07-16', year: 1054, wikiTitle: 'East–West Schism' },
  { dateKey: '11-27', year: 1095, wikiTitle: 'Council of Clermont' },
  { dateKey: '04-13', year: 1204, wikiTitle: 'Sack of Constantinople' },
  { dateKey: '08-24', year: 79, wikiTitle: 'Eruption of Mount Vesuvius in 79 AD' },
  { dateKey: '10-14', year: 1066, wikiTitle: 'Battle of Hastings' },
  { dateKey: '06-15', year: 1215, wikiTitle: 'Magna Carta' },
  { dateKey: '05-29', year: 1453, wikiTitle: 'Fall of Constantinople' },

  // — Early modern —
  { dateKey: '10-12', year: 1492, wikiTitle: 'Voyages of Christopher Columbus' },
  { dateKey: '08-29', year: 1526, wikiTitle: 'Battle of Mohács' },
  { dateKey: '10-07', year: 1571, wikiTitle: 'Battle of Lepanto' },
  { dateKey: '08-08', year: 1588, wikiTitle: 'Spanish Armada' },
  { dateKey: '11-05', year: 1605, wikiTitle: 'Gunpowder Plot' },
  { dateKey: '09-12', year: 1683, wikiTitle: 'Battle of Vienna' },
  { dateKey: '03-05', year: 1770, wikiTitle: 'Boston Massacre' },
  { dateKey: '10-19', year: 1781, wikiTitle: 'Siege of Yorktown' },
  { dateKey: '10-31', year: 1517, wikiTitle: 'Ninety-five Theses' },
  { dateKey: '12-16', year: 1773, wikiTitle: 'Boston Tea Party' },
  { dateKey: '07-04', year: 1776, wikiTitle: 'United States Declaration of Independence' },
  { dateKey: '09-17', year: 1787, wikiTitle: 'Constitution of the United States' },
  { dateKey: '07-14', year: 1789, wikiTitle: 'Storming of the Bastille' },

  // — The nineteenth century —
  { dateKey: '12-02', year: 1805, wikiTitle: 'Battle of Austerlitz' },
  { dateKey: '10-21', year: 1805, wikiTitle: 'Battle of Trafalgar' },
  { dateKey: '06-18', year: 1815, wikiTitle: 'Battle of Waterloo' },
  { dateKey: '08-01', year: 1834, wikiTitle: 'Slavery Abolition Act 1833' },
  { dateKey: '11-24', year: 1859, wikiTitle: 'On the Origin of Species' },
  { dateKey: '01-01', year: 1863, wikiTitle: 'Emancipation Proclamation' },
  { dateKey: '06-19', year: 1865, wikiTitle: 'Juneteenth' },
  { dateKey: '05-10', year: 1869, wikiTitle: 'First transcontinental railroad' },
  { dateKey: '03-10', year: 1876, wikiTitle: 'Alexander Graham Bell' },
  // The Balkans, where this app's first readers live and where these three
  // dates are national holidays rather than trivia.
  { dateKey: '03-03', year: 1878, wikiTitle: 'Treaty of San Stefano' },
  { dateKey: '07-13', year: 1878, wikiTitle: 'Treaty of Berlin (1878)' },
  { dateKey: '09-06', year: 1885, wikiTitle: 'Unification of Bulgaria' },
  { dateKey: '11-19', year: 1863, wikiTitle: 'Gettysburg Address' },
  { dateKey: '04-09', year: 1865, wikiTitle: 'Battle of Appomattox Court House' },
  { dateKey: '04-14', year: 1865, wikiTitle: 'Assassination of Abraham Lincoln' },
  { dateKey: '11-08', year: 1895, wikiTitle: 'Wilhelm Röntgen' },
  { dateKey: '12-29', year: 1890, wikiTitle: 'Wounded Knee Massacre' },

  // — The world wars —
  { dateKey: '12-17', year: 1903, wikiTitle: 'Wright Flyer' },
  { dateKey: '10-01', year: 1908, wikiTitle: 'Ford Model T' },
  { dateKey: '09-22', year: 1908, wikiTitle: 'Independence of Bulgaria' },
  {
    dateKey: '12-14',
    year: 1911,
    // The expedition's article carries no free image; the man's does.
    wikiTitle: 'Roald Amundsen',
    headline: 'Roald Amundsen’s party became the first people to reach the South Pole',
  },
  { dateKey: '06-28', year: 1919, wikiTitle: 'Treaty of Versailles' },
  { dateKey: '08-26', year: 1920, wikiTitle: 'Nineteenth Amendment to the United States Constitution' },
  { dateKey: '05-21', year: 1927, wikiTitle: 'Charles Lindbergh' },
  { dateKey: '09-28', year: 1928, wikiTitle: 'Alexander Fleming' },
  { dateKey: '03-12', year: 1930, wikiTitle: 'Salt March' },
  { dateKey: '02-27', year: 1933, wikiTitle: 'Reichstag fire' },
  { dateKey: '10-16', year: 1934, wikiTitle: 'Long March' },
  { dateKey: '05-06', year: 1937, wikiTitle: 'Hindenburg disaster' },
  { dateKey: '09-30', year: 1938, wikiTitle: 'Munich Agreement' },
  { dateKey: '11-09', year: 1938, wikiTitle: 'Kristallnacht' },
  { dateKey: '06-22', year: 1941, wikiTitle: 'Operation Barbarossa' },
  { dateKey: '09-08', year: 1941, wikiTitle: 'Siege of Leningrad' },
  { dateKey: '06-04', year: 1942, wikiTitle: 'Battle of Midway' },
  { dateKey: '12-02', year: 1942, wikiTitle: 'Chicago Pile-1' },
  { dateKey: '02-02', year: 1943, wikiTitle: 'Battle of Stalingrad' },
  { dateKey: '04-15', year: 1912, wikiTitle: 'Sinking of the Titanic' },
  { dateKey: '06-28', year: 1914, wikiTitle: 'Assassination of Archduke Franz Ferdinand' },
  { dateKey: '11-07', year: 1917, wikiTitle: 'October Revolution' },
  { dateKey: '11-11', year: 1918, wikiTitle: 'Armistice of 11 November 1918' },
  { dateKey: '10-29', year: 1929, wikiTitle: 'Wall Street Crash of 1929' },
  { dateKey: '08-23', year: 1939, wikiTitle: 'Molotov–Ribbentrop Pact' },
  { dateKey: '09-01', year: 1939, wikiTitle: 'Invasion of Poland' },
  { dateKey: '12-07', year: 1941, wikiTitle: 'Attack on Pearl Harbor' },
  { dateKey: '01-27', year: 1945, wikiTitle: 'Auschwitz concentration camp' },
  { dateKey: '06-06', year: 1944, wikiTitle: 'Normandy landings' },
  { dateKey: '04-30', year: 1945, wikiTitle: 'Death of Adolf Hitler' },
  { dateKey: '05-08', year: 1945, wikiTitle: 'Victory in Europe Day' },
  { dateKey: '07-16', year: 1945, wikiTitle: 'Trinity (nuclear test)' },
  { dateKey: '08-06', year: 1945, wikiTitle: 'Atomic bombings of Hiroshima and Nagasaki' },
  { dateKey: '09-02', year: 1945, wikiTitle: 'Surrender of Japan' },

  // — The post-war order —
  { dateKey: '10-24', year: 1945, wikiTitle: 'United Nations' },
  { dateKey: '08-15', year: 1947, wikiTitle: 'Partition of India' },
  {
    dateKey: '07-05',
    year: 1948,
    wikiTitle: 'Aneurin Bevan',
    headline:
      'Britain’s National Health Service opened, free at the point of use, under Aneurin Bevan',
  },
  { dateKey: '04-04', year: 1949, wikiTitle: 'NATO' },
  { dateKey: '04-12', year: 1955, wikiTitle: 'Polio vaccine' },
  { dateKey: '04-18', year: 1955, wikiTitle: 'Bandung Conference' },
  { dateKey: '10-29', year: 1956, wikiTitle: 'Suez Crisis' },
  { dateKey: '03-25', year: 1957, wikiTitle: 'Treaty of Rome' },
  // Deliberately absent: Tsar Bomba (30 October 1961). Its own article has no
  // free image, and every alternative shows something else — an American test,
  // an empty island. A backdrop must depict its own event.
  { dateKey: '06-16', year: 1963, wikiTitle: 'Vostok 6' },
  { dateKey: '10-06', year: 1973, wikiTitle: 'Yom Kippur War' },
  { dateKey: '04-25', year: 1974, wikiTitle: 'Carnation Revolution' },
  { dateKey: '07-17', year: 1975, wikiTitle: 'Apollo–Soyuz' },
  { dateKey: '06-16', year: 1976, wikiTitle: 'Soweto uprising' },
  { dateKey: '09-05', year: 1977, wikiTitle: 'Voyager 1' },
  {
    dateKey: '07-25',
    year: 1978,
    wikiTitle: 'In vitro fertilisation',
    headline: 'Louise Brown, the first person conceived by IVF, was born in Oldham, England',
  },
  { dateKey: '09-17', year: 1978, wikiTitle: 'Camp David Accords' },
  {
    dateKey: '02-11',
    year: 1979,
    wikiTitle: 'Ruhollah Khomeini',
    headline: 'The Iranian Revolution toppled the monarchy and brought Khomeini to power',
  },
  { dateKey: '05-08', year: 1980, wikiTitle: 'Smallpox' },
  {
    dateKey: '08-31',
    year: 1980,
    wikiTitle: 'Lech Wałęsa',
    headline:
      'The Gdańsk Agreement was signed, and Solidarity became the Eastern Bloc’s first free trade union',
  },
  { dateKey: '06-12', year: 1987, wikiTitle: 'Tear down this wall!' },
  { dateKey: '01-30', year: 1948, wikiTitle: 'Assassination of Mahatma Gandhi' },
  { dateKey: '05-14', year: 1948, wikiTitle: 'Israeli Declaration of Independence' },
  { dateKey: '12-10', year: 1948, wikiTitle: 'Universal Declaration of Human Rights' },
  { dateKey: '10-01', year: 1949, wikiTitle: 'Proclamation of the People’s Republic of China' },
  { dateKey: '06-25', year: 1950, wikiTitle: 'Korean War' },
  { dateKey: '05-29', year: 1953, wikiTitle: '1953 British Mount Everest expedition' },
  { dateKey: '12-01', year: 1955, wikiTitle: 'Rosa Parks' },
  { dateKey: '10-04', year: 1957, wikiTitle: 'Sputnik 1' },
  { dateKey: '01-01', year: 1959, wikiTitle: 'Cuban Revolution' },
  { dateKey: '04-12', year: 1961, wikiTitle: 'Vostok 1' },
  { dateKey: '08-13', year: 1961, wikiTitle: 'Berlin Wall' },
  { dateKey: '10-16', year: 1962, wikiTitle: 'Cuban Missile Crisis' },
  { dateKey: '08-28', year: 1963, wikiTitle: 'I Have a Dream' },
  { dateKey: '11-22', year: 1963, wikiTitle: 'Assassination of John F. Kennedy' },
  { dateKey: '06-05', year: 1967, wikiTitle: 'Six-Day War' },
  {
    dateKey: '04-04',
    year: 1968,
    // The assassination's own article has no freely licensed lead image, so the
    // card is anchored on King himself — a real photograph of the man the day
    // is about, not a stand-in. The headline keeps the event explicit.
    wikiTitle: 'Martin Luther King Jr.',
    headline:
      'Martin Luther King Jr. was assassinated on the balcony of the Lorraine Motel in Memphis',
  },
  { dateKey: '07-20', year: 1969, wikiTitle: 'Apollo 11' },
  { dateKey: '04-11', year: 1970, wikiTitle: 'Apollo 13' },
  { dateKey: '04-30', year: 1975, wikiTitle: 'Fall of Saigon' },
  { dateKey: '11-04', year: 1979, wikiTitle: 'Iran hostage crisis' },

  // — The world we live in —
  { dateKey: '01-28', year: 1986, wikiTitle: 'Space Shuttle Challenger disaster' },
  { dateKey: '04-26', year: 1986, wikiTitle: 'Chernobyl disaster' },
  { dateKey: '06-04', year: 1989, wikiTitle: '1989 Tiananmen Square protests and massacre' },
  { dateKey: '11-09', year: 1989, wikiTitle: 'Fall of the Berlin Wall' },
  { dateKey: '11-17', year: 1989, wikiTitle: 'Velvet Revolution' },
  { dateKey: '02-11', year: 1990, wikiTitle: 'Nelson Mandela' },
  { dateKey: '04-24', year: 1990, wikiTitle: 'Hubble Space Telescope' },
  { dateKey: '08-02', year: 1990, wikiTitle: 'Invasion of Kuwait' },
  { dateKey: '08-06', year: 1991, wikiTitle: 'World Wide Web' },
  { dateKey: '04-27', year: 1994, wikiTitle: '1994 South African general election' },
  { dateKey: '07-11', year: 1995, wikiTitle: 'Srebrenica massacre' },
  { dateKey: '11-21', year: 1995, wikiTitle: 'Dayton Agreement' },
  {
    dateKey: '07-05',
    year: 1996,
    wikiTitle: 'Ian Wilmut',
    headline: 'Dolly the sheep was born — the first mammal cloned from an adult cell',
  },
  { dateKey: '12-11', year: 1997, wikiTitle: 'Kyoto Protocol' },
  {
    dateKey: '04-10',
    year: 1998,
    wikiTitle: 'The Troubles',
    headline:
      'The Good Friday Agreement was signed, ending three decades of conflict in Northern Ireland',
  },
  { dateKey: '07-17', year: 1998, wikiTitle: 'Rome Statute' },
  { dateKey: '03-20', year: 2003, wikiTitle: '2003 invasion of Iraq' },
  { dateKey: '04-14', year: 2003, wikiTitle: 'Human Genome Project' },
  { dateKey: '12-12', year: 2015, wikiTitle: 'Paris Agreement' },
  {
    dateKey: '05-25',
    year: 2020,
    // The murder's own article has no free image, and one would not be
    // publishable here. The protests it set off are the honest, showable face
    // of the date, and the headline keeps the event itself explicit.
    wikiTitle: 'George Floyd protests',
    headline:
      'George Floyd was murdered by a Minneapolis police officer, setting off worldwide protests',
  },
  { dateKey: '12-26', year: 1991, wikiTitle: 'Dissolution of the Soviet Union' },
  { dateKey: '04-07', year: 1994, wikiTitle: 'Rwandan genocide' },
  // Deliberately absent: the Hong Kong handover (1 July 1997). Neither the
  // handover article nor the transfer-of-sovereignty article has a free lead
  // image, and the alternatives resolve to a coat of arms — which would put a
  // heraldic badge behind a world-changing event and break the rule that a
  // backdrop must depict its own event. Add it the day a free photograph exists.
  { dateKey: '02-01', year: 2003, wikiTitle: 'Space Shuttle Columbia disaster' },
  { dateKey: '09-11', year: 2001, wikiTitle: 'September 11 attacks' },
  { dateKey: '12-26', year: 2004, wikiTitle: '2004 Indian Ocean earthquake and tsunami' },
  { dateKey: '09-15', year: 2008, wikiTitle: 'Bankruptcy of Lehman Brothers' },
  { dateKey: '03-11', year: 2011, wikiTitle: '2011 Tōhoku earthquake and tsunami' },
  { dateKey: '05-02', year: 2011, wikiTitle: 'Killing of Osama bin Laden' },
  { dateKey: '06-23', year: 2016, wikiTitle: '2016 United Kingdom European Union membership referendum' },
  { dateKey: '03-11', year: 2020, wikiTitle: 'COVID-19 pandemic' },
  { dateKey: '01-06', year: 2021, wikiTitle: 'January 6 United States Capitol attack' },
  { dateKey: '02-24', year: 2022, wikiTitle: 'Russian invasion of Ukraine' },
];

/** Cornerstones for one date, in the order they were declared. */
export function cornerstonesFor(dateKey: string): Cornerstone[] {
  return CORNERSTONES.filter((c) => c.dateKey === dateKey);
}

/** The article's opening sentence — the closest thing it has to a headline. */
function firstSentence(extract: string): string {
  const match = /^.{40,240}?[.!?](\s|$)/.exec(extract);
  return (match?.[0] ?? extract.slice(0, 240)).trim();
}

/**
 * Turn a date's cornerstones into candidates the builder treats like any other.
 *
 * Returns nothing for a date with no cornerstones, so the common case costs no
 * request at all. Entries whose article has vanished are skipped rather than
 * throwing — `check-cornerstones.ts` is where a bad title is supposed to be
 * caught, and a build must not die because Wikipedia moved a page overnight.
 */
export async function cornerstoneCandidates(dateKey: string): Promise<EventCandidate[]> {
  const entries = cornerstonesFor(dateKey);
  if (entries.length === 0) {
    return [];
  }

  const extracts = await fetchArticleExtracts(entries.map((c) => c.wikiTitle));

  return entries.flatMap((entry) => {
    const extract = extracts.get(entry.wikiTitle);
    if (!extract) {
      console.warn(`  ! cornerstone "${entry.wikiTitle}" has no extract — skipped`);
      return [];
    }
    return [
      {
        year: entry.year,
        summary:
          entry.headline ?? CORNERSTONE_HEADLINES[headlineKey(entry.dateKey, entry.year)] ?? firstSentence(extract),
        wikiTitle: entry.wikiTitle,
        extract: extract.slice(0, 2000),
        hasImage: true,
        curated: true,
        cornerstone: true,
      },
    ];
  });
}
