import { readdirSync, readFileSync, statSync } from 'node:fs';
import path from 'node:path';

import { describe, expect, it } from 'vitest';

/**
 * A platform-split module must never import from the module it IS.
 *
 * Metro resolves `./index` to `index.native.ts` when one exists, so a native
 * file importing "the shared half" from `./index` is importing itself. Metro
 * follows the cycle until the stack runs out.
 *
 * Invisible to everything else: TypeScript resolves `./index` to `index.ts`
 * and is satisfied, ESLint sees an ordinary import, and the web build is
 * genuinely fine because there `./index` really is index.ts. It took the first
 * ever build on a phone to surface it — "Maximum call stack size exceeded" in
 * the notifications service — and the auth service had the same line sitting
 * unexecuted beside it.
 *
 * The fix in both cases was a third file with no platform twin (`shared.ts`,
 * `stubAuth.ts`), which cannot be shadowed. This test is the guard.
 */

const SRC = path.resolve(__dirname, '../src');

function walk(dir: string): string[] {
  return readdirSync(dir).flatMap((entry) => {
    const full = path.join(dir, entry);
    return statSync(full).isDirectory() ? walk(full) : [full];
  });
}

const platformFiles = walk(SRC).filter((f) => /\.(native|web|android|ios)\.tsx?$/.test(f));

describe('platform-split modules', () => {
  it('finds the platform files it is meant to police', () => {
    // A rename that empties this list would make every assertion below vacuous.
    expect(platformFiles.length).toBeGreaterThan(3);
  });

  it.each(platformFiles.map((f) => [path.relative(SRC, f), f]))(
    '%s does not import the module it is',
    (_label, file) => {
      const source = readFileSync(file, 'utf8');
      // "index.native.ts" -> "index"; the specifier that resolves back here.
      const own = path.basename(file).replace(/\.(native|web|android|ios)\.tsx?$/, '');
      const specifiers = [...source.matchAll(/from\s+'(\.[^']+)'/g)].map((m) => m[1]!);

      for (const specifier of specifiers) {
        const resolved = path.basename(specifier);
        expect(
          resolved === own,
          `imports '${specifier}', which on this platform resolves to itself — move the shared code to a file with no platform twin`,
        ).toBe(false);
      }
    },
  );
});
