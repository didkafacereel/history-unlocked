/**
 * Whether the reader has Pro right now: bought it, or inside their gift week.
 *
 * Pure, and the only place the two are combined, so "is this reader Pro?" has
 * one answer everywhere. `clockOffset` is server time minus phone time, taken
 * when the server last answered — so a phone whose date was moved forward does
 * not end the week early, and one moved backward does not stretch it.
 */
export function hasProAccess(input: {
  purchased: boolean;
  trialEndsAt: number | null;
  now: number;
  clockOffset: number;
}): boolean {
  if (input.purchased) return true;
  if (input.trialEndsAt === null) return false;
  return input.now + input.clockOffset < input.trialEndsAt;
}
