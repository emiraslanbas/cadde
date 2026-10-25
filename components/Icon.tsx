import { SymbolView } from 'expo-symbols';
import { ComponentProps } from 'react';

type SymbolName = ComponentProps<typeof SymbolView>['name'];

// iOS SF Symbols ↔ Android Material ikon eşleşmeleri
const ICONS = {
  lock: { ios: 'lock.fill', android: 'lock', web: 'lock' },
  globe: { ios: 'globe.europe.africa.fill', android: 'public', web: 'public' },
  pin: { ios: 'mappin', android: 'place', web: 'place' },
  calendar: { ios: 'calendar', android: 'event', web: 'event' },
  person: { ios: 'person.fill', android: 'person', web: 'person' },
  plus: { ios: 'plus', android: 'add', web: 'add' },
  check: { ios: 'checkmark', android: 'check', web: 'check' },
  camera: { ios: 'camera.fill', android: 'photo_camera', web: 'photo_camera' },
  chat: { ios: 'bubble.left.and.bubble.right.fill', android: 'forum', web: 'forum' },
  send: { ios: 'arrow.up', android: 'send', web: 'send' },
  clock: { ios: 'clock', android: 'schedule', web: 'schedule' },
  settings: { ios: 'gearshape.fill', android: 'settings', web: 'settings' },
  chevron: { ios: 'chevron.right', android: 'chevron_right', web: 'chevron_right' },
  location: { ios: 'location.fill', android: 'my_location', web: 'my_location' },
  eye: { ios: 'eye.fill', android: 'visibility', web: 'visibility' },
  bell: { ios: 'bell.fill', android: 'notifications', web: 'notifications' },
  message: { ios: 'message.fill', android: 'chat', web: 'chat' },
  friends: { ios: 'person.2.fill', android: 'group', web: 'group' },
  info: { ios: 'info.circle.fill', android: 'info', web: 'info' },
  photo: { ios: 'photo.on.rectangle', android: 'photo_library', web: 'photo_library' },
  close: { ios: 'xmark', android: 'close', web: 'close' },
  logout: { ios: 'rectangle.portrait.and.arrow.right', android: 'logout', web: 'logout' },
} satisfies Record<string, SymbolName>;

export type IconName = keyof typeof ICONS;

export function Icon({ name, color, size = 16 }: { name: IconName; color: string; size?: number }) {
  return <SymbolView name={ICONS[name] as SymbolName} tintColor={color} size={size} />;
}
