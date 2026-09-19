import { create } from 'zustand';

import { AuthUser, getAuthService } from '@/services/auth';
import { getPurchaseService } from '@/services/purchases';
import { useQuizHistoryStore } from '@/stores/useQuizHistoryStore';

/**
 * Who is signed in.
 *
 * Not persisted. The provider is the source of truth and answers instantly from
 * its own cached session, so keeping a second copy here would only create a
 * state that can disagree with it — a signed-out reader still showing an
 * account, which is the exact failure that makes people distrust an app with
 * their purchase.
 *
 * Signing in re-keys billing to the account, which is the whole point: without
 * it, entitlement and founder standing stay attached to the handset.
 */
interface AuthState {
  user: AuthUser | null;
  busy: boolean;
  /** Set once a check has completed, so the UI can tell "no" from "not yet". */
  loaded: boolean;
  error: 'unavailable' | 'failed' | null;

  refresh: () => Promise<void>;
  signIn: () => Promise<boolean>;
  signOut: () => Promise<void>;
}

/**
 * Tell RevenueCat which account this is. Best-effort: a reader who signed in
 * but whose billing alias failed is still signed in, and the next launch tries
 * again — failing the sign-in over it would be the worse outcome.
 */
async function linkBilling(user: AuthUser | null): Promise<void> {
  const service = getPurchaseService();
  try {
    if (user) {
      await service.logIn?.(user.id);
    } else {
      await service.logOut?.();
    }
  } catch {
    // Intentionally swallowed; see above.
  }
}

/**
 * Point everything account-scoped at whoever is signed in.
 *
 * Called on every path that settles the user — the silent check at launch as
 * well as an explicit sign-in — because a reader who was already signed in when
 * the app opened must get their own history, not the device's.
 */
function scopeToAccount(user: AuthUser | null): void {
  useQuizHistoryStore.getState().switchAccount(user?.id ?? null);
}

export const useAuthStore = create<AuthState>()((set, get) => ({
  user: null,
  busy: false,
  loaded: false,
  error: null,

  refresh: async () => {
    if (get().busy) {
      return;
    }
    set({ busy: true });
    try {
      const user = await getAuthService().getUser();
      set({ user, loaded: true });
      scopeToAccount(user);
    } finally {
      set({ busy: false });
    }
  },

  signIn: async () => {
    set({ busy: true, error: null });
    try {
      const result = await getAuthService().signIn();
      if (!result.ok) {
        // A cancelled sign-in is a decision, not an error, and gets no message.
        set({ error: result.reason === 'cancelled' ? null : result.reason });
        return false;
      }
      set({ user: result.user, loaded: true });
      scopeToAccount(result.user);
      await linkBilling(result.user);
      return true;
    } finally {
      set({ busy: false });
    }
  },

  signOut: async () => {
    set({ busy: true });
    try {
      await getAuthService().signOut();
      set({ user: null, loaded: true, error: null });
      scopeToAccount(null);
      await linkBilling(null);
    } finally {
      set({ busy: false });
    }
  },
}));
