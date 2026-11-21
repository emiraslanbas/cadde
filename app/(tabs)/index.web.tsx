// Web önizlemesi için harita ekranı: react-native-maps web'de çalışmadığından
// haritanın yerine OpenStreetMap görünümü ve hikâye paylaşan kişilerin listesi gösterilir.
import { router } from 'expo-router';
import { createElement } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { MapHeader, MapPerson } from '@/components/MapChrome';
import { TAB_BAR_CLEARANCE, theme } from '@/constants/theme';
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
          // OpenStreetMap'in koyu teması yok; renkleri ters çevirerek gece görünümü
          style: { border: 0, width: '100%', height: '100%', filter: DARK_FILTER },
        })}
      </View>

      <MapHeader top={insets.top + 8} othersCount={others.length} locationHidden={!showOnMap && !!me} />

      {others.length > 0 && (
        <View style={[styles.sheet, { bottom: TAB_BAR_CLEARANCE - 24 }]}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 14, padding: 14 }}>
            {others.map((user) => (
              <Pressable key={user.id} onPress={() => router.push(`/story/${user.id}`)}>
                <MapPerson name={user.name} avatarUrl={user.avatar_url} hasStory label={user.name.split(' ')[0]} />
              </Pressable>
            ))}
          </ScrollView>
        </View>
      )}
    </View>
  );
}

const DARK_FILTER = 'invert(1) hue-rotate(200deg) brightness(0.75) contrast(0.9) saturate(0.6)';

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.bg },
  sheet: {
    position: 'absolute',
    left: 12,
    right: 12,
    backgroundColor: theme.glass,
    borderRadius: 22,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: theme.glassBorder,
  },
});
