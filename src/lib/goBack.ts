import type { useRouter } from 'expo-router';

type Router = ReturnType<typeof useRouter>;

/**
 * Go back, or to the feed when there is nowhere to go back to.
 *
 * Every screen in the app is reached from the feed, so `router.back()` is
 * almost always right — but "almost" is doing real work there. A notification
 * deep link, a shared `/e/<id>` URL, a browser address bar and a cold start on
 * a restored route all open a screen with an EMPTY history stack, and a bare
 * back() on those does nothing at all: the button is visibly dead, or on web it
 * logs "GO_BACK was not handled" and the reader is stuck on a screen with no
 * way out. Both were reproduced here.
 *
 * One helper rather than the check inlined ten times, because the version that
 * gets forgotten is the one written out by hand.
 */
export function goBack(router: Router): void {
  if (router.canGoBack()) {
    router.back();
  } else {
    router.replace('/');
  }
}
