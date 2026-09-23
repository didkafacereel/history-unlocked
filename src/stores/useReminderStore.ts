import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

import { planDeck } from '@/data/deckPlan';
import { loadDailyDeck } from '@/data/ingestion';
import { briefFor, dailyReminders, ScheduledBrief } from '@/services/notifications';
import { makeDateKey } from '@/lib/dateKey';

/**
 * The daily reminder — one notification, at a time the reader chooses.
 *
 * This is the app's habit engine and it did not exist. Everything else assumes
 * the reader remembers to open a calendar-shaped product every day, which is
 * the assumption that quietly kills them.
 *
 * Deliberately ONE a day, at a fixed hour. A second reminder is the difference
 * between a habit and a nuisance, and the fastest way to have notifications
 * turned off entirely — after which no amount of content can reach anyone.
 */

/**
 * How many days ahead to schedule. Each is a real headline, so they run out.
 *
 * Thirty, not ten, and the reason is the failure mode rather than the feature.
 * The horizon is topped up on launch, so it only runs down for a reader who has
 * stopped opening the app — which is precisely the reader the reminder exists
 * to reach. At ten days the habit engine switched itself off after a week and a
 * half of silence, exactly when it was the only thing left.
 *
 * Thirty is the largest number that is safe on both platforms without thinking
 * about it: iOS allows 64 pending notifications and Android is scheduling that
 * many exact alarms. Past that this wants push from the server rather than a
 * longer list on the device, which is now possible — Firebase is here — and is
 * a bigger piece of work than a constant.
 */
const HORIZON_DAYS = 30;

interface ReminderState {
  enabled: boolean;
  hour: number;
  minute: number;
  /** Last "YYYY-MM-DD" the schedule was topped up, so launches are cheap. */
  lastScheduled: string | null;
  /**
   * Whether the reader has been ASKED — once, after their first daily quiz.
   *
   * Persisted, and set whatever they answered. Asking again after "not now" is
   * how an app teaches people to dismiss it; the toggle in the profile stays
   * for anyone who changes their mind.
   */
  offered: boolean;

  setEnabled: (enabled: boolean) => Promise<boolean>;
  markOffered: () => void;
  setTime: (hour: number, minute: number) => Promise<void>;
  /** Re-fill the horizon. Safe and cheap to call on every launch. */
  refresh: () => Promise<void>;
}

/** The next `HORIZON_DAYS` dates, with each day's lead as the copy. */
async function upcomingBriefs(): Promise<ScheduledBrief[]> {
  const briefs: ScheduledBrief[] = [];
  const cursor = new Date();

  for (let i = 0; i < HORIZON_DAYS; i++) {
    const dateKey = makeDateKey(cursor.getMonth() + 1, cursor.getDate());
    try {
      const { events } = await loadDailyDeck(dateKey);
      // Plan as a Pro reader would: the notification should name the day's true
      // lead, not the strongest of a free reader's three.
      const plan = planDeck(events, { isPro: true, seen: {} });
      const brief = briefFor(dateKey, plan.events);
      if (brief) {
        briefs.push(brief);
      }
    } catch {
      // A day we cannot read is a day we do not promise anything about.
    }
    cursor.setDate(cursor.getDate() + 1);
  }

  return briefs;
}

function todayIso(): string {
  const now = new Date();
  return `${now.getFullYear()}-${makeDateKey(now.getMonth() + 1, now.getDate())}`;
}

export const useReminderStore = create<ReminderState>()(
  persist(
    (set, get) => ({
      enabled: false,
      hour: 8,
      minute: 0,
      lastScheduled: null,
      offered: false,

      markOffered: () => set({ offered: true }),

      setEnabled: async (enabled) => {
        if (!enabled) {
          await dailyReminders.cancelAll();
          set({ enabled: false, lastScheduled: null });
          return false;
        }

        const granted = await dailyReminders.requestPermission();
        if (!granted) {
          // Stay off rather than showing a toggle that lies: the OS said no.
          set({ enabled: false });
          return false;
        }

        set({ enabled: true, lastScheduled: null });
        await get().refresh();
        return true;
      },

      setTime: async (hour, minute) => {
        set({ hour, minute, lastScheduled: null });
        if (get().enabled) {
          await get().refresh();
        }
      },

      refresh: async () => {
        const { enabled, hour, minute, lastScheduled } = get();
        if (!enabled || !dailyReminders.supported) {
          return;
        }
        const today = todayIso();
        if (lastScheduled === today) {
          return;
        }

        const briefs = await upcomingBriefs();
        await dailyReminders.schedule(briefs, hour, minute);
        set({ lastScheduled: today });
      },
    }),
    {
      name: 'history-unlocked.reminder.v1',
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (state) => ({
        enabled: state.enabled,
        hour: state.hour,
        minute: state.minute,
        lastScheduled: state.lastScheduled,
        offered: state.offered,
      }),
    },
  ),
);

/** Human-readable reminder time, e.g. "08:00". */
export function formatReminderTime(hour: number, minute: number): string {
  return `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`;
}
