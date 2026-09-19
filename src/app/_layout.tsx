import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import { StyleSheet } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';

import { useEntitlementStore } from '@/stores/useEntitlementStore';
import { useAuthStore } from '@/stores/useAuthStore';
import { useFoundersStore } from '@/stores/useFoundersStore';
import { useReminderStore } from '@/stores/useReminderStore';
import { palette } from '@/theme/tokens';

/**
 * Root layout: routes only, zero feature logic. The app is permanently
 * immersive-dark — imagery supplies the color, chrome stays out of the way.
 */
export default function RootLayout() {
  // Reconcile Pro entitlement once at launch (configure provider, read status).
  useEffect(() => {
    void useEntitlementStore.getState().hydrate();
  }, []);

  // Top up the reminder schedule. Each day is scheduled individually so it can
  // carry that day's real headline, which means the horizon runs down and has
  // to be refilled — a launch is the only reliable moment to do it.
  useEffect(() => {
    void useReminderStore.getState().refresh();
  }, []);

  // Founder standing is the server's to know, never cached on the device — so
  // it is read fresh each launch rather than persisted and trusted.
  useEffect(() => {
    void useFoundersStore.getState().refresh();
  }, []);

  // Restore the signed-in account silently. This never shows a prompt: a reader
  // who has not signed in simply stays anonymous.
  useEffect(() => {
    void useAuthStore.getState().refresh();
  }, []);

  return (
    <GestureHandlerRootView style={styles.root}>
      <StatusBar style="light" />
      <Stack
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: palette.void },
          animation: 'fade',
        }}
      >
        <Stack.Screen name="paywall" options={{ presentation: 'modal' }} />
        <Stack.Screen name="calendar" options={{ presentation: 'modal' }} />
      </Stack>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: palette.void,
  },
});
