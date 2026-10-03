/**
 * Events added by hand, one at a time, outside the "on this day" feed.
 *
 * Not cornerstones: a cornerstone is what a date is KNOWN for and always leads
 * its day. These are events the feed happened not to list — most of them the
 * subject of a daily film, which must always be an event the app actually has
 * (the user's rule, 3 Oct 2026: "everything I'm offered must be in the app").
 * They take their place in the day by the normal ranking.
 *
 * Each entry carries its own `text`: two or three sentences about THE EVENT,
 * written from the named article. Several articles are about a person (Woodrow
 * Wilson, Columbus), whose lead paragraph is a biography, and the card's facts
 * are cut from this text — so it has to be about the day, not the life.
 *
 * `headline` ≤ 90 characters, a finished sentence with no full stop (the
 * card's rule; see written-headlines.ts). `imageTitle` takes the backdrop from
 * another article when the event's own has no free lead image.
 *
 *   npx tsx pipeline/apply-additions.ts            list what would be added
 *   npx tsx pipeline/apply-additions.ts --apply    write pipeline/events-db.json
 *
 * Then `npm run pipeline:publish`.
 */
import type { HistoricalEvent } from '../src/types/manifest';

export interface Addition {
  dateKey: string;
  year: number;
  /** English Wikipedia article the text and image come from. */
  wikiTitle: string;
  headline: string;
  /** Event-specific text, from the article; the card's facts are cut from it. */
  text: string;
  /** Article to take the backdrop from instead, when `wikiTitle` has no free image. */
  imageTitle?: string;
  /** Overrides the keyword guess, which reads only the headline. */
  category?: HistoricalEvent['category'];
}

