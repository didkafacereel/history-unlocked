import { describe, expect, it, vi } from 'vitest';

import { goBack } from '@/lib/goBack';

/**
 * `goBack` exists because of a bug that was reproduced twice, and it had no
 * test at all.
 *
 * A notification deep link, a shared `/e/<id>` URL, a browser address bar and a
 * cold start on a restored route all open a screen with an EMPTY history stack.
 * A bare `router.back()` on those does nothing: the button is visibly dead, or
 * on web it logs "GO_BACK was not handled" and the reader is stuck on a screen
 * with no way out.
 *
 * Every back button in the app routes through this one function, so a
 * regression here is a regression everywhere at once — which is exactly the
 * kind of thing that should not rest on a comment asking politely.
 */

type Router = Parameters<typeof goBack>[0];

function fakeRouter(canGoBack: boolean) {
  const back = vi.fn();
  const replace = vi.fn();
  const router = { canGoBack: () => canGoBack, back, replace } as unknown as Router;
  return { router, back, replace };
}

describe('goBack', () => {
  it('goes back when there is somewhere to go back to', () => {
    const { router, back, replace } = fakeRouter(true);
    goBack(router);
    expect(back).toHaveBeenCalledOnce();
    expect(replace).not.toHaveBeenCalled();
  });

  it('falls back to the feed when the stack is empty', () => {
    // The deep-link case. Without this the button does nothing at all.
    const { router, back, replace } = fakeRouter(false);
    goBack(router);
    expect(back).not.toHaveBeenCalled();
    expect(replace).toHaveBeenCalledWith('/');
  });

  it('never does both', () => {
    for (const canGoBack of [true, false]) {
      const { router, back, replace } = fakeRouter(canGoBack);
      goBack(router);
      expect(back.mock.calls.length + replace.mock.calls.length).toBe(1);
    }
  });
});
