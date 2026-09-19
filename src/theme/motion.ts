import { WithSpringConfig } from 'react-native-reanimated';

/**
 * THE kinetic vocabulary. Every spring in the app comes from here so the
 * whole product shares one physical feel. Do not inline spring configs.
 */

/** Card settle after a swipe — critically damped, Shorts-like snap. */
export const swipeSpring: WithSpringConfig = {
  damping: 30,
  stiffness: 280,
  mass: 0.7,
  overshootClamping: false,
  // Reanimated 4 rest criterion — slightly loose so settle callbacks fire fast.
  energyThreshold: 6e-3,
};

/** Rubber-band return when the user drags past either end of the deck. */
export const edgeSpring: WithSpringConfig = {
  damping: 24,
  stiffness: 320,
  mass: 0.6,
};

/** Tactile press feedback (PressableScale). */
export const pressSpring: WithSpringConfig = {
  damping: 18,
  stiffness: 420,
  mass: 0.5,
};

/** Tactical overlay sheet entrance/snap — weightier than a card settle. */
export const sheetSpring: WithSpringConfig = {
  damping: 32,
  stiffness: 300,
  mass: 0.8,
  energyThreshold: 6e-3,
};

/** Drag-to-dismiss decision thresholds for the tactical sheet. */
export const sheetThresholds = {
  /** px the sheet must be dragged down to commit a dismiss. */
  dismissDistance: 120,
  /** px/s downward fling that commits a dismiss regardless of distance. */
  dismissVelocity: 800,
  /** Drag resistance divisor when pulling the open sheet further upward. */
  upwardResistance: 8,
} as const;

/** Gesture decision thresholds for the Chronos Feed. */
export const swipeThresholds = {
  /** Fraction of screen height the drag must travel to commit a card change. */
  distanceRatio: 0.22,
  /** px/s fling velocity that commits a card change regardless of distance. */
  velocity: 700,
  /** Drag resistance divisor when pulling past the first/last card. */
  edgeResistance: 3,
} as const;

/** Parallax/scale treatment of the outgoing card during a swipe. */
export const cardDepth = {
  minScale: 0.94,
  minOpacity: 0.55,
  backdropParallax: 0.18,
} as const;
