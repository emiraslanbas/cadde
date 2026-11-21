// Harita ekranının native ve web sürümlerinde ortak üst kart ve kişi işaretçisi
import { BlurView } from 'expo-blur';
import { Platform, StyleSheet, Text, View } from 'react-native';

import { Avatar } from '@/components/Avatar';
import { StoryRing } from '@/components/StoryRing';
import { theme } from '@/constants/theme';

export function MapHeader({ top, othersCount, locationHidden }: { top: number; othersCount: number; locationHidden: boolean }) {
  return (
    <View style={[styles.header, { top }]}>
      {Platform.OS === 'ios' && <BlurView tint="systemChromeMaterialDark" intensity={80} style={StyleSheet.absoluteFill} />}
      <Text style={styles.logo}>cadde</Text>
      <Text style={styles.subtitle}>
        {othersCount > 0
          ? `${othersCount} kişi son 24 saatte hikâye paylaştı`
          : 'Henüz kimse hikâye paylaşmadı. İlk sen paylaş!'}
      </Text>
      {locationHidden && <Text style={styles.hidden}>Konumun gizli · Ayarlar’dan açabilirsin</Text>}
    </View>
  );
}

export function MapPerson({
  name,
  avatarUrl,
  hasStory,
  label,
}: {
  name: string;
  avatarUrl: string | null;
  hasStory: boolean;
  label: string;
}) {
  return (
    <View style={styles.marker}>
      <StoryRing size={44} active={hasStory}>
        <Avatar uri={avatarUrl} name={name} size={44} />
      </StoryRing>
      <Text style={styles.markerName} numberOfLines={1}>
        {label}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    position: 'absolute',
    left: 16,
    right: 16,
    overflow: 'hidden',
    backgroundColor: Platform.OS === 'ios' ? 'transparent' : theme.glass,
    borderRadius: 22,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: theme.glassBorder,
    paddingVertical: 12,
    paddingHorizontal: 16,
  },
  logo: { fontSize: 26, fontWeight: '800', color: theme.text, letterSpacing: -0.8 },
  subtitle: { fontSize: 13, color: theme.muted, marginTop: 2 },
  hidden: { fontSize: 12, color: theme.private, marginTop: 4, fontWeight: '600' },
  marker: { alignItems: 'center' },
  markerName: {
    marginTop: 4,
    maxWidth: 90,
    fontSize: 11,
    fontWeight: '700',
    color: theme.text,
    backgroundColor: theme.glass,
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 8,
    overflow: 'hidden',
  },
});
