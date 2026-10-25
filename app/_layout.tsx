import { QueryClientProvider } from '@tanstack/react-query';
import { useFonts } from 'expo-font';
import { DefaultTheme, Stack, ThemeProvider } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { useEffect } from 'react';
import 'react-native-reanimated';

import { queryClient } from '@/lib/api';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/store/auth';

export {
  // Catch any errors thrown by the Layout component.
  ErrorBoundary,
} from 'expo-router';

export const unstable_settings = {
  initialRouteName: '(tabs)',
};

// Prevent the splash screen from auto-hiding before asset loading is complete.
SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const [loaded, error] = useFonts({
    SpaceMono: require('../assets/fonts/SpaceMono-Regular.ttf'),
  });
  const authReady = useAuth((s) => s.ready);
  const setSession = useAuth((s) => s.setSession);

  // Expo Router uses Error Boundaries to catch errors in the navigation tree.
  useEffect(() => {
    if (error) throw error;
  }, [error]);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setSession(data.session));
    const { data } = supabase.auth.onAuthStateChange((event, session) => {
      // Çıkış yapınca önceki kullanıcının verisi ekranda kalmasın
      if (event === 'SIGNED_OUT') queryClient.clear();
      setSession(session);
    });
    return () => data.subscription.unsubscribe();
  }, [setSession]);

  useEffect(() => {
    if (loaded && authReady) {
      SplashScreen.hideAsync();
    }
  }, [loaded, authReady]);

  if (!loaded || !authReady) {
    return null;
  }

  return (
    <QueryClientProvider client={queryClient}>
      <RootLayoutNav />
    </QueryClientProvider>
  );
}

function RootLayoutNav() {
  const signedIn = useAuth((s) => !!s.session);

  return (
    <ThemeProvider value={DefaultTheme}>
      <Stack>
        <Stack.Protected guard={signedIn}>
          <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
          <Stack.Screen name="story/new" options={{ headerShown: false, presentation: 'fullScreenModal' }} />
          <Stack.Screen
            name="story/[id]"
            options={{ headerShown: false, presentation: 'fullScreenModal', animation: 'fade' }}
          />
          <Stack.Screen name="event/new" options={{ title: 'Yeni etkinlik', presentation: 'modal' }} />
          <Stack.Screen name="event/[id]" options={{ title: 'Etkinlik', headerBackTitle: 'Geri' }} />
          <Stack.Screen name="chat/[id]" options={{ title: 'Sohbet', headerBackTitle: 'Geri' }} />
          <Stack.Screen name="profile/edit" options={{ title: 'Profili düzenle', presentation: 'modal' }} />
        </Stack.Protected>

        <Stack.Protected guard={!signedIn}>
          <Stack.Screen name="sign-in" options={{ headerShown: false }} />
          <Stack.Screen name="sign-up" options={{ title: 'Hesap oluştur', headerBackTitle: 'Geri' }} />
        </Stack.Protected>
      </Stack>
    </ThemeProvider>
  );
}