export const ADDITIONS: Addition[] = [
  {
    dateKey: '09-30',
    year: 1949,
    wikiTitle: 'Berlin Blockade',
    category: 'Politics & Power',
    headline: 'The Berlin Airlift officially ended after fifteen months of flights into West Berlin',
    text:
      'The Berlin Airlift officially ended on 30 September 1949. From 26 June 1948, Western air forces had flown food and fuel into West Berlin after the Soviet Union blocked the Western Allies\' railway, road and canal access to the city. During the airlift, pilot Gail Halvorsen began dropping candy to Berlin children on small parachutes, which earned him the nickname "the Candy Bomber".',
  },
  {
    dateKey: '10-02',
    year: 1919,
    wikiTitle: 'Woodrow Wilson',
    headline: 'President Woodrow Wilson suffered a severe stroke that left him partly paralyzed',
    text:
      'On October 2, 1919, Woodrow Wilson suffered a serious stroke, leaving him paralyzed on his left side and with only partial vision in his right eye. His wife Edith Wilson took on what she later called a \"stewardship\", deciding which communications and matters of state were important enough to bring to the bedridden president.',
  },
  {
    dateKey: '10-03',
    year: 1942,
    wikiTitle: 'V-2 rocket',
    category: 'Science & Technology',
    headline: 'A German V-2 rocket reached 84.5 km on its first successful test flight at Peenemünde',
    text:
      'The fourth test flight of the A-4 rocket, later called the V-2, was the first to succeed. On 3 October 1942 rocket V-4 rose from Peenemünde on the Baltic coast to an altitude of 84.5 kilometres. Built as a "vengeance weapon" to attack Allied cities, the V-2 also became, in June 1944, the first artificial object to travel into space.',
  },
  {
    dateKey: '10-09',
    year: 1934,
    wikiTitle: 'Alexander I of Yugoslavia',
    headline: 'King Alexander I of Yugoslavia was shot dead in Marseille, at the start of a state visit',
    text:
      'On 9 October 1934 King Alexander I of Yugoslavia arrived in Marseille to begin a state visit to France. During a stop in the city he was assassinated by Vlado Chernozemski, a member of the Internal Macedonian Revolutionary Organization. French foreign minister Louis Barthou was also killed. It was one of the first assassinations to be captured on film.',
  },
  {
    dateKey: '10-03',
    year: 1574,
    wikiTitle: 'Siege of Leiden',
    headline: 'The Spanish siege of Leiden ended after Dutch rebels flooded the land around the city',
    text:
      'The Spanish siege of Leiden, begun in October 1573, failed when the city was relieved in October 1574. The Dutch rebels led by William the Silent broke the dykes so that the sea flooded the low land, and the Sea Beggars under Admiral Louis de Boisot sailed their ships across it. The Spanish army retreated in the night of 2 October, and Leiden still celebrates its relief every 3 October.',
  },
  {
    dateKey: '10-04',
    year: 1582,
    wikiTitle: 'Gregorian calendar',
    imageTitle: 'Inter gravissimas',
    category: 'Science & Technology',
    headline: 'The Gregorian calendar began: Thursday 4 October 1582 was followed by Friday 15 October',
    text:
      'Pope Gregory XIII\'s calendar reform took effect in Catholic countries. To bring the calendar back in line with the seasons, it skipped ten days: Julian Thursday 4 October 1582 was followed by Gregorian Friday 15 October 1582. The cycle of weekdays was not affected.',
  },
  {
    dateKey: '10-04',
    year: 1883,
    wikiTitle: 'Orient Express',
    category: 'Exploration & Discovery',
    headline: 'The Orient Express was extended past Vienna, on the way to Constantinople',
    text:
      'The Orient Express, a luxury train run by the Compagnie Internationale des Wagons-Lits, had first left Paris for Vienna on 5 June 1883. Vienna remained the terminus until 4 October 1883, when the route was extended to Giurgiu in Romania. From there passengers crossed the Danube and continued by train and ship to Constantinople.',
  },
  {
    dateKey: '10-05',
    year: 1905,
    wikiTitle: 'Wright Flyer III',
    imageTitle: 'Huffman Prairie',
    category: 'Science & Technology',
    headline: 'Wilbur Wright flew the Wright Flyer III 24 miles in 39 minutes over Huffman Prairie',
    text:
      'On October 5, 1905, Wilbur Wright made a circling flight of 24.5 miles in 39 minutes and 23 seconds over Huffman Prairie in Ohio. It lasted longer than all the Wright brothers\' flights of 1903 and 1904 put together. The Flyer III was the Wrights\' first practical and dependable aeroplane.',
  },
  {
    dateKey: '10-05',
    year: 1931,
    wikiTitle: 'Miss Veedol',
    headline: 'Pangborn and Herndon landed Miss Veedol after the first nonstop flight across the Pacific',
    text:
      'On October 5, 1931, Clyde Pangborn and co-pilot Hugh Herndon landed in the hills of East Wenatchee, Washington. They had flown for 41 hours from Sabishiro Beach in Misawa, Japan, across the northern Pacific: the first nonstop flight across the ocean. They had dropped the plane\'s landing gear over the sea to save weight and landed on its belly.',
  },
  {
    dateKey: '10-06',
    year: 1600,
    wikiTitle: 'Euridice (Peri)',
    headline: 'Euridice, the earliest opera whose music survives, was first performed in Florence',
    text:
      'Jacopo Peri\'s Euridice was first performed in Florence on 6 October 1600 at the Palazzo Pitti, with Peri himself singing the role of Orfeo. It is the earliest surviving opera: Peri\'s earlier Dafne is lost. It was staged for the wedding celebrations of Maria de\' Medici and King Henry IV of France.',
  },
  {
    dateKey: '10-07',
    year: 1959,
    wikiTitle: 'Luna 3',
    headline: 'The Soviet probe Luna 3 took the first photographs of the far side of the Moon',
    text:
      'On 7 October 1959 the Soviet space probe Luna 3 photographed the far side of the Moon, which never faces Earth. Over about forty minutes it imaged some 70% of the far side from more than 60,000 km away. The never-before-seen views caused excitement around the world, and a first atlas of the far side was made from them.',
  },
  {
    dateKey: '10-08',
    year: 1829,
    wikiTitle: 'Rainhill trials',
    imageTitle: "Stephenson's Rocket",
    headline: "Stephenson's Rocket completed its run at the Rainhill Trials, on its way to winning them",
    text:
      'The Rainhill trials, held from 6 to 14 October 1829, tested whether locomotives could work the nearly finished Liverpool and Manchester Railway. On the third day Stephenson\'s Rocket performed the full task, hauling about 13 tons. It was the only locomotive to complete the trials, reached 30 miles per hour, and won the £500 prize.',
  },
  {
    dateKey: '10-09',
    year: 1604,
    wikiTitle: "Kepler's Supernova",
    category: 'Science & Technology',
    headline: "Kepler's Supernova appeared, the last supernova in our galaxy seen with the naked eye",
    text:
      'The first recorded European observation of a new star in the constellation Ophiuchus was made on 9 October 1604. Johannes Kepler studied it so closely that it bears his name. Brighter at its peak than any other star in the night sky, it is the most recent supernova in the Milky Way to have been unquestionably observed by the naked eye.',
  },
  {
    dateKey: '10-10',
    year: 1913,
    wikiTitle: 'Panama Canal',
    imageTitle: 'Woodrow Wilson',
    category: 'Exploration & Discovery',
    headline: 'From the White House, Woodrow Wilson set off the blast that destroyed the Gamboa Dike',
    text:
      'On 10 October 1913 President Woodrow Wilson sent a signal by telegraph from the White House that triggered the explosion destroying the Gamboa Dike in Panama. The United States had taken over the canal project in 1904. The canal formally opened on 15 August 1914, with the passage of the cargo ship SS Ancon.',
  },
  {
    dateKey: '10-10',
    year: 1492,
    wikiTitle: 'Voyages of Christopher Columbus',
    imageTitle: 'Santa María (ship)',
    category: 'Exploration & Discovery',
    headline: 'Columbus put down a mutiny by sailors who wanted to turn back, two days before landfall',
    text:
      'On 10 October 1492, more than a month out from the Canary Islands, Columbus quelled a mutiny by sailors who wanted to abandon the search and return to Spain. Two days later his expedition sighted land in the Bahamas: the first European landfall in the Americas on his voyages.',
  },
  {
    dateKey: '10-10',
    year: 1957,
    wikiTitle: 'Komla Agbeli Gbedemah',
    imageTitle: 'Dwight D. Eisenhower',
    category: 'Society & Rights',
    headline: "Eisenhower apologized to Ghana's finance minister, turned away at a Delaware restaurant",
    text:
      'Komla Agbeli Gbedemah, Ghana\'s finance minister, was refused service in a Howard Johnson\'s restaurant in Dover, Delaware. On 10 October 1957 President Dwight D. Eisenhower apologized to him. Gbedemah had told the staff: "You can keep the orange juice and the change, but this is not the last you have heard of this."',
  },
];
