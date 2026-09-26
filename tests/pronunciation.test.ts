import { describe, expect, it } from 'vitest';

import { stripPronunciation } from '../pipeline/lite';

/**
 * Every input below is a lead sentence the archive actually carried, copied
 * from pipeline/events-db.json. The REST extract drops Wikipedia's
 * pronunciation templates but keeps their punctuation and the IPA itself.
 */
describe('stripPronunciation', () => {
  it('removes empty UK/US groups and a bracketed transcription, keeps the dates', () => {
    expect(
      stripPronunciation(
        'Roald Engelbregt Gravning Amundsen (UK: , US: ; Norwegian: [ˈrùːɑɫ ˈɑ̂mʉnsən] ; 16 July 1872 – c. 18 June 1928) was a Norwegian explorer of polar regions.',
      ),
    ).toBe(
      'Roald Engelbregt Gravning Amundsen (16 July 1872 – c. 18 June 1928) was a Norwegian explorer of polar regions.',
    );
  });

  it('keeps the native name and drops "pronounced [..]"', () => {
    expect(
      stripPronunciation(
        'The Reichstag fire (German: Reichstagsbrand, pronounced [ˈʁaɪçstaːksˌbʁant] ) was an arson attack on the Reichstag building.',
      ),
    ).toBe('The Reichstag fire (German: Reichstagsbrand) was an arson attack on the Reichstag building.');
  });

  it('drops a "( ;" opener and keeps "born Alexander Bell"', () => {
    expect(
      stripPronunciation(
        'Alexander Graham Bell ( ; born Alexander Bell; March 3, 1847 – August 2, 1922) was a Scottish-born Canadian-American inventor.',
      ),
    ).toBe(
      'Alexander Graham Bell (born Alexander Bell; March 3, 1847 – August 2, 1922) was a Scottish-born Canadian-American inventor.',
    );
  });

  it('removes a parenthetical that held nothing but a transcription', () => {
    expect(
      stripPronunciation(
        'The Battle of Cannae (; Latin: [ˈkanːae̯]) was a key engagement of the Second Punic War.',
      ),
    ).toBe('The Battle of Cannae was a key engagement of the Second Punic War.');
    expect(
      stripPronunciation('Auschwitz (German: [ˈaʊ̯ʃvɪts]), also known as Oświęcim (Polish: [ɔˈɕfjɛɲ.t͡ɕim]), was a complex.'),
    ).toBe('Auschwitz, also known as Oświęcim, was a complex.');
  });

  it('keeps a native name when the transcription follows it without a label', () => {
    expect(
      stripPronunciation(
        'The Storming of the Bastille (French: Prise de la Bastille [pʁiz də la bastij]), also known as Fall of the Bastille, occurred in Paris.',
      ),
    ).toBe(
      'The Storming of the Bastille (French: Prise de la Bastille), also known as Fall of the Bastille, occurred in Paris.',
    );
  });

  it('handles a transcription that itself contains brackets', () => {
    expect(
      stripPronunciation(
        'The Myanmar Air Force (Burmese: တပ်မတော် (လေ), romanised: Tatmadaw (Lay), pronounced [taʔmədɔ̀ (le)]), is the aerial branch.',
      ),
    ).toBe('The Myanmar Air Force (Burmese: တပ်မတော် (လေ), romanised: Tatmadaw (Lay)), is the aerial branch.');
  });

  it('keeps what follows the transcription inside the same bracket', () => {
    expect(
      stripPronunciation("Kristallnacht (German: [kʁɪsˈtalnaχt] ; lit. 'crystal night') or the Night of Broken Glass"),
    ).toBe("Kristallnacht (lit. 'crystal night') or the Night of Broken Glass");
    expect(stripPronunciation('Aneurin "Nye" Bevan (; Welsh: [aˈnəɨ.rɪn ˈbɛvan]; 15 November 1897 – 6 July 1960)')).toBe(
      'Aneurin "Nye" Bevan (15 November 1897 – 6 July 1960)',
    );
  });

  it('drops an opener Wikipedia never closed', () => {
    expect(
      stripPronunciation(
        'The Intelligenzaktion (German pronunciation: [ɪntɛliˈɡɛnt͡s.akˌt͡sjoːn] was a series of mass murders. The Germans conducted the operations.',
      ),
    ).toBe('The Intelligenzaktion was a series of mass murders. The Germans conducted the operations.');
  });

  it('drops a leading comma but keeps a non-Latin native name', () => {
    expect(stripPronunciation('Sputnik 1 (, Russian: Спутник-1, Satellite 1) was the first artificial Earth satellite.')).toBe(
      'Sputnik 1 (Russian: Спутник-1, Satellite 1) was the first artificial Earth satellite.',
    );
  });

  it('closes up what a template removed entirely', () => {
    expect(stripPronunciation('Sumgait, officially Sumqayit; ; is a city in Azerbaijan.')).toBe(
      'Sumgait, officially Sumqayit, is a city in Azerbaijan.',
    );
    expect(stripPronunciation('Empress Matilda, also known as Empress Maud,, or Athelicia, was Holy Roman Empress.')).toBe(
      'Empress Matilda, also known as Empress Maud, or Athelicia, was Holy Roman Empress.',
    );
    expect(stripPronunciation('The Goiânia accident ), also known locally as the caesium-137 accident, was a contamination.')).toBe(
      'The Goiânia accident, also known locally as the caesium-137 accident, was a contamination.',
    );
    expect(stripPronunciation('The Satake clan  was a Japanese samurai clan.')).toBe('The Satake clan was a Japanese samurai clan.');
  });

  it('leaves ordinary brackets and prose alone', () => {
    for (const text of [
      'Francisco Pizarro founded Ciudad de los Reyes (present-day Lima, Peru), which became the capital.',
      'He wrote that the treaty "was [sic] signed in haste" (see below).',
      'The Tatmadaw (lit. "armed forces"; est. 1945) fought on.',
      'Ratio: 3:1, and the score (2–1) stood.',
      'The three aims were: 1) peace, 2) bread, 3) land.',
    ]) {
      expect(stripPronunciation(text)).toBe(text);
    }
  });

  it('closes up a space the template left before a separator', () => {
    expect(stripPronunciation('Dubbed the Muroto typhoon , the system was first identified on September 13.')).toBe(
      'Dubbed the Muroto typhoon, the system was first identified on September 13.',
    );
    expect(
      stripPronunciation('The flag is officially called the Nisshōki , but is more commonly known in Japan as the Hinomaru .'),
    ).toBe('The flag is officially called the Nisshōki, but is more commonly known in Japan as the Hinomaru.');
    expect(stripPronunciation('the programme cost was estimated at £70 million .\nConstruction of six prototypes began')).toBe(
      'the programme cost was estimated at £70 million.\nConstruction of six prototypes began',
    );
    for (const text of ['Written in .NET and C#.', 'He paused ... then went on.']) {
      expect(stripPronunciation(text)).toBe(text);
    }
  });
});

