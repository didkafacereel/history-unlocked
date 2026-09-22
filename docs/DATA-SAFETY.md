# Play Console → Data safety answers

What to select in the Data safety form, and why. Every answer below is checked
against what the code actually does — re-check it after any change that adds a
network call, an SDK, or a new stored key.

The form is a declaration Google enforces. An answer that is wrong in the app's
favour is worse than a strict one: mismatches get apps pulled, and the fix is a
review cycle you cannot shortcut.

> **Rewritten 22 September 2026, after the backend shipped.** The previous
> version was written when the app talked to no server at all, and almost every
> answer in it was true at the time and is not now. What changed: accounts
> (Firebase Auth, Google **and** an email link), a founder's kept date and the
> public name on it (Cloud Firestore), and a RevenueCat webhook that writes
> entitlements. Shipping the old declaration is how an app gets pulled later.

---

## Before the form: the account deletion requirement

**This is a blocking requirement, separate from the Data safety answers, and it
is easy to miss.** Google Play requires that any app which lets people create an
account also lets them delete it — from inside the app, *and* from a web page
that someone who has already uninstalled can reach. A support mailbox alone does
not satisfy it.

History Unlocked creates accounts the moment anyone signs in with Google or an
email link, so the requirement applies.

| | |
| --- | --- |
| In-app route | Profile → **Account** → **Delete account** — `src/components/auth/DeleteAccountRow.tsx` |
| Web route | `https://didkafacereel.github.io/history-unlocked/delete-account.html` |
| What it does | `DELETE /account` on the founders API: releases the kept date, removes the entitlement, deletes the Firebase Auth user |

The URL goes in **two** places in the Console and they are not the same field:

1. **App content → Data deletion** (the account-deletion declaration)
2. **Data safety → Data collection and security → "Users can request that their
   data is deleted"** → Yes, with the URL

---

## Does your app collect or share any of the required user data types?

**Yes.** Everything the app keeps on the device never leaves it, which the form
explicitly does not count as collection — but signing in and keeping a day both
send data to a server we run, and that is collection.

## Data types to declare

### Personal info → Name

- Collected: **Yes**
- Shared: **No**
- Processed ephemerally: **No**
- Required or optional: **Optional** — reading needs no account
- Purpose: **Account management**, **App functionality**

Two different names arrive under this heading and both are covered by it:

- the Google account display name, if they signed in with Google, held in the
  Firebase Auth user record
- the **keeper name** a founder types, stored in Firestore and shown publicly

The keeper name is a chosen name rather than a legal one — Google defines this
type as "how a user refers to themselves… or nickname", which covers it. It was
considered under *App activity → Other user-generated content* as well and
declared here instead, because it is a name and declaring the same string twice
makes the form harder to check rather than stricter.

> **Publishing it is not "sharing".** Google's definition of sharing is transfer
> to a *third party*, with an exception for a transfer the user themselves
> initiates. A founder types a name specifically so it will appear on their day,
> and the app says so before they do it. It still has to be disclosed, and it is
> — prominently, in `docs/privacy.html` and again on the claim screen.

### Personal info → Email address

- Collected: **Yes**
- Shared: **No**
- Required or optional: **Optional**
- Purpose: **Account management**

Both sign-in routes produce one: Google supplies it, or the reader types it to
receive a sign-in link. There is no mailing list and no other mail is ever sent.

### Personal info → User IDs

- Collected: **Yes** — the Firebase account ID, the Google account ID, and the
  RevenueCat app-user ID, which is deliberately the same string as the Firebase
  one
- Shared: **Yes** — with RevenueCat, the billing processor
- Required or optional: **Optional**
- Purpose: **Account management**, **Purchase history**

RevenueCat could defensibly be declared a service provider rather than a third
party, which would make this "No". It is declared as shared anyway, on the rule
at the top of this file: strict costs nothing, lenient costs a review cycle.

### Financial info → Purchase history

- Collected: **Yes**
- Shared: **Yes** — RevenueCat and Google Play
- Required or optional: **Required** for the paid tier only
- Purpose: **App functionality** (unlocking what was bought)

> Card numbers are never seen by the app. Google Play handles payment end to
> end; do NOT declare "Payment info".

## Data types to declare as NOT collected

Select nothing for these — the code touches none of them:

- **Location (precise or approximate)** — no permission is requested, and no IP
  address is turned into a location. See the note below on why IP has no line of
  its own.
- Contacts, Calendar, Photos, Videos, Audio, Files
- Health and fitness
- Messages
- Web browsing history
- App activity → in-app search history, installed apps — search queries are
  matched locally against the downloaded archive and never sent anywhere
- App activity → other user-generated content — the one piece of user text the
  app sends is the keeper name, declared under **Name** above
- Device or other IDs → **advertising ID** — the app has no ads and no ad SDK.
  There is no Firebase Installations ID either: only `firebase/app` and
  `firebase/auth` are imported, no Analytics, Messaging, Remote Config or
  Crashlytics, and the founders API is plain HTTPS rather than the Firestore
  client SDK.
- App info and performance → crash logs, diagnostics — no crash reporter is
  installed

### Why IP addresses are not declared

The form has no data type for an IP address, and the only place one could be
declared is *Location → Approximate location*, which is for apps that **derive a
location** from it. Nothing here does. IP is processed in transit by our
hosting, by Firebase and by Wikimedia when an image loads, which is ordinary for
any network request — so it belongs in the privacy policy, where it is stated,
and not in this form.

## Security practices

- **Data is encrypted in transit:** Yes — every request is HTTPS, and the ID
  token the app sends is verified server-side rather than trusted
- **Users can request that data be deleted:** **Yes**, with the URL above.
  In-app deletion is immediate; the email route is answered within 30 days.
- **Committed to the Play Families Policy:** No — the app is not targeted at
  children
- **Independent security review:** No

## Also required

- **Privacy policy URL** —
  `https://didkafacereel.github.io/history-unlocked/privacy.html`
  (the file is `docs/privacy.html`, published by the same GitHub Pages site that
  serves the manifest)
- **Account deletion URL** —
  `https://didkafacereel.github.io/history-unlocked/delete-account.html`
- **Contact address** — `support@gridconvertpro.com`, in `docs/privacy.html`.
  A purpose-made support address, not a personal one: this file is published
  and indexed, and putting a personal inbox in it is not reversible.

## Where each answer comes from, if it is ever challenged

| Answer | The code that makes it true |
| --- | --- |
| Name, email, user ID collected | `src/services/auth/firebaseAuth.native.ts` |
| Keeper name stored and published | `firebase/functions/src/store.ts` → `claimDate` |
| Purchase history shared | `firebase/functions/src/index.ts` → `revenuecat` |
| Deletion honoured | `firebase/functions/src/store.ts` → `deleteAccountData` |
| No client-side Firestore, no Analytics | `package.json`, and the imports in `src/services/firebase/` |
| Notifications are local only | no push token is ever requested |

## Re-check this file when

- an analytics or crash-reporting SDK is added (that flips several answers)
- FCM push is added — a device push token is *Device or other IDs*, and the
  deferred reminder work would introduce one
- audio hosting is added on a third-party CDN
- the app starts requesting any OS permission it does not request today
- anything is added to what the server stores about a reader
