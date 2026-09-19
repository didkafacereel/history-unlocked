import { describe, expect, it } from 'vitest';

import {
  articleIsAPlace,
  articleMatchesEvent,
  isAnachronistic,
  isHubArticle,
  isSymbolImage,
  replacementFault,
} from '../pipeline/image-overrides';

const commons = (file: string) =>
  `https://upload.wikimedia.org/wikipedia/commons/thumb/a/a1/${file}/1280px-${file}`;

describe('articleMatchesEvent', () => {
  it('accepts a dated article title whose year matches the event', () => {
    // The single most expensive bug in the image work: requiring every word of
    // the title to appear in the sentence rejected "2014 Kabul Serena Hotel
    // shooting" for an event about a shooting at the Kabul Serena Hotel,
    // because "2014" is not written in the sentence. Wikipedia names exactly
    // the articles we want this way.
    expect(
      articleMatchesEvent(
        '2014 Kabul Serena Hotel shooting',
        'Taliban gunmen attacked the Kabul Serena Hotel in a shooting',
        'Four gunmen opened fire in the Serena hotel restaurant.',
        2014,
      ),
    ).toBe(true);
  });

  it('still requires every NON-year word, with no stemming', () => {
    // Only the year token was relaxed. "shooting" does not match "attacked",
    // and `significantTokens` does no stemming, so the match stays
    // conservative on purpose — a near-miss article is how the World Trade
    // Organization ended up illustrated by the 1993 WTC bombing.
    expect(
      articleMatchesEvent(
        '2014 Kabul Serena Hotel shooting',
        'Taliban gunmen attacked the Kabul Serena Hotel',
        'Gunmen opened fire in the restaurant.',
        2014,
      ),
    ).toBe(false);
  });

  it('rejects a dated title naming a different year', () => {
    expect(
      articleMatchesEvent(
        '2025 Nobel Peace Prize',
        'The Nobel Peace Prize was awarded',
        'The prize was announced in Oslo.',
        2012,
      ),
    ).toBe(false);
  });

  it('allows one year of slack for events that straddle a New Year', () => {
    expect(
      articleMatchesEvent(
        '1979 Iranian Revolution',
        'The Iranian Revolution reached its climax',
        undefined,
        1978,
      ),
    ).toBe(true);
  });

  it('requires the non-year words to be vouched for by the event', () => {
    expect(
      articleMatchesEvent(
        'Colombian serial killer',
        'A British police investigation concluded',
        'Detectives closed the case.',
        1981,
      ),
    ).toBe(false);
  });
});

describe('isSymbolImage', () => {
  it.each([
    'Flag_of_India.svg.png',
    'Coat_of_arms_of_Spain.svg.png',
    'Emblem_of_Iran.svg.png',
    'Japan_location_map.svg.png',
  ])('treats %s as a symbol', (file) => {
    expect(isSymbolImage(commons(file))).toBe(true);
  });

  it('does NOT treat every vector as a symbol', () => {
    // An early rule ended in `\.svg\.png$` and reclassified 1426 events instead
    // of ~700: historical maps, machine schematics and battle diagrams are
    // vectors too. Being a vector says nothing about what it depicts.
    expect(isSymbolImage(commons('Battle_of_Waterloo_map.svg.png'))).toBe(false);
    expect(isSymbolImage(commons('Watt_steam_engine_schematic.svg.png'))).toBe(false);
  });
});

describe('replacementFault', () => {
  it('refuses a synthetic image', () => {
    // The pass once offered an AI-generated picture of a real person as the
    // record of a real event. Nothing else in this file matters more.
    expect(
      replacementFault(commons('AI-Generated_Image_depicting_a_President.jpg'), 2020),
    ).toMatch(/synthetic/);
  });

  it('refuses a photograph dated long after the event', () => {
    expect(replacementFault(commons('Phnom_Penh_Dec_2024.jpg'), 1979)).toMatch(/2024/);
  });

  it('catches a year welded into a longer digit run', () => {
    // Commons does this: "020100925" contains 2010. A \b-anchored pattern
    // misses it, and an underscore is a word character so \b never fires
    // after one either.
    expect(replacementFault(commons('Skyline_020100925_view.jpg'), 1912)).not.toBeNull();
  });

  it('refuses a work Commons dates far from the event, in either direction', () => {
    expect(replacementFault(commons('A_later_photograph.jpg'), 1923, 1975)).toMatch(/1975/);
    // Symmetrical: an 1820s engraving once illustrated a 1981 investigation.
    expect(replacementFault(commons('An_old_engraving.jpg'), 1981, 1820)).toMatch(/1820/);
  });

  it('documents the window: 25 years is the line, and it is generous', () => {
    // Deliberately recorded rather than tightened. A 1939 photograph on a 1923
    // event — the Hitler-in-Memel case that motivated this gate — is 16 years
    // out and PASSES. Period-appropriate imagery needs some slack, but this is
    // wide enough to let a materially wrong photograph through, and narrowing
    // it would re-open the image review across the whole archive.
    expect(replacementFault(commons('A_photo.jpg'), 1923, 1939)).toBeNull();
    expect(replacementFault(commons('A_photo.jpg'), 1923, 1949)).toMatch(/1949/);
  });

  it('refuses vector art, logos, diagrams and maps as replacements', () => {
    expect(replacementFault(commons('Mission_patch.svg.png'), 1995)).not.toBeNull();
    expect(replacementFault(commons('Company_logo.jpg'), 1995)).not.toBeNull();
    expect(replacementFault(commons('Europe_map_1914.jpg'), 1914)).not.toBeNull();
  });

  it.each([
    'page1-1280px-RIT_NandE_Vol15Num3_1983_Aug12_Complete.pdf.jpg',
    'lossy-page1-1280px-News_summary_-_NARA_-_139973.tif.jpg',
    'page1-500px-1976_Atlanta_Falcons_media_guide.pdf.jpg',
  ])('refuses the scanned page %s', (file) => {
    // Commons holds whole periodicals as page images and a year-based search
    // lands on them constantly. A scan of a newspaper is not a picture of what
    // the newspaper reported.
    expect(replacementFault(commons(file), 1983)).toMatch(/scanned page/);
  });

  it('passes a plain period photograph', () => {
    expect(replacementFault(commons('Crowd_in_Wenceslas_Square.jpg'), 1989, 1989)).toBeNull();
  });

  it('survives a filename with a lone percent sign', () => {
    // `decodeURIComponent` throws on this, and it killed a run at event 24
    // of 1633 from inside a .filter().
    expect(() => replacementFault(commons('100%_cotton_mill.jpg'), 1900)).not.toThrow();
  });
});