/**
 * Biography leads the day register actually carried, copied from
 * pipeline/people-db.json. People's articles add the English respelling
 * template ("kam-OO") to the same markup. The last case holds look-alikes that
 * must survive: real strings from both archives, and one built for the
 * acronym-compound list.
 */
describe('stripPronunciation on biographies', () => {
  /** The respell template joins a continuation to its hyphen. */
  const WJ = String.fromCharCode(0x2060);

  it('removes a respelling left behind the gap of its audio link', () => {
    expect(
      stripPronunciation('Albert Camus ( kam-OO; French: [albɛʁ kamy] ; 7 November 1913 – 4 January 1960) was a French philosopher.'),
    ).toBe('Albert Camus (7 November 1913 – 4 January 1960) was a French philosopher.');
    expect(stripPronunciation('Ursula Kroeber Le Guin ( KROH-bər lə GWIN; née Kroeber; October 21, 1929 – January 22, 2018)')).toBe(
      'Ursula Kroeber Le Guin (née Kroeber; October 21, 1929 – January 22, 2018)',
    );
    expect(stripPronunciation('Georges Braque ( BRA(H)K; 13 May 1882 – 31 August 1963) was a French painter.')).toBe(
      'Georges Braque (13 May 1882 – 31 August 1963) was a French painter.',
    );
  });

  it('keeps the words of an item and drops the respelling after them', () => {
    expect(stripPronunciation('Ye ( YAY; born Kanye Omari West KAHN-yay oh-MAH-ree, June 8, 1977) is an American rapper.')).toBe(
      'Ye (born Kanye Omari West, June 8, 1977) is an American rapper.',
    );
    expect(stripPronunciation('Mika ( MEE-kə, stylised in all caps), is a Lebanese singer.')).toBe(
      'Mika (stylised in all caps), is a Lebanese singer.',
    );
  });

  it('removes a labelled list of respellings, labels and all', () => {
    expect(
      stripPronunciation(
        'now generally known in English as Raphael (UK: RAF-ay-əl, US: RAF-ee-əl, RAY-fee-, RAH-fy-EL), was an Italian painter',
      ),
    ).toBe('now generally known in English as Raphael, was an Italian painter');
    expect(
      stripPronunciation(`known by his pseudonym Alberto Moravia (US: moh-RAH-vee-ə, -${WJ}RAY-; Italian: [moˈraːvja]), was an Italian novelist`),
    ).toBe('known by his pseudonym Alberto Moravia, was an Italian novelist');
    expect(stripPronunciation('Luigi Galvani ( gal-VAH-nee, US also gahl-; Italian: [luˈiːdʒi ɡalˈvaːni]; 9 September 1737)')).toBe(
      'Luigi Galvani (9 September 1737)',
    );
  });

  it('removes a label that outlived its respelling', () => {
    expect(stripPronunciation('known after 1911 as Piet Mondrian (, US also ; Dutch: [pit ˈmɔndrijɑn]), was a Dutch painter')).toBe(
      'known after 1911 as Piet Mondrian, was a Dutch painter',
    );
    expect(stripPronunciation('Anne Brontë (, commonly ; 17 January 1820 – 28 May 1849) was an English novelist.')).toBe(
      'Anne Brontë (17 January 1820 – 28 May 1849) was an English novelist.',
    );
    expect(
      stripPronunciation('Lucila Godoy Alcayaga (Latin American Spanish: [luˈsila ɣoˈðoj alkaˈʝaɣa]; 7 April 1889 – 10 January 1957)'),
    ).toBe('Lucila Godoy Alcayaga (7 April 1889 – 10 January 1957)');
  });

  it('removes a one-syllable respelling only where the gap marks it', () => {
    expect(stripPronunciation('under the pen name Dr. Seuss ( sooss, zooss). His work includes')).toBe(
      'under the pen name Dr. Seuss. His work includes',
    );
    expect(stripPronunciation('Sir Thomas Browne ( "brown"; 19 October 1605 – 19 October 1682) was an English polymath.')).toBe(
      'Sir Thomas Browne (19 October 1605 – 19 October 1682) was an English polymath.',
    );
    expect(stripPronunciation('Daniel Defoe ( c. 1660 – 24 April 1731) was an English writer.')).toBe(
      'Daniel Defoe (c. 1660 – 24 April 1731) was an English writer.',
    );
  });

  it('removes transcriptions between slashes and a respelling after brackets', () => {
    expect(stripPronunciation('Jiddu Krishnamurti (pronounced /ˈdʒɪduː ˌkrɪʃnəˈmʊərti/ ; 11 May 1895 – 17 February 1986) was')).toBe(
      'Jiddu Krishnamurti (11 May 1895 – 17 February 1986) was',
    );
    expect(stripPronunciation('Nkrumah (born Francis Nwia Kofi Ngonloma, /(ə)nˈkruːmə/ (ə)n-KROO-mə; 21 September 1909)')).toBe(
      'Nkrumah (born Francis Nwia Kofi Ngonloma; 21 September 1909)',
    );
    expect(stripPronunciation('Nguyễn Phú Trọng (Vietnamese: [ŋwiən˦ˀ˥ fu˧˦ t͡ɕawŋ͡m˧˨ʔ] new-yen foo chong; 14 April 1944)')).toBe(
      'Nguyễn Phú Trọng (14 April 1944)',
    );
  });

  it('keeps a semicolon between the groups of a bracket', () => {
    expect(
      stripPronunciation(
        'Rosa Luxemburg ( LUK-səm-burg; Polish: Róża Luksemburg [ˈruʐa ˈluksɛmburk] ; German: [ˈʁoːza ˈlʊksm̩bʊʁk] ; 5 March 1871 – 15 January 1919)',
      ),
    ).toBe('Rosa Luxemburg (Polish: Róża Luksemburg; 5 March 1871 – 15 January 1919)');
  });

  it('leaves acronyms and hyphenated names alone', () => {
    for (const text of [
      'It consists of the Army (TNI-AD), Navy (TNI-AL), and Air Force (TNI-AU).',
      'Experimental Breeder Reactor I (EBR-I) is a decommissioned research reactor.',
      'A garrote (US-EN) or garrotte (UK-EN), or garrote vil, is a weapon.',
      'The North Atlantic Treaty Organization (NATO) carried out an aerial bombing campaign.',
      'He experimented on prisoners at the Auschwitz II-Birkenau concentration camp.',
      'It reached number 1 on the VG-lista chart in Norway.',
      'The rebels (KGB-backed, pro-EU in name) held the town.',
    ]) {
      expect(stripPronunciation(text)).toBe(text);
    }
  });
});
