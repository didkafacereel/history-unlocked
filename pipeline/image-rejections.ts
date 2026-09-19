/**
 * Backdrop swaps that were proposed, looked at, and refused.
 *
 * Without this file the refusals are worthless: `refresh-symbol-images.ts`
 * re-derives its targets from whatever still carries a symbol, so every event
 * a reviewer declined comes back as the same suggestion on the next run, and
 * the review has to be done again from scratch. Round two re-proposed
 * thirty-six decisions that had already been made in round one.
 *
 * Keyed `year|article` rather than by event id, because one article can serve
 * several events and only some of those pairings are wrong — the United States
 * Constitution is the right source for three events and the wrong one for none,
 * while "Mars" is wrong for two and might be right for a third.
 *
 * These are judgements, so they are grouped by the reason a human could see and
 * a rule could not. Add to the list by reviewing a proposals file; remove from
 * it if a judgement turns out to have been wrong.
 */
export const REJECTED_SWAPS = new Set<string>([
  // The article is a CATEGORY, so its picture illustrates the category rather
  // than the event: an 1820s engraving of a murder for a 1981 investigation,
  // a mountain for "mountaineering", a leaf for "tobacco".
  '1981|Serial killer',
  '1902|Mountaineering',
  '2010|Tobacco',
  '1960|Circumnavigation',
  '2017|Ballistic missile',

  // The article is a PLACE, so its picture is a modern photograph of it.
  '1923|Klaipėda',
  '1977|Madrid',
  '1602|Cape Cod',
  '1992|Buenos Aires',
  '1999|Dagestan',
  '2018|Rakhine State',
  '2005|Southern Ontario',
  '1999|Tulia, Texas',
  '2002|Timor-Leste independence',
  '1991|Baltic states',

  // Right subject, wrong episode — the picture is of a different year's event.
  '1862|American Civil War', // Gettysburg is 1863
  '1846|Warsaw Uprising', // the uprising is 1944
  '1918|World War II', // that year is the first war, not the second
  '2020|World War II',
  '2006|2008 Mumbai attacks',
  '1974|Space Race', // Sputnik, 1957
  '2003|Mars rover', // Curiosity, 2012
  '2002|Mars',
  '2006|Mars',
  '2016|Korean War',
  '2014|Taliban insurgency',
  '1994|International Space Station', // photographed from a Crew Dragon, 2020s
  '1948|World Health Organization', // its modern headquarters building
  '1660|Charles I of England', // executed in 1649
  '1491|Nzinga of Ndongo and Matamba', // born almost a century later
  '1976|Missouri Executive Order 44', // the order is 1838
  '1863|Battle of Franklin', // the painting is the 1864 battle
  '1977|Space Shuttle', // an STS-120 launch, 2007

  // A map, a chart or an organisational diagram.
  '1836|Texas Revolution',
  '1938|British Raj',
  '2001|Bangladesh–India border',
  '1946|Organisation of the League of Nations',
  '2009|France and NATO',
  '1921|Partition of Ireland',
  '1994|Northern Ireland',
  '1976|Member states of the United Nations',
  '2005|United Kingdom European Constitution referendum',
  '2016|United Kingdom membership of the European Union',
  '1988|Parliament of Singapore',
  '2014|Gaza war',

  // The filename says nothing about what the picture shows, so it cannot be
  // accepted sight-unseen.
  '1871|German Reich',
  '2011|Alpha Condé',
  '1972|Battle of Loc Ninh',

  // Simply the wrong thing: a Taiwanese conference photograph for a Swazi king.
  '2018|Mswati III',

  // Round two. The same three failure modes, found the same way — by reading
  // the list. Worth noting how many are the year guard passing something it
  // should not: 25 years of slack is generous for a photograph of a place.
  '1992|Space Race', // Sputnik, 1957
  '2011|Space Race',
  '1996|United States invasion of Afghanistan', // the invasion is 2001
  '2013|United States invasion of Afghanistan',
  '1998|War in Afghanistan (2001–2021)', // the article's own title says 2001
  '1987|Sri Lanka Air Force', // a service badge
  '2012|2025 Nobel Peace Prize', // thirteen years early
  '2014|Scottish independence', // a 2026 march
  '1989|Space Shuttle Discovery', // STS-133, 2011
  '2007|Manila', // a 2025 cityscape
  '1846|Labuan', // a modern financial park
  '1973|Washington, D.C.', // a modern street photograph
  '1936|December 1936', // a pulp magazine cover for that month
  '2025|2025', // the article is the year itself
  '1991|Ossetia',
  '2023|South Africa\'s genocide case against Israel', // the court's seal
  '1967|United Nations Security Council Resolution 242', // a war map
  '1914|French conquest of Morocco', // a map
  '1999|Royal assent', // a generic state-opening photograph
  '2017|Royal assent',

  // Round three. Reading past the lead image of the event's OWN article is a
  // much better strategy — dated article titles ("2010 Madeira floods",
  // "Australia Act 1986", "Reform Act 1832") land perfectly — but a broad
  // ORGANISATION page behaves like a country page: its gallery is everything
  // the organisation ever did, so one picture gets handed to a dozen unrelated
  // events across sixty years.
  '1962|NASA',
  '1974|NASA',
  '1977|NASA',
  '1989|NASA',
  '1990|NASA',
  '1992|NASA',
  '1994|NASA',
  '1996|NASA',
  '1999|NASA',
  '2001|NASA',
  '2002|NASA',
  '2006|NASA',
  '2011|NASA',
  '2013|NASA',
  '1945|United Nations',
  '1948|United Nations',
  '1965|United Nations',
  '2013|Taliban',
  '2014|Taliban',
  '2018|Taliban',
  '1996|Taliban',
  '1998|Taliban',
  '2001|Al-Qaeda',
  '2007|Al-Qaeda',
  '2005|UNESCO',
  '2017|UNESCO',
  '2017|Myanmar Air Force',
  '2022|Myanmar Air Force',
  '2023|Myanmar Air Force',
  '1981|Israeli Air Force',
  '2018|Israeli Air Force',
  '1990|Prime Minister of the United Kingdom',
  '2016|Prime Minister of the United Kingdom',
  '2017|Prime Minister of the United Kingdom',
  '2010|Caucasus Emirate',
  '2014|Caucasus Emirate',
  '1928|Nationalist government',
  '1947|Nationalist government',
  '1915|United States Marine Corps',
  '1945|United States Marine Corps',
  '1908|Austria-Hungary',
  '1916|Austria-Hungary',
  '1972|Viet Cong', // the Brinks Hotel bombing is 1964
  '1957|United States in the Vietnam War',
  '1992|Serbs of Bosnia and Herzegovina',
  '1971|Secretary-General of the United Nations',
  '1991|Warsaw Pact',
  '1999|Warsaw Pact',
  '1967|United Nations Security Council', // the Cairo Conference is 1943
  '2000|United Nations Security Council Resolution 1701',
  '1994|African National Congress',
  '2014|Government of the Philippines',
  '1933|Douglas Douglas-Hamilton, 14th Duke of Hamilton',
  '1979|Boston University',
  '2013|Royal Canadian Mounted Police',
  '1988|Group representation constituency',
  '1967|West Berlin',
  '1992|Mabo v Queensland (No 2)',
  '1992|High Court of Australia',
  '1999|House of Lords Act 1999',
  '1855|Province of Canada',
  '1927|Việt Nam Quốc Dân Đảng',
  '2001|Timor-Leste Defence Force',
  '2015|Mamasapano clash',
  '1972|East Pakistan',
  '1923|Klaipėda Region', // Hitler in Memel, 1939

  // Absurd on sight — the search found an article that shares a word.
  '2006|Palestinians', // a film premiere red carpet
  '1993|Zambia national football team', // a photograph of Avram Grant
  '2021|Central America', // a photograph of a baleada
  '2003|Akkala Sámi', // a map of the Uralic languages
  '1997|Loyalist Volunteer Force', // an outline of Northern Ireland
  '2016|Hong Kong High Court', // a blank legal template
  '1789|Brabant Revolution', // "thumbnail.jpg"
  '2015|Kunduz hospital airstrike', // a province locator
  '2022|2022 Khash massacre', // street football
  '2003|2003 Istanbul bombings', // the 2015 Suruç bombing
  '1999|Civil Guard (Spain)', // a mannequin challenge
  '2017|Catalonia', // a museum building
  '1816|Tristan da Cunha', // a botanical plate
  '2009|2009 imprisonment of American journalists by North Korea', // a river map
]);

