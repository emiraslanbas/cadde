// Web önizlemesi için harita ekranı: react-native-maps web'de çalışmadığından
// haritanın yerine OpenStreetMap görünümü ve hikâye paylaşan kişilerin listesi gösterilir.
import { Image } from 'expo-image';
import { router } from 'expo-router';
import { createElement } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Avatar } from '@/components/Avatar';
import { theme } from '@/constants/theme';
import { useMapUsers, useMyProfile, useRefreshOnFocus } from '@/lib/api';
import { useMyId } from '@/store/auth';

// Kadıköy / Bağdat Caddesi
const MAP_URL =
  'https://www.openstreetmap.org/export/embed.html?bbox=29.03%2C40.955%2C29.09%2C41.0&layer=mapnik';

export default function MapScreenWeb() {
  const insets = useSafeAreaInsets();
  const myId = useMyId();
  const { data: me } = useMyProfile();
  const { data: users = [], refetch } = useMapUsers();
  useRefreshOnFocus(refetch);

  const others = users.filter((u) => u.id !== myId);
  const showOnMap = me?.show_on_map ?? false;

  return (
    <View style={styles.container}>
      <View style={StyleSheet.absoluteFill}>
        {createElement('iframe', {
          src: MAP_URL,
          title: 'Harita',
          style: { border: 0, width: '100%', height: '100%' },
        })}
      </View>

      <View style={[styles.header, { top: insets.top + 8 }]}>
        <Text style={styles.logo}>cadde</Text>
        <Text style={styles.subtitle}>
          {others.length > 0
            ? `${others.length} kişi son 24 saatte hikâye paylaştı`
            : 'Henüz kimse hikâye paylaşmadı. İlk sen paylaş!'}
        </Text>
        {!showOnMap && me && <Text style={styles.hidden}>Konumun gizli · Ayarlar’dan açabilirsin</Text>}
      </View>

      {others.length > 0 && (
        <View style={styles.sheet}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 14, padding: 14 }}>
            {others.map((user) => (
              <Pressable key={user.id} onPress={() => router.push(`/story/${user.id}`)} style={styles.marker}>
                <View style={styles.ring}>
                  {user.avatar_url ? (
                    <Image source={user.avatar_url} style={styles.avatar} />
                  ) : (
                    <View style={styles.avatarBorder}>
                      <Avatar uri={null} name={user.name} size={42} />
                    </View>
                  )}
                </View>
                <Text style={styles.markerName}>{user.name.split(' ')[0]}</Text>
              </Pressable>
            ))}
          </ScrollView>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    position: 'absolute',
    left: 16,
    right: 16,
    backgroundColor: 'rgba(255,255,255,0.95)',
    borderRadius: 18,
    paddingVertical: 12,
    paddingHorizontal: 16,
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
  },
  logo: { fontSize: 24, fontWeight: '800', color: theme.primary, letterSpacing: -0.5 },
  subtitle: { fontSize: 13, color: theme.muted, marginTop: 2 },
  hidden: { fontSize: 12, color: theme.private, marginTop: 4, fontWeight: '600' },
  sheet: {
    position: 'absolute',
    left: 12,
    right: 12,
    bottom: 12,
    backgroundColor: 'rgba(255,255,255,0.95)',
    borderRadius: 18,
  },
  marker: { alignItems: 'center' },
  ring: { padding: 3, borderRadius: 30, backgroundColor: theme.primary },
  avatarBorder: { borderRadius: 23, borderWidth: 2, borderColor: '#fff' },
  avatar: { width: 46, height: 46, borderRadius: 23, borderWidth: 2, borderColor: '#fff' },
  markerName: { marginTop: 4, fontSize: 11, fontWeight: '700', color: theme.text },
});
