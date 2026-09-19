import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

import { palette } from '@/theme/tokens';

import { DailyReminderService, ScheduledBrief, dateKeyFromPayload } from './index';

export type { ScheduledBrief } from './index';
export { briefFor, dateKeyFromPayload } from './index';

/**
 * Daily reminder — the native implementation.
 *
 * Each day is scheduled as its OWN dated notification carrying that day's real
 * lead headline, rather than one repeating trigger with generic copy. A
 * repeating notification can only say "see what happened today", which is
 * ignored inside a week; "1941 — The attack on Pearl Harbor" is a reason to
 * open. The cost is that the schedule is finite and has to be topped up, which
 * the settings screen does on every launch.
 */

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: false,
    shouldSetBadge: false,
  }),
});

const ANDROID_CHANNEL = 'daily-brief';

async function ensureAndroidChannel(): Promise<void> {
  if (Platform.OS !== 'android') {
    return;
  }
  await Notifications.setNotificationChannelAsync(ANDROID_CHANNEL, {
    name: 'Daily brief',
    importance: Notifications.AndroidImportance.DEFAULT,
    lightColor: palette.accent,
    // No vibration: this is a reading prompt, not an alarm.
    vibrationPattern: [0],
  });
}

/** The next occurrence of `MM-DD` at the given local time, or null if past. */
function fireDateFor(dateKey: string, hour: number, minute: number): Date | null {
  const [month, day] = dateKey.split('-').map(Number);
  if (!month || !day) {
    return null;
  }
  const now = new Date();
  const candidate = new Date(now.getFullYear(), month - 1, day, hour, minute, 0, 0);
  if (candidate.getTime() <= now.getTime()) {
    // Only roll into next year for a date that has genuinely passed this one.
    candidate.setFullYear(now.getFullYear() + 1);
  }
  return candidate;
}

export const dailyReminders: DailyReminderService = {
  supported: true,

  requestPermission: async () => {
    const existing = await Notifications.getPermissionsAsync();
    if (existing.granted) {
      return true;
    }
    // `canAskAgain` false means the reader denied it in system settings; asking
    // again resolves instantly as denied rather than showing anything.
    if (!existing.canAskAgain) {
      return false;
    }
    const asked = await Notifications.requestPermissionsAsync();
    return asked.granted;
  },

  schedule: async (briefs: readonly ScheduledBrief[], hour: number, minute: number) => {
    await ensureAndroidChannel();
    // Replace rather than append: re-running this must never double up.
    await Notifications.cancelAllScheduledNotificationsAsync();

    for (const brief of briefs) {
      const date = fireDateFor(brief.dateKey, hour, minute);
      if (!date) {
        continue;
      }
      await Notifications.scheduleNotificationAsync({
        content: {
          title: brief.title,
          body: brief.headline,
          // The deep link the tap opens — the feed, on that day.
          data: { url: `/?date=${brief.dateKey}` },
        },
        trigger: {
          type: Notifications.SchedulableTriggerInputTypes.DATE,
          date,
          ...(Platform.OS === 'android' ? { channelId: ANDROID_CHANNEL } : {}),
        },
      });
    }
  },

  cancelAll: async () => {
    await Notifications.cancelAllScheduledNotificationsAsync();
  },
};

/**
 * Report the date of a tapped reminder.
 *
 * Both halves matter. The listener covers a tap while the app is alive or in
 * the background; `getLastNotificationResponseAsync` covers the cold start,
 * where the tap IS the launch and no listener could have been attached in time.
 * Without the second one, the most common case — a reminder tapped from a
 * locked phone in the morning — would still open the wrong day.
 */
export function subscribeToReminderTaps(onOpen: (dateKey: string) => void): () => void {
  let live = true;

  const deliver = (response: Notifications.NotificationResponse | null) => {
    if (!live || !response) {
      return;
    }
    const dateKey = dateKeyFromPayload(response.notification.request.content.data);
    if (dateKey) {
      onOpen(dateKey);
    }
  };

  void Notifications.getLastNotificationResponseAsync().then(deliver).catch(() => {});
  const subscription = Notifications.addNotificationResponseReceivedListener(deliver);

  return () => {
    live = false;
    subscription.remove();
  };
}
