/**
 * The founders backend, executed against the real Firebase emulators.
 *
 * Everything in `tests/foundersWebhook.test.ts` proves what the webhook
 * DECIDES. This proves what the whole thing DOES: real HTTP into the deployed
 * function code, real ID tokens from the Auth emulator, real Firestore
 * transactions — including the two races that are the whole point of using
 * transactions at all, which no unit test can exercise.
 *
 * Run:  npm run serve         (in one terminal — needs Java for Firestore)
 *       npm run test:emulator (in another)
 *
 * It clears the emulators before starting, so it is repeatable, and it only
 * ever talks to 127.0.0.1 under a `demo-` project id — the emulator refuses to
 * reach real Google services for those, so nothing here can touch production.
 */

const PROJECT = 'demo-history-unlocked';
const REGION = 'europe-west1';
const FN = `http://127.0.0.1:5001/${PROJECT}/${REGION}`;
const API = `${FN}/api`;
const WEBHOOK = `${FN}/revenuecat`;
const AUTH = 'http://127.0.0.1:9099';
const FIRESTORE = `http://127.0.0.1:8080/v1/projects/${PROJECT}/databases/(default)/documents`;
const SECRET = 'emulator-only-test-secret';

const LIFETIME = 'history_unlocked_pro_lifetime';
const MONTHLY = 'history_unlocked_pro_monthly';

let failures = 0;
let passes = 0;

function check(name, condition, detail = '') {
  if (condition) {
    passes++;
    console.log(`  PASS  ${name}`);
  } else {
    failures++;
    console.log(`  FAIL  ${name}${detail ? `  — ${detail}` : ''}`);
  }
}

async function json(res) {
  const text = await res.text();
  try {
    return text ? JSON.parse(text) : null;
  } catch {
    return text;
  }
}

async function reset() {
  await fetch(`http://127.0.0.1:8080/emulator/v1/projects/${PROJECT}/databases/(default)/documents`, {
    method: 'DELETE',
  });
  await fetch(`${AUTH}/emulator/v1/projects/${PROJECT}/accounts`, { method: 'DELETE' });
}

let userCounter = 0;
async function newUser() {
  userCounter++;
  const res = await fetch(
    `${AUTH}/identitytoolkit.googleapis.com/v1/accounts:signUp?key=emulator-key`,
    {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        email: `reader${userCounter}@example.com`,
        password: 'emulator-password',
        returnSecureToken: true,
      }),
    },
  );
  const body = await json(res);
  return { uid: body.localId, token: body.idToken };
}

async function lookupUser(token) {
  const res = await fetch(`${AUTH}/identitytoolkit.googleapis.com/v1/accounts:lookup?key=emulator-key`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ idToken: token }),
  });
  return { status: res.status, body: await json(res) };
}

async function webhook(event, secret = SECRET) {
  const headers = { 'content-type': 'application/json' };
  if (secret !== null) {
    headers.authorization = `Bearer ${secret}`;
  }
  const res = await fetch(WEBHOOK, { method: 'POST', headers, body: JSON.stringify({ event }) });
  return { status: res.status, body: await json(res) };
}

const grantLifetime = (uid) =>
  webhook({
    type: 'NON_RENEWING_PURCHASE',
    app_user_id: uid,
    entitlement_ids: ['pro'],
    product_id: LIFETIME,
    period_type: 'NORMAL',
  });

