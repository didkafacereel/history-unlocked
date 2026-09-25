import * as Linking from 'expo-linking';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import { AppState, StyleSheet } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';

import { useEntitlementStore } from '@/stores/useEntitlementStore';
import { useAuthStore } from '@/stores/useAuthStore';
import { useFoundersStore } from '@/stores/useFoundersStore';
import { useReminderStore } from '@/stores/useReminderStore';
import { useWelcomeStore } from '@/stores/useWelcomeStore';
import { WelcomeGift } from '@/components/welcome/WelcomeGift';
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
  // who has not signed in simply stays anonymous. The gift week is read only
  // AFTER, because it needs to know who is signed in — and a reader who signed
  // in before the gift existed is claimed for here.
  useEffect(() => {
    void useAuthStore
      .getState()
      .refresh()
      .then(() => useWelcomeStore.getState().refresh())
      .catch(() => {});
  }, []);

  // A gift week can end while the app sits in the background; look again each
  // time it comes back to the front.
  useEffect(() => {
    const subscription = AppState.addEventListener('change', (next) => {
      if (next === 'active') {
        useEntitlementStore.getState().recompute();
      }
    });
    return () => subscription.remove();
  }, []);

  // A tapped email sign-in link, whether it cold-started the app or arrived
  // while it was open. `useURL` covers both; without the cold-start half the
  // link would work only for a reader who already had the app in front of
  // them, which is the rarer case.
  //
  // Every other incoming URL falls through untouched — the service checks that
  // this is actually a Firebase sign-in link before doing anything with it, so
  // a shared event link never reaches the auth path.
  const incomingUrl = Linking.useURL();
  useEffect(() => {
    if (!incomingUrl) {
      return;
    }
    void useAuthStore.getState().completeEmailLink(incomingUrl);
  }, [incomingUrl]);

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
      {/* Above every screen: the gift is granted by whichever sign-in happened —
          launch screen, profile, the paywall's gate, an email link — and the
          greeting has to find the reader wherever they are. */}
      <WelcomeGift />
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: palette.void,
  },
});
