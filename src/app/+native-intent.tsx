/**
 * Where an incoming link lands, before Expo Router tries to route it.
 *
 * Firebase's email sign-in link opens the app as
 * `https://history-unlocked-fa9a9.firebaseapp.com/__/auth/links?link=…` — the
 * route since Dynamic Links shut down in August 2025, and the reason app.json
 * now carries an App Links intent filter for that host. Without this file the
 * router takes the path literally, finds no `/__/auth/links` screen, and shows
 * "Unmatched Route" to somebody who has just signed in.
 *
 * Only the NAVIGATION is redirected. Completing the sign-in is done by the root
 * layout from `Linking.useURL()`, which reads the raw link from React Native's
 * own Linking events — those are delivered to every listener, independent of
 * what the router decides to render.
 *
 * Every other path passes through untouched, so shared `/e/<id>` links and the
 * `historyunlocked://` scheme behave exactly as before. Anything that fails to
 * parse also passes through: a link this function cannot read is still better
 * handed to the router than silently dropped.
 */
export function redirectSystemPath({ path }: { path: string; initial: boolean }): string {
  try {
    const url = new URL(path, 'historyunlocked://app');
    if (url.pathname.startsWith('/__/auth/')) {
      return '/';
    }
  } catch {
    // Unparseable — fall through to the router as-is.
  }
  return path;
}
