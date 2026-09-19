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
  /**
   * Whether the reader has already been offered an account at launch.
   *
   * Separate from `seenWelcome` because the two happen at different moments
   * and answer different questions: this one is shown while the archive is
   * still downloading, the welcome card afterwards, over the loaded feed.
   * Once answered — either way — the launch screen stops asking and simply
   * shows the brand while the archive loads.
   */
  answeredLaunch: boolean;
  hydrated: boolean;

  dismissWelcome: () => void;
  answerLaunch: () => void;
  setHydrated: () => void;
  /** Developer affordance: see the first launch again without clearing storage. */
  resetOnboarding: () => void;
}

export const useOnboardingStore = create<OnboardingState>()(
  persist(
    (set) => ({
      seenWelcome: false,
      answeredLaunch: false,
      hydrated: false,

      dismissWelcome: () => set({ seenWelcome: true }),
      answerLaunch: () => set({ answeredLaunch: true }),
      setHydrated: () => set({ hydrated: true }),
      resetOnboarding: () => set({ seenWelcome: false, answeredLaunch: false }),
    }),
    {
      name: 'history-unlocked.onboarding.v1',
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (s) => ({ seenWelcome: s.seenWelcome, answeredLaunch: s.answeredLaunch }),
      onRehydrateStorage: () => (state) => {
        state?.setHydrated();
      },
    },
  ),
);

/** True only when storage has answered AND it has never been shown. */
export const useShouldWelcome = () =>
  useOnboardingStore((s) => s.hydrated && !s.seenWelcome);

/**
 * Whether the launch screen should wait for a choice rather than step aside.
 *
 * Hydration first, for the same reason the welcome card wants it: defaulting
 * to "ask" would stop every launch on a button the reader already answered.
 */
export const useShouldOfferAccount = () =>
  useOnboardingStore((s) => s.hydrated && !s.answeredLaunch);