describe('isAnachronistic', () => {
  // 184 modern events were shipping a picture of their subject taken decades
  // later, because the era gate had only ever run on replacement candidates.
  it.each([
    ['1280px-Clayton_Kershaw_on_July_23,_2015_(2).jpg', 1904],
    ['1280px-FC_Bayern_München_logo_(2024).svg.png', 1900],
    ['1280px-Manhattan_Bridge_January_2023_003.jpg', 1909],
    ['1280px-Black_Americans_2020_County.png', 1936],
  ])('flags %s on a %i event', (file, year) => {
    expect(isAnachronistic(commons(file), year)).toBe(true);
  });

  it('leaves antiquity alone', () => {
    // A 2019 photograph of a Roman bust IS the surviving record of a man who
    // died in 251. Applying the modern rule here would throw away the best
    // material the archive has.
    expect(isAnachronistic(commons('Bust_of_Decius_Glyptothek_2019.jpg'), 250)).toBe(false);
    expect(isAnachronistic(commons('Denarius_of_Tiberius_YORYM_2000.jpg'), 36)).toBe(false);
  });

  it('is not fooled by a Library of Congress number', () => {
    // "LCCN2016857358" is a catalogue id on a 1910s portrait, not a date. The
    // sliding four-digit window read 2016 out of it and called the picture an
    // anachronism; 94 events were mislabelled this way before the fix.
    expect(isAnachronistic(commons('KENDRICK,_JOHN_B._LCCN2016857358_(cropped).jpg'), 1922)).toBe(
      false,
    );
    expect(isAnachronistic(commons('Giacomo_Puccini_LCCN2005685154_(1)_cropped.jpg'), 1904)).toBe(
      false,
    );
  });

  it('accepts a contemporary photograph', () => {
    expect(isAnachronistic(commons('Crowd_in_Wenceslas_Square_1989.jpg'), 1989)).toBe(false);
    expect(isAnachronistic(commons('Apollo_11_launch_1969.jpg'), 1969)).toBe(false);
  });

  it('says nothing when the filename carries no year', () => {
    expect(isAnachronistic(commons('Unknown_soldier_portrait.jpg'), 1920)).toBe(false);
  });

  it('is not fooled by a year carved out of a NASA photo id', () => {
    // "AS17-134-20378" contains "2037". The sliding window in filenameYears
    // found it and filed Gene Cernan at the lunar module, 1972, as a picture
    // from the future — 64 events were queued for replacement this way.
    expect(
      isAnachronistic(commons('Eugene_Cernan_at_the_LM,_Apollo_17,_AS17-134-20378.jpg'), 1972),
    ).toBe(false);
  });

  it('refuses a year that has not happened yet', () => {
    expect(isAnachronistic(commons('Something_2099.jpg'), 1950)).toBe(false);
  });
});

describe('isHubArticle / articleIsAPlace', () => {
  it.each(['History of France', 'List of battles', 'Timeline of the Cold War'])(
    'treats %s as a subject index',
    (t) => expect(isHubArticle(t)).toBe(true),
  );

  it.each(['January 1970', '1999', '1970s', '1453', 'March 1848'])(
    'treats the calendar page %s as a hub',
    (t) => expect(isHubArticle(t)).toBe(true),
  );

  it('does not treat an ordinary article as a hub', () => {
    for (const t of ['Battle of Agincourt', '1956 Georgian demonstrations', 'Apollo 17']) {
      expect(isHubArticle(t)).toBe(false);
    }
  });

  it('reads `region` as the Wikidata description it actually is', () => {
    // `region` is a description, not a place, for ~89% of the archive. Asking
    // a country article for another picture produced a portrait of the actor
    // Andy Lau for British Hong Kong.
    expect(articleIsAPlace('country in Western Europe')).toBe(true);
    expect(articleIsAPlace('Roman emperor from 249 to 251')).toBe(false);
  });
});
