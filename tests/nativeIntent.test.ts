import { describe, expect, it } from 'vitest';

import { redirectSystemPath } from '@/app/+native-intent';

/**
 * Firebase's email sign-in link opens the app on `/__/auth/links`, a path no
 * screen exists for. Without the redirect the router showed "Unmatched Route"
 * to a reader who had just signed in. Everything else must pass through as-is.
 */
describe('redirectSystemPath', () => {
  it('sends the Firebase email link to the feed, full URL form', () => {
    expect(
      redirectSystemPath({
        path: 'https://history-unlocked-fa9a9.firebaseapp.com/__/auth/links?link=https%3A%2F%2Fx',
        initial: true,
      }),
    ).toBe('/');
  });

  it('sends it to the feed when only the path arrives', () => {
    expect(redirectSystemPath({ path: '/__/auth/links?link=abc', initial: false })).toBe('/');
  });

  it('leaves a shared event link alone', () => {
    expect(redirectSystemPath({ path: '/e/abc123', initial: true })).toBe('/e/abc123');
  });

  it('leaves the app scheme alone', () => {
    const path = 'historyunlocked://keep-a-day?date=03-07';
    expect(redirectSystemPath({ path, initial: false })).toBe(path);
  });

  it('passes through anything it cannot parse rather than dropping it', () => {
    expect(redirectSystemPath({ path: '', initial: true })).toBe('');
  });
});
