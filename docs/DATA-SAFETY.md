# Play Console → Data safety answers

What to select in the Data safety form, and why. Every answer below is checked
against what the code actually does — re-check it after any change that adds a
network call, an SDK, or a new stored key.

The form is a declaration Google enforces. An answer that is wrong in the app's
favour is worse than a strict one: mismatches get apps pulled, and the fix is a
review cycle you cannot shortcut.

---

## Does your app collect or share any of the required user data types?

**Yes** — but only in the two optional cases below. Everything else the app
keeps never leaves the device, which the form explicitly does not count as
collection.

## Data types to declare

### Personal info → Name

- Collected: **Yes**
- Shared: **No**
- Processed ephemerally: **No** (it is stored by the sign-in provider's session)
- Required or optional: **Optional** — reading needs no account
- Purpose: **Account management**

### Personal info → Email address

- Collected: **Yes**
- Shared: **No**
- Required or optional: **Optional**
- Purpose: **Account management**

### Personal info → User IDs

- Collected: **Yes** (the Google account ID, and a purchase identifier)
- Shared: **Yes** — with RevenueCat, the billing processor
- Required or optional: **Optional**
- Purpose: **Account management**, **Purchase history**

### Financial info → Purchase history

- Collected: **Yes**
- Shared: **Yes** — RevenueCat and Google Play
- Required or optional: **Required** for the paid tier only
- Purpose: **App functionality** (unlocking what was bought)

> Card numbers are never seen by the app. Google Play handles payment end to
> end; do NOT declare "Payment info".

## Data types to declare as NOT collected

Select nothing for these — the code touches none of them:

- Location (precise or approximate) — no permission is requested
- Contacts, Calendar, Photos, Videos, Audio, Files
- Health and fitness
- Messages
- Web browsing history
- App activity → in-app search history, installed apps, other user-generated
  content — search queries are matched locally against the downloaded archive
  and never sent anywhere
- Device or other IDs → advertising ID — the app has no ads and no ad SDK
- App info and performance → crash logs, diagnostics — no crash reporter is
  installed

## Security practices

- **Data is encrypted in transit:** Yes — every request is HTTPS
- **Users can request that data be deleted:** Yes — the privacy policy gives an
  address and a 30-day commitment; uninstalling removes all on-device data
- **Committed to the Play Families Policy:** No — the app is not targeted at
  children
- **Independent security review:** No

## Also required

- **Privacy policy URL** — `https://<your-pages-domain>/privacy.html`
  (the file is `docs/privacy.html`, published by the same GitHub Pages site that
  serves the manifest)
- Replace **[YOUR CONTACT EMAIL]** in `docs/privacy.html` before submitting.
  It is deliberately left blank: a contact address is configuration, and
  hardcoding a personal address into a public repository is not reversible.

## Re-check this file when

- an analytics or crash-reporting SDK is added (that flips several answers)
- the founders or voting endpoints go live (they will send an identifier)
- audio hosting is added on a third-party CDN
- the app starts requesting any OS permission it does not request today
