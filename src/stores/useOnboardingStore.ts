import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

/**
 * What the reader has already been shown once.
 *
 * `hydrated` is not a nicety here. Storage resolves a beat after the first
 * render, and a welcome card that defaults to VISIBLE would flash on every
 * launch for the life of the install — the most irritating possible bug in the
 * one component whose whole job is a good first impression. So the card asks
 * for hydration before it shows anything, and the cost of being wrong falls on
 * the first launch (a slightly late welcome) instead of on every launch after.
 */
interface OnboardingState {
  seenWelcome: boolean;
  hydrated: boolean;

  dismissWelcome: () => void;
  setHydrated: () => void;
  /** Developer affordance: see the first launch again without clearing storage. */
  resetOnboarding: () => void;
}

export const useOnboardingStore = create<OnboardingState>()(
  persist(
    (set) => ({
      seenWelcome: false,
      hydrated: false,

      dismissWelcome: () => set({ seenWelcome: true }),
      setHydrated: () => set({ hydrated: true }),
      resetOnboarding: () => set({ seenWelcome: false }),
    }),
    {
      name: 'history-unlocked.onboarding.v1',
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (s) => ({ seenWelcome: s.seenWelcome }),
      onRehydrateStorage: () => (state) => {
        state?.setHydrated();
      },
    },
  ),
);

/** True only when storage has answered AND it has never been shown. */
export const useShouldWelcome = () =>
  useOnboardingStore((s) => s.hydrated && !s.seenWelcome);
