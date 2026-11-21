import { router } from 'expo-router';
import { Alert } from 'react-native';

import { errorMessage } from '@/lib/format';
import { useBlockUser } from '@/lib/safety';
import type { ReportTarget } from '@/lib/types';

export type ReportParams = {
  type: ReportTarget;
  id: string;
  userId?: string;
  name?: string;
};

// Hikâye, etkinlik ve sohbet ekranlarında ortak "Bildir" ve "Engelle" işlemleri
export function useSafetyActions() {
  const block = useBlockUser();

  const openReport = (params: ReportParams) =>
    router.push({ pathname: '/report', params: { ...params } });

  const confirmBlock = (user: { id: string; name: string }, onBlocked?: () => void) =>
    Alert.alert(
      `${user.name} engellensin mi?`,
      'Birbirinizin hikâyelerini, etkinliklerini ve mesajlarını görmeyeceksiniz. Arkadaşlığınız da kaldırılır. Engeli Ayarlar > Engellenen kişiler bölümünden kaldırabilirsin.',
      [
        { text: 'Vazgeç', style: 'cancel' },
        {
          text: 'Engelle',
          style: 'destructive',
          onPress: () =>
            block.mutate(user.id, {
              onSuccess: () => onBlocked?.(),
              onError: (error) => Alert.alert('Engellenemedi', errorMessage(error)),
            }),
        },
      ],
    );

  return { openReport, confirmBlock };
}