async function api(path, { token, method = 'GET', body } = {}) {
  const headers = { accept: 'application/json', 'content-type': 'application/json' };
  if (token) {
    headers.authorization = `Bearer ${token}`;
  }
  const res = await fetch(`${API}${path}`, {
    method,
    headers,
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  return { status: res.status, body: await json(res) };
}

/** A Firestore document through the emulator's REST API, bypassing rules. */
async function doc(path) {
  const res = await fetch(`${FIRESTORE}/${path}`, { headers: { authorization: 'Bearer owner' } });
  if (res.status === 404) {
    return null;
  }
  const body = await json(res);
  const out = {};
  for (const [key, value] of Object.entries(body.fields ?? {})) {
    out[key] =
      value.stringValue ??
      (value.integerValue !== undefined ? Number(value.integerValue) : undefined) ??
      value.booleanValue ??
      (value.nullValue !== undefined ? null : value);
  }
  return out;
}

async function collection(path) {
  const res = await fetch(`${FIRESTORE}/${path}?pageSize=500`, {
    headers: { authorization: 'Bearer owner' },
  });
  const body = await json(res);
  return (body.documents ?? []).map((d) => ({
    id: d.name.split('/').pop(),
    name: d.fields?.name?.stringValue,
    uid: d.fields?.uid?.stringValue,
  }));
}

async function waitForEmulators() {
  const deadline = Date.now() + 90_000;
  while (Date.now() < deadline) {
    try {
      const res = await fetch(`${API}/founders/dates`);
      if (res.status < 500) {
        return true;
      }
    } catch {
      // not up yet
    }
    await new Promise((r) => setTimeout(r, 1000));
  }
  return false;
}

// ─────────────────────────────────────────────────────────────────────────────

async function main() {
  if (!(await waitForEmulators())) {
    console.error('Emulators are not answering on 127.0.0.1. Run `npm run serve` first.');
    process.exit(2);
  }
  await reset();

  console.log('\nThe webhook only listens to RevenueCat');
  check('no Authorization → 401', (await webhook({ type: 'TEST' }, null)).status === 401);
  check('wrong secret → 401', (await webhook({ type: 'TEST' }, 'guess')).status === 401);

  console.log('\nThe webhook allocates the seat (the race that used to strand buyers)');
  const ada = await newUser();
  const granted = await grantLifetime(ada.uid);
  check('grant accepted', granted.status === 200 && granted.body?.action === 'grant', JSON.stringify(granted));
  // No client call to /founders/seat at all — the seat must already exist.
  const adaMe = await api('/founders/me', { token: ada.token });
  check('lifetime is true without the client ever claiming', adaMe.body?.lifetime === true);
  check('seat #1 allocated by the webhook alone', adaMe.body?.seat === 1, JSON.stringify(adaMe.body));
  const again = await api('/founders/seat', { token: ada.token, method: 'POST' });
  check('client claim afterwards is idempotent — still #1', again.body?.seat === 1);

  console.log('\nClaiming a day, and the rules around it');
  const claim = await api('/founders/date/03-07', {
    token: ada.token,
    method: 'POST',
    body: { displayName: 'Ada Lovelace' },
  });
  check('claim succeeds', claim.status === 200 && claim.body?.ok === true, JSON.stringify(claim));
  const second = await api('/founders/date/03-08', {
    token: ada.token,
    method: 'POST',
    body: { displayName: 'Ada Lovelace' },
  });
  check('a second claim is refused (one day per founder)', second.body?.reason === 'already-claimed');
  const nobody = await newUser();
  const notFounder = await api('/founders/date/05-05', {
    token: nobody.token,
    method: 'POST',
    body: { displayName: 'Somebody' },
  });
  check('a non-founder cannot claim', notFounder.body?.reason === 'not-a-founder');
  check(
    'a non-founder cannot take a seat',
    (await api('/founders/seat', { token: nobody.token, method: 'POST' })).status === 403,
  );
  const impostor = await newUser();
  await grantLifetime(impostor.uid);
  const blocked = await api('/founders/date/06-06', {
    token: impostor.token,
    method: 'POST',
    body: { displayName: 'Admin' },
  });
  check('an impersonating name is refused server-side', blocked.status === 400);
  check('an unsigned request is refused', (await api('/founders/me')).status === 401);

  console.log('\nThe bug: cancelling a subscription must NOT destroy a founder seat');
  const cancel = await webhook({
    type: 'CANCELLATION',
    app_user_id: ada.uid,
    entitlement_ids: ['pro'],
    product_id: MONTHLY,
  });
  check('cancellation of the monthly plan is ignored', cancel.body?.action === 'ignore');
  const adaAfter = await api('/founders/me', { token: ada.token });
  check('seat survives', adaAfter.body?.seat === 1);
  check('kept day survives', adaAfter.body?.keptDate === '03-07');
  const day = await api('/founders/date/03-07');
  check('the name is still on the day', day.body?.keepers?.[0] === 'Ada Lovelace');

  console.log('\nRace: two founders tap the same day in the same moment');
  const b = await newUser();
  const c = await newUser();
  await Promise.all([grantLifetime(b.uid), grantLifetime(c.uid)]);
  const [rb, rc] = await Promise.all([
    api('/founders/date/12-25', { token: b.token, method: 'POST', body: { displayName: 'Bea Brown' } }),
    api('/founders/date/12-25', { token: c.token, method: 'POST', body: { displayName: 'Cal Clark' } }),
  ]);
  const winners = [rb, rc].filter((r) => r.body?.ok === true).length;
  const taken = [rb, rc].filter((r) => r.body?.reason === 'taken').length;
  check('exactly one wins 25 December', winners === 1, `${rb.status}/${rc.status}`);
  check('the other is told it is taken', taken === 1);

  console.log('\nRace: twelve purchases land at once');
  const crowd = await Promise.all(Array.from({ length: 12 }, () => newUser()));
  await Promise.all(crowd.map((u) => grantLifetime(u.uid)));
  const seats = await Promise.all(crowd.map((u) => api('/founders/me', { token: u.token })));
  const numbers = seats.map((s) => s.body?.seat);
  check('every buyer got a seat', numbers.every((n) => typeof n === 'number'), JSON.stringify(numbers));
  check('no seat number was issued twice', new Set(numbers).size === numbers.length, JSON.stringify(numbers));
  // Every founder so far: ada, the impostor, b, c and the crowd. Their seats
  // must be exactly 1..N with no gap and no repeat, and the counter must be N.
  const everyone = [ada, impostor, b, c, ...crowd];
  const issued = (
    await Promise.all(everyone.map((u) => api('/founders/me', { token: u.token })))
  ).map((r) => r.body?.seat);
  const counter = await doc('counters/seats');
  const expected = Array.from({ length: everyone.length }, (_, i) => i + 1);
  check(
    'seats are exactly 1..N — no gaps, no repeats',
    JSON.stringify([...issued].sort((x, y) => x - y)) === JSON.stringify(expected),
    JSON.stringify(issued),
  );
  check('the counter equals N', counter?.taken === everyone.length, JSON.stringify(counter));

  console.log('\nTransfer: the purchase moves to another id, and the day moves with it');
  const eve = await newUser();
  await grantLifetime(eve.uid);
  await api('/founders/date/07-04', { token: eve.token, method: 'POST', body: { displayName: 'Eve Evans' } });
  const eveSeat = (await api('/founders/me', { token: eve.token })).body?.seat;
  const fay = await newUser();
  const moved = await webhook({ type: 'TRANSFER', transferred_from: [eve.uid], transferred_to: [fay.uid] });
  check('transfer accepted', moved.body?.action === 'transfer', JSON.stringify(moved));
  const fayMe = await api('/founders/me', { token: fay.token });
  check('the new account is a founder', fayMe.body?.lifetime === true);
  check('with the SAME seat number', fayMe.body?.seat === eveSeat, `${fayMe.body?.seat} vs ${eveSeat}`);
  check('and the same kept day', fayMe.body?.keptDate === '07-04');
  const keeper = await doc('keepers/07-04');
  check('the day now belongs to the new account', keeper?.uid === fay.uid, JSON.stringify(keeper));
  check('the old account holds nothing', (await doc(`entitlements/${eve.uid}`)) === null);

  console.log('\nTransfer from an anonymous purchase (bought before signing in)');
  const anon = '$RCAnonymousID:emulatortest';
  await grantLifetime(anon);
  const gus = await newUser();
  await webhook({ type: 'TRANSFER', transferred_from: [anon], transferred_to: [gus.uid] });
  const gusMe = await api('/founders/me', { token: gus.token });
  check('the signed-in account inherits the anonymous purchase', gusMe.body?.lifetime === true && typeof gusMe.body?.seat === 'number');

  console.log('\nRefund: the day goes back into the calendar');
  const refund = await webhook({
    type: 'REFUND',
    app_user_id: ada.uid,
    entitlement_ids: ['pro'],
    product_id: LIFETIME,
  });
  check('refund revokes', refund.body?.action === 'revoke');
  const adaRefunded = await api('/founders/me', { token: ada.token });
  check('no longer a founder', adaRefunded.body?.lifetime === false && adaRefunded.body?.seat === null);
  check('7 March is free again', (await api('/founders/date/03-07')).body?.free === true);

  console.log('\nAccount deletion');
  const holder = rb.body?.ok ? b : c;
  const del = await api('/account', { token: holder.token, method: 'DELETE' });
  check('delete accepted', del.status === 200, JSON.stringify(del));
  check('25 December is free again', (await api('/founders/date/12-25')).body?.free === true);
  check('the entitlement is gone', (await doc(`entitlements/${holder.uid}`)) === null);
  const gone = await lookupUser(holder.token);
  check('the sign-in account itself is gone', gone.status >= 400 || !gone.body?.users?.length, JSON.stringify(gone));
  // After a COMPLETE deletion the account no longer exists, so a retry is
  // answered as unauthenticated — the emulator checks the user behind a token;
  // production, which does not, answers 200 via `auth/user-not-found`. Either
  // is correct. What must never happen is a 500, or anything coming back.
  const retry = await api('/account', { token: holder.token, method: 'DELETE' });
  check(
    'deleting again neither errors nor resurrects anything',
    (retry.status === 200 || retry.status === 401) &&
      (await doc(`entitlements/${holder.uid}`)) === null,
    JSON.stringify(retry),
  );

  console.log('\nThe register the calendar reads agrees with the documents');
  const summary = (await api('/founders/dates', { token: fay.token })).body ?? {};
  const keepers = await collection('keepers');
  const fromDocs = Object.fromEntries(keepers.map((k) => [k.id, k.name]));
  check('same days, same names', JSON.stringify(Object.keys(summary).sort()) === JSON.stringify(Object.keys(fromDocs).sort()) && Object.entries(fromDocs).every(([k, v]) => summary[k] === v), `${JSON.stringify(summary)} vs ${JSON.stringify(fromDocs)}`);
  const anonymous = (await api('/founders/dates')).body ?? {};
  check('a reader with no account sees which days are kept, but not by whom', Object.keys(anonymous).length === Object.keys(fromDocs).length && Object.values(anonymous).every((v) => v === ''));

  console.log('\nThe launch gift: a week of Pro for the first 5,000');
  const open = (await api('/welcome')).body;
  check('anyone can see how many weeks are left', open?.remaining === 5000 && open?.mine === null, JSON.stringify(open));
  check('a signed-out reader cannot claim', (await api('/welcome', { method: 'POST' })).status === 401);
  const gia = await newUser();
  const g1 = (await api('/welcome', { token: gia.token, method: 'POST' })).body;
  check('the first claim is granted as #1', g1?.status === 'granted' && g1?.grant?.number === 1, JSON.stringify(g1));
  check('for exactly seven days', g1?.grant && g1.grant.endsAt - g1.grant.startedAt === 7 * 86_400_000);
  const g2 = (await api('/welcome', { token: gia.token, method: 'POST' })).body;
  check('claiming again returns the same week, not a new one', g2?.status === 'existing' && g2?.grant?.number === 1 && g2?.grant?.endsAt === g1?.grant?.endsAt);
  const rush = await Promise.all(Array.from({ length: 12 }, () => newUser()));
  const rushed = await Promise.all(rush.map((u) => api('/welcome', { token: u.token, method: 'POST' })));
  const giftNumbers = rushed.map((r) => r.body?.grant?.number).sort((x, y) => x - y);
  check('twelve at once get #2..#13 — no repeats, no gaps', JSON.stringify(giftNumbers) === JSON.stringify(Array.from({ length: 12 }, (_, i) => i + 2)), JSON.stringify(giftNumbers));
  const mineNow = (await api('/welcome', { token: gia.token })).body;
  check('a signed-in reader sees their own week', mineNow?.mine?.number === 1 && mineNow?.remaining === 5000 - 13, JSON.stringify(mineNow));
  check('the server reports its clock', typeof mineNow?.serverNow === 'number');
  await api('/account', { token: rush[0].token, method: 'DELETE' });
  check('deleting an account removes its week', (await doc(`welcome/${rush[0].uid}`)) === null);
  check('but never lowers the count — the cap is on weeks given, not held', (await doc('counters/welcome'))?.granted === 13);

  console.log(`\n${passes} passed, ${failures} failed`);
  process.exit(failures === 0 ? 0 : 1);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
