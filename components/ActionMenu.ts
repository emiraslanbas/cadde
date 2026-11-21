import { ActionSheetIOS, Alert, Platform } from 'react-native';

export type MenuAction = { label: string; destructive?: boolean; onPress: () => void };

const CANCEL = 'Vazgeç';
// Android uyarı penceresi en fazla 3 düğme gösterir (Vazgeç dahil)
const ANDROID_MAX_ACTIONS = 2;

// iOS'ta yerel alt menü, Android'de seçenekli uyarı penceresi açar
// onDismiss: menü bir seçim yapılmadan kapatılınca çağrılır
export function showActionMenu(title: string | undefined, actions: MenuAction[], onDismiss?: () => void) {
  if (Platform.OS === 'ios') {
    const labels = [...actions.map((a) => a.label), CANCEL];
    const destructiveButtonIndex = actions.flatMap((a, i) => (a.destructive ? [i] : []));
    ActionSheetIOS.showActionSheetWithOptions(
      { title, options: labels, cancelButtonIndex: labels.length - 1, destructiveButtonIndex },
      (index) => (index < actions.length ? actions[index].onPress() : onDismiss?.()),
    );
    return;
  }
  Alert.alert(
    title ?? '',
    undefined,
    [
      { text: CANCEL, style: 'cancel', onPress: onDismiss },
      ...actions.slice(0, ANDROID_MAX_ACTIONS).map((a) => ({
        text: a.label,
        style: a.destructive ? ('destructive' as const) : ('default' as const),
        onPress: a.onPress,
      })),
    ],
    { cancelable: true, onDismiss },
  );
}
