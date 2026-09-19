import { memo, useMemo } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, { Keyframe } from 'react-native-reanimated';

import { palette, radius } from '@/theme/tokens';

/**
 * Particle burst for perfect quizzes (and future rank-ups). Mount it and it
 * fires once: each particle is a Keyframe entering animation — fully
 * declarative, no effects, no shared-value bookkeeping.
 */
const PARTICLE_COUNT = 14;
const COLORS = [palette.accent, palette.streakFlame, palette.correct] as const;

export const CelebrationBurst = memo(function CelebrationBurst() {
  const particles = useMemo(
    () =>
      Array.from({ length: PARTICLE_COUNT }, (_, i) => {
        const angle = (i / PARTICLE_COUNT) * Math.PI * 2;
        const distance = 80 + (i % 3) * 34;
        return {
          id: i,
          dx: Math.cos(angle) * distance,
          dy: Math.sin(angle) * distance,
          color: COLORS[i % COLORS.length] ?? palette.accent,
          delay: (i % 5) * 40,
          size: 6 + (i % 3) * 3,
        };
      }),
    [],
  );

  return (
    <View style={styles.stage} pointerEvents="none">
      {particles.map((p) => {
        const flight = new Keyframe({
          0: {
            transform: [{ translateX: 0 }, { translateY: 0 }, { scale: 0 }],
            opacity: 1,
          },
          55: {
            transform: [{ translateX: p.dx * 0.8 }, { translateY: p.dy * 0.8 }, { scale: 1.15 }],
            opacity: 1,
          },
          100: {
            transform: [{ translateX: p.dx }, { translateY: p.dy }, { scale: 0.4 }],
            opacity: 0,
          },
        })
          .duration(820)
          .delay(p.delay);

        return (
          <Animated.View
            key={p.id}
            entering={flight}
            style={[
              styles.particle,
              { width: p.size, height: p.size, backgroundColor: p.color },
            ]}
          />
        );
      })}
    </View>
  );
});

const styles = StyleSheet.create({
  stage: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    alignItems: 'center',
    justifyContent: 'center',
  },
  particle: {
    position: 'absolute',
    borderRadius: radius.pill,
    opacity: 0,
  },
});
