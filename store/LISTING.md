# Play Store listing

Copy to paste into the Play Console. Everything here describes what the app
does today — the same rule `src/config/pro.ts` carries: nothing is advertised
that a buyer cannot find.

---

## App name (30 characters max)

```
History Unlocked
```

## Short description (80 characters max)

```
What happened on today's date — eight thousand events, one day at a time.
```

*72 characters.*

## Full description (4000 characters max)

```
Every day, History Unlocked opens on the date you are living through — and
shows you what else has happened on it, across every century the archive
holds.

Not a feed of trivia. A day at a time, in order, with the strongest event of
that date first.

WHAT IS IN IT

• 8,056 events across all 366 days, including 29 February
• At least twenty events recorded for every calendar day
• Every backdrop is a freely licensed photograph, painting or document, and
  every one is credited on the card
• The people born and lost on each date, with portraits and a short life
• 6,017 written scenarios: decide what you would have done, then find out what
  actually happened

HOW IT WORKS

Swipe up through the day. Each card is a year, a headline and the facts that
matter, with the full account one tap underneath. At the end of the day come
the scenarios.

It remembers what you have read. Come back next year and the feed opens on
your first unread event, so the same story is never served twice.

FREE, AND WHAT PRO ADDS

Free is the whole habit: today's date, three events from it, eight questions
on the day, the register of who was born and lost on it, and your streak. No
account needed — the app never asks you to sign in to read.

Pro opens the depth:
• The whole day — at least twenty events, not three
• Sixteen questions a day instead of eight
• The Time Machine — any date of the year, not only today
• Whole-archive search
• Recall drills that bring events back on a schedule so you remember them
• Unlimited practice across all 6,017 scenarios
• Fourteen Museum collections, filled by reading

LIFETIME, AND THE DAY THAT COMES WITH IT

Lifetime is one payment and a numbered founder seat — and one date of the
year that is yours alone. Your name sits at the foot of that day's register,
every year, for as long as the archive exists.

There are 366 days and one keeper each, so there are 366 seats and there will
never be more. You can see which days are still free before you buy.

SOURCES

Text and imagery come from Wikipedia and Wikimedia Commons under free licences,
credited on every card with a link to the original. Where no freely licensed
picture of an event exists, the card says so rather than showing something
else.

Works offline once the archive has downloaded.
```

*2,284 characters — well inside the 4,000 limit and short enough to be read.*

Every number above is checked against the published archive, not remembered:
8,056 events over 366 days, the thinnest day carrying 21, 6,017 authored
scenarios, and 29 February present with 22 of its own. "At least twenty" is
deliberately one under the true minimum, so a rebuild that loses an event
somewhere does not turn the listing into a false claim.

---

## Graphics

| Asset | File | Status |
| --- | --- | --- |
| Icon, 512×512 | `store/HistoryUnlocked_icon_512.png` | ready, 343 KB, opaque |
| Feature graphic, 1024×500 | `store/HistoryUnlocked_feature_1024x500.png` | ready, 246 KB, no alpha |
| Phone screenshots | — | **needs a device build** |

At least two screenshots are required; four to eight is better. The ones worth
taking, in order:

1. The feed on a strong day — the year, the headline, the facts
2. A scenario mid-question, with its image
3. The Time Machine calendar with the covered days lit
4. The Museum collections board
5. The register of people born and lost on a date

## Categorisation

| Field | Answer |
| --- | --- |
| App category | Education |
| Tags | History, Reference |
| Contains ads | No |
| In-app purchases | Yes — $5.99 to $159.99 |

## Content rating questionnaire

The archive covers war, massacres, genocide and disasters, described plainly.
Answer the questionnaire honestly on that basis — an Education app that
under-declares historical violence is the kind of thing that gets pulled later.
Expect **Teen / PEGI 12** or similar.

Points the questionnaire asks about, and the truthful answer for this app:

| Asked | Answer |
| --- | --- |
| Violence | References to real historical violence in text, no graphics or gameplay |
| Sexual content | None |
| Profanity | None |
| Drugs | Historical references only |
| User-generated content | None shown to other users |
| Shares location | No |
| Digital purchases | Yes |

## Data safety

Already written, from an inventory of the ten persisted keys and the network
hosts rather than from boilerplate: `docs/DATA-SAFETY.md`. Transcribe it into
the form; do not re-answer it from memory.

## Privacy policy

```
https://didkafacereel.github.io/history-unlocked/privacy.html
```

Live and serving, with `support@gridconvertpro.com` as the contact address.
Play publishes that address, so it is a support inbox rather than a personal
one — and the same address belongs in the Play Console listing's own contact
field, which is a separate box from this page.

---

## Before you can publish

A new **personal** Play developer account has to run a closed test with at
least 12 testers for 14 continuous days before production access is granted.
Check this in your own console early: if it applies, the launch date is two
weeks after the first closed build, not the day the app is finished.
