# Billing and sign-in setup

Everything below is read from the code, not from memory. The identifiers are
what the app actually asks for; if you name something differently in the
console, the app will not find it.

Without these keys a production build still runs — it falls back to the dev
providers and says so on screen — but **nothing can be bought**. The paywall,
the Founder tier and every Pro feature are a display until this is done.

---

## 1. Google Play Console — in-app products

Create these under **Monetise → Products**. The IDs are matched exactly by
`src/config/pro.ts`.

| Type | Product ID | Price | Shown as |
| --- | --- | --- | --- |
| Subscription | `history_unlocked_pro_monthly` | $5.99 / month | Monthly |
| Subscription | `history_unlocked_pro_annual` | $39.99 / year | Annual — "save 44%" |
| One-time | `history_unlocked_pro_lifetime` | $79.99 | Founder — Lifetime |

The 44% is computed from the other two prices ($71.88 a year monthly against
$39.99) and the paywall recomputes it. **If you change either subscription
price, the saving line changes with it** — that is deliberate, because a
savings figure that no longer matches its own prices is a false claim.

## 2. RevenueCat

| Setting | Value |
| --- | --- |
| Entitlement identifier | `pro` |
| Offering identifier | `default` |
| Android API key | goes in `EXPO_PUBLIC_RC_ANDROID_KEY` |

Attach all three products above to the `default` offering. The app reads
`offerings.all['default']` and lists whatever it finds, in order.

### The Founder generations need an operational rule

The app sells **one** lifetime product, but there are three generations at
three prices:

| Generation | Seats | Price |
| --- | --- | --- |
| First | 1–122 | $79.99 |
| Second | 123–244 | $119.99 |
| Third | 245–366 | $159.99 |

366 seats in total and no more, because a founder keeps one date of the year
outright and there are 366 dates. The bands are that number divided by three;
do not treat them as a round number that can be nudged. See
`src/services/founders/FoundersService.ts`, where every one of these figures
is derived from the calendar rather than typed in.

`FounderSeatsRow` already shows the right one as on sale, because it reads the
live seat count. What it cannot do is change what the store charges.

**So: launch with the First Generation product only.** When seat 122 sells,
swap the lifetime product in the `default` offering for a new
`history_unlocked_pro_lifetime_gen2` at $119.99. No app update is needed —
RevenueCat offerings are server-side.

The failure this avoids is specific and expensive: if the seat count has moved
to Generation II while the offering still holds the $79.99 product, a buyer
pays the old price and is allocated a new-generation seat. The app cannot
detect that on its own, which is why it is written down here.

## 3. Google sign-in

| Setting | Value |
| --- | --- |
| Where | Google Cloud Console → Credentials → OAuth 2.0 Client IDs |
| Which one | the **Web** client id, even for Android |
| Goes in | `EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID` |

Using the *Android* client id here is the usual cause of `DEVELOPER_ERROR` at
sign-in. You still need to register the Android client (package name
`com.historyunlocked.app` plus the signing SHA-1 from EAS) so Google trusts the
app — but the value the app is given is the web one.

An iOS build would additionally need Sign in with Apple beside Google, or
review rejects it. Not a concern while this is Android-only.

## 4. Where the keys go

Never in the repo. EAS holds them:

```bash
npx eas-cli secret:create --scope project --name EXPO_PUBLIC_RC_ANDROID_KEY --value <key>
```

The full list the app reads is in `.env.example`. The two that gate revenue are
`EXPO_PUBLIC_RC_ANDROID_KEY` and `EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID`; the two
that gate content are `EXPO_PUBLIC_MANIFEST_URL` and `EXPO_PUBLIC_WEB_ORIGIN`.

## 5. Order

The ordering matters and is not the obvious one: **Play Console will not let
you create in-app products until a build carrying the billing permission has
been uploaded to a track.** So the first build happens before the products
exist, and is therefore a build whose paywall cannot yet sell anything. That is
expected — it is there to unlock the console, and to produce screenshots.

1. ~~Host `docs/`~~ — **done**. GitHub Pages serves the repository's `/docs`
   folder at `https://didkafacereel.github.io/history-unlocked/`, and
   `EXPO_PUBLIC_MANIFEST_URL` and `EXPO_PUBLIC_WEB_ORIGIN` are already EAS
   project secrets. Measured over the wire: the 17 MB manifest arrives as
   4.06 MB gzipped, with `Access-Control-Allow-Origin: *` and a ten-minute
   cache.
2. ~~Play Console developer account~~ — **done**, already paid for.
3. Create the app in Play Console. Name, default language, "App", "Free".
4. `npx eas-cli build --platform android --profile production` → an AAB.
   `react-native-purchases` is a dependency, so the merged manifest carries
   `com.android.vending.BILLING` whether or not a RevenueCat key is set.
5. Upload that AAB to **Internal testing**. This is what unlocks the products
   page, and it gives you a real install to take screenshots from.
6. Create the three products from the table above.
7. RevenueCat project, entitlement `pro`, offering `default`, Android key.
8. Google Cloud OAuth clients.
9. `eas env:create` for `EXPO_PUBLIC_RC_ANDROID_KEY` and
   `EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID`.
10. Rebuild. This is the first build that can actually take money.

Steps 7 and 8 can be done at any time in parallel; everything else is in order.

## 6. The fourteen-day question

A Play developer account **registered as a personal account after November
2023** must run a closed test with at least 12 testers for 14 continuous days
before it can apply for production access. An organisation account, or a
personal one older than that, is not subject to it.

Check which yours is under **Play Console → Setup → App content**, or the
account details page. It decides whether launch day is "when the app is
finished" or "two weeks after the first closed build", and it is much better
known now than discovered later.