/**
 * Individual pictures refused on sight.
 *
 * `year|article` cannot separate several events of the SAME year drawing from
 * one article — five 2022 events all took pictures from "Russo-Ukrainian war",
 * and only one of them was a mineral-resources map. The filename can.
 *
 * Mostly one of three things: a picture of the right subject from decidedly the
 * wrong decade, an object standing in for an era it does not belong to, or
 * something the search simply got wrong.
 */
const REJECTED_IMAGES = new Set<string>([
  // Maps and charts that no filename rule catches.
  '02020_Mineral_resources.jpg',
  'Afghanistan_Civil_War,_Northern_Alliance-Taliban.png',
  '2021_Taliban_Offensive.png',
  'Combined--Control_of_the_U.S._House_of_Representatives_and_Senate.png',
  'MPOWER.png',

  // Right subject, wrong decade.
  '9-11_Pentagon_Emergency_Response_3.jpg', // offered for a 1980 FBI event
  '2008_San_Diego_federal_Courthouse_bombing.jpg', // for 2001
  'Aerial_view_of_Apple_Park_dllu.jpg', // a 2017 building for 2007
  'Apple_AirPods_Max_6.jpg', // a 2020 product for 2010
  'Apple_Genius_Bar_Regentstreet_London.jpg', // for 1998
  '20260306_Chicago,_Estados_Unidos-_Exequias_del_reverendo_Jesse_Jackson_09.jpg',
  'Barack_Obama_visiting_victims_of_2012_Aurora_shooting.jpg', // for 2010
  'Altair_8800_and_Model_33_ASR_Teletype.jpg', // a 1975 machine for 2000
  'Apollo_11_astronaut_Buzz_Aldrin_tries_out_Microsoft_HoloLens.jpg', // for 2001
  '300lx.jpg', // an HP palmtop, for Microsoft in 2007
  'Anthony_Kennedy_official_SCOTUS_portrait_crop.jpg', // for 1973
  'Associate_Justice_Neil_Gorsuch_Official_Portrait_(cropped_2).jpg', // for 1992
  'Associate_Justice_Brett_Kavanaugh_Official_Portrait.jpg', // for 1998
  'Amy_Coney_Barrett_official_portrait.jpg', // for 2008
  'Beatles_and_George_Martin_in_studio_1966.JPG', // for 1962
  'Beatlemania_fan_-_Press_and_Sun-Bulletin_(1964).jpg', // for 1967
  'Beatles_in_1963.png', // for 1968
  'Beatles_with_Ed_Sullivan.jpg', // for 1968
  '10Cincinnati_2015_(2).jpg', // for 1991
  '131023-F-PR861-033_Hanscom_participates_in_World_Series_festivities.jpg', // for 1994
  '2013_Fatah_anniversary_rally_in_Gaza_(04).jpg', // for 2002
  'Funeral_of_Ruhollah_Khomeini,_4_June_1989_(5).jpg', // for 1979
  'Dwight_David_Eisenhower,_photo_portrait_by_Bachrach,_1952.jpg', // for a Nixon event
  'Congressman_Richard_Nixon,_Yorba_Linda,_circa_April_1950.jpg', // for 1970
  '02022_1199_Refugees_from_Ukraine_in_Kraków.jpg', // a 2022 photo for 2014

  // The search simply got the wrong thing.
  'Blue_iPod_Nano.jpg', // proposed for a Barack Obama event
  'Ancient_Greek_Football_Player.jpg', // for 19th and 20th century football
  '2._SNL_-_27._krog_-_Nafta_1903_0-0_(0-0)_Roltek_Dob_-_Sobota.jpg',
  'Belgique_-_Bruxelles_-_Schuman_-_Berlaymont_-_01.jpg', // for Microsoft
  'Duns_Scotus_Painting_(cropped).jpg', // for John Paul II
  '046CupolaSPietro.jpg',
  'Canonization_2014-_The_Canonization_of_Saint_John_XXIII_and_Saint_John_Paul_II_(14014695484).jpg',
  'Esfahan_(Iran)_Emam_Place_with_Emam_Mosque.JPG', // for Khomeini, 1979
  'Carpet_given_to_Id_Kah_mosque_by_Ayatollah_Khomeini.jpg',
  'Falasha_makstyle.jpg',
  'Bug_de_l\'an_2000.jpg', // the article was the year "1999", for a 2007 event
  'ALFiqh.png', // for "Dhimmi"
  'Мечеть_"Сердце_Чечни".jpg', // a mosque opened in 2008, for a 2000 event
  'Toronto_Skyline_from_Olympic_Island.jpg',
  'KobanéVOA1.JPG',
  'Pope_Leo_XIV_3_(3x4_cropped).png', // a 2025 pope, for 2001
  'thumbnail.jpg',
]);

