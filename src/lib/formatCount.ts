/**
 * Thousands separators, fixed to English.
 *
 * `Number.prototype.toLocaleString()` with no argument follows the DEVICE's
 * language: 8056 comes out as "8.056" on a German phone and "8 056" on a
 * French one, inside screens that are otherwise entirely in English. The app
 * ships in one language, so its numbers are written in one language too.
 */
export function formatCount(value: number): string {
  return Math.trunc(value)
    .toString()
    .replace(/\B(?=(\d{3})+(?!\d))/g, ',');
}
