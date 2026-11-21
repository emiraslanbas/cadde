// Anlık bildirimler: cihazı Expo Push'a kaydeder, bildirime dokununca ilgili ekranı açar.
// Bildirimleri veritabanındaki tetikleyiciler gönderir (bkz. supabase/migrations/*_magaza_hazirligi.sql).
// Not: Expo Go'da uzaktan bildirim yok; development build ya da mağaza sürümü gerekir.
import Constants, { ExecutionEnvironment } from 'expo-constants';
import * as Notifications from 'expo-notifications';
import { router, type Href } from 'expo-router';
import { useEffect } from 'react';
import { Platform } from 'react-native';

import { supabase } from '@/lib/supabase';

const ANDROID_CHANNEL_ID = 'default';

let currentToken: string | null = null;

const pushSupported = () =>
  Platform.OS !== 'web' && Constants.executionEnvironment !== ExecutionEnvironment.StoreClient;

const projectId = () =>
  (Constants.expoConfig?.extra?.eas?.projectId as string | undefined) ?? Constants.easConfig?.projectId;

if (Platform.OS !== 'web') {
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldPlaySound: true,
      shouldSetBadge: false,
      shouldShowBanner: true,
      shouldShowList: true,
    }),
  });
}

export type PushRegistration = 'registered' | 'denied' | 'unsupported';

// ask=false: yalnızca izin daha önce verildiyse kaydeder (açılışta sessizce çağrılır)
export async function registerForPush(ask: boolean): Promise<PushRegistration> {
  if (!pushSupported()) return 'unsupported';

  if (Platform.OS === 'android') {
    // Android 13+ izin penceresi en az bir kanal olmadan çıkmaz
    await Notifications.setNotificationChannelAsync(ANDROID_CHANNEL_ID, {
      name: 'Cadde',
      importance: Notifications.AndroidImportance.HIGH,
    });
  }

  let { granted } = await Notifications.getPermissionsAsync();
  if (!granted && ask) {
    ({ granted } = await Notifications.requestPermissionsAsync());
  }
  if (!granted) return 'denied';

  const id = projectId();
  if (!id) return 'unsupported';

  const { data: token } = await Notifications.getExpoPushTokenAsync({ projectId: id });
  const { error } = await supabase.rpc('register_push_token', { push_token: token });
  if (error) throw error;
  currentToken = token;
  return 'registered';
}

// Çıkışta ya da hesap silinirken bu cihaza bildirim gitmesin
export async function unregisterPushToken() {
  if (!currentToken) return;
  const token = currentToken;
  currentToken = null;
  const { error } = await supabase.rpc('unregister_push_token', { push_token: token });
  if (error) throw error;
}

const openFromNotification = (response: Notifications.NotificationResponse | null) => {
  const url = response?.notification.request.content.data?.url;
  if (typeof url === 'string' && url.startsWith('/')) router.push(url as Href);
};

// Oturum açıkken: cihazı kaydet ve bildirime dokunulunca ilgili sohbet / etkinliği aç
export function usePushNotifications(signedIn: boolean) {
  useEffect(() => {
    if (!signedIn || Platform.OS === 'web') return;

    registerForPush(false).catch(() => {
      // Kayıt başarısız olursa uygulama bildirimsiz çalışmaya devam eder
    });

    Notifications.getLastNotificationResponseAsync().then(openFromNotification).catch(() => {});
    const subscription = Notifications.addNotificationResponseReceivedListener(openFromNotification);
    return () => subscription.remove();
  }, [signedIn]);
}