/**
 * Round five, refused whole.
 *
 * It ran with the own-article image pool widened from twelve pictures to forty
 * so that every event sharing a page could be given a different one. All 290
 * proposals were read; the strategy turns out to be unsound rather than
 * imperfectly tuned, because a picture taken off a page about a subject is a
 * picture of some OTHER episode of that subject. It offered the bodies at
 * Nanking in 1937 for the Battle of Kasserine Pass, the Palmiry executions for
 * the bombing of Pforzheim, Bloody Sunday the Shankill, Ruth Bader Ginsburg
 * for Roe v. Wade twenty years before she was appointed, Chuck Berry for the
 * release of "Hey Jude", and — from an article titled "1999" — the Columbine
 * security-camera still for a British windstorm in 2007.
 *
 * Uniqueness was the goal and accuracy the price, which is the wrong way round:
 * a backdrop shared by forty cards is untidy, a backdrop that misidentifies a
 * massacre is a lie. The proposals were discarded, the events that earlier
 * rounds had already changed this way were put back by
 * restore-topic-backdrops.ts, and `topicArticles` in refresh-symbol-images.ts
 * now keeps the strategy away from any article several events share.
 *
 * Nothing is listed below because nothing needs to be: the guard is upstream
 * now, and a per-item list of 290 refusals would only record the symptom.
 */

export function wasRejected(year: number, article: string): boolean {
  return REJECTED_SWAPS.has(`${year}|${article}`);
}

/** True for a picture refused on review, whatever event it is offered for. */
export function imageWasRejected(fileName: string): boolean {
  const bare = fileName.split('/').pop() ?? fileName;
  let decoded: string;
  try {
    decoded = decodeURIComponent(bare);
  } catch {
    decoded = bare;
  }
  return REJECTED_IMAGES.has(decoded.replace(/^\d+px-/, ''));
}
