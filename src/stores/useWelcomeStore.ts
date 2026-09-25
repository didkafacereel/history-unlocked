import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

import { getAuthService } from '@/services/auth';
import { getWelcomeService, WelcomeGrant } from '@/services/welcome';
import { useEntitlementStore } from '@/stores/useEntitlementStore';

/**
 * The launch gift, as the app sees it: how many weeks are left, whether this
 * reader has one, and whether they have been told.
 *
 * `unseen` is persisted on purpose. The gift is granted the instant the reader
 * signs in; if the app is closed before the greeting shows, it must show on
 * the next launch — finding out a week later, in a changed paywall, would
 * waste the one moment the gift is worth the most.
 */
interface WelcomeState {
  remaining: number | null;
  grant: WelcomeGrant | null;
  unseen: boolean;

  /** Read the count, and this reader's week; claim it if they have none yet. */
  refresh: () => Promise<void>;
  /** Claim after a sign-in. Safe to call repeatedly — the server is idempotent. */
  claim: () => Promise<void>;
  markSeen: () => void;
  /** Forget the week on this phone — it belongs to the account, not the device. */
  reset: () => void;
}

export const useWelcomeStore = create<WelcomeState>()(
  persist(
    (set, get) => {
      const apply = (grant: WelcomeGrant | null, serverNow: number | null) => {
        const offset = serverNow === null ? useEntitlementStore.getState().clockOffset : serverNow - Date.now();
        useEntitlementStore.getState().setTrial(grant?.endsAt ?? null, offset);
      };

      return {
        remaining: null,
        grant: null,
        unseen: false,

        refresh: async () => {
          const status = await getWelcomeService().status();
          if (status.remaining !== null) {
            set({ remaining: status.remaining });
          }
          if (status.mine) {
            set({ grant: status.mine });
            apply(status.mine, status.serverNow);
            return;
          }
          // Signed in, no week yet, weeks left: the reader signed in before the
          // gift existed, or the claim after sign-in failed on a bad network.
          // Either way they are owed it.
          const signedIn = (await getAuthService().getUser()) !== null;
          if (signedIn && (status.remaining ?? 0) > 0) {
            await get().claim();
          }
        },

        claim: async () => {
          const result = await getWelcomeService().claim();
          if (result.status === 'unavailable') {
            return;
          }
          set({ remaining: result.remaining });
          if (result.status === 'sold-out') {
            return;
          }
          set({ grant: result.grant, unseen: result.status === 'granted' ? true : get().unseen });
          apply(result.grant, result.serverNow);
        },

        markSeen: () => set({ unseen: false }),

        reset: () => {
          set({ grant: null, unseen: false });
          useEntitlementStore.getState().setTrial(null, useEntitlementStore.getState().clockOffset);
        },
      };
    },
    {
      name: 'history-unlocked.welcome.v1',
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (state) => ({ grant: state.grant, unseen: state.unseen }),
    },
  ),
);
