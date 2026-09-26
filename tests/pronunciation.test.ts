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
});
