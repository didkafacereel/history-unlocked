/**
 * Design tokens — the only place raw color/spacing values may appear.
 * Components must consume these tokens, never literals.
 */
export const palette = {
  // The feed is permanently immersive-dark; imagery provides the color.
  void: '#06070A',
  ink: '#0C0E14',
  inkRaised: '#141826',

  textPrimary: '#F4F6FB',
  textSecondary: 'rgba(244, 246, 251, 0.72)',
  textTertiary: 'rgba(244, 246, 251, 0.48)',

  // Brand accent — "intel amber", used sparingly for tactical affordances.
  accent: '#F5B73B',
  accentDim: 'rgba(245, 183, 59, 0.16)',

  // Gamification signals.
  streakFlame: '#FF6B35',
  correct: '#3DDC84',
  incorrect: '#FF5470',

  // Translucent surfaces (GlassPanel). Deliberately NOT a BlurView:
  // blur on the swipe hot path costs frames on mid-range Android.
  glass: 'rgba(10, 12, 20, 0.62)',
  glassBorder: 'rgba(244, 246, 251, 0.10)',

  scrimTop: 'rgba(6, 7, 10, 0.55)',
  /**
   * Mid-stop of the bottom scrim. Archival paintings and photographs are far
   * brighter than the dark stock imagery the feed was first tuned against, so
   * the gradient has to start biting well above the text block.
   */
  scrimMid: 'rgba(6, 7, 10, 0.72)',
  scrimBottom: 'rgba(6, 7, 10, 0.92)',
} as const;

export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  xxl: 32,
  xxxl: 48,
} as const;

export const radius = {
  sm: 8,
  md: 14,
  lg: 20,
  xl: 28,
  pill: 999,
} as const;

export const hitSlop = { top: 12, bottom: 12, left: 12, right: 12 } as const;
