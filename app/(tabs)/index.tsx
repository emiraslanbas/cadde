import * as Location from 'expo-location';
import { Image } from 'expo-image';
import { router } from 'expo-router';
import { useEffect, useRef } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import MapView, { Marker } from 'react-native-maps';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Avatar } from '@/components/Avatar';
import { theme } from '@/constants/theme';
import { useMapUsers, useMyProfile, useRefreshOnFocus, useUpdateProfile } from '@/lib/api';
import { useMyId } from '@/store/auth';

// Konum izni yoksa Kadıköy / Bağdat Caddesi
const DEFAULT_REGION = {
  latitude: 40.977,
  longitude: 29.058,
  latitudeDelta: 0.05,
  longitudeDelta: 0.05,
};

// Gizlilik için ~100 m hassasiyet
const roundCoord = (value: number) => Math.round(value * 1000) / 1000;

export default function MapScreen() {
  const insets = useSafeAreaInsets();
  const myId = useMyId();
  const { data: me } = useMyProfile();
  const { data: users = [], refetch } = useMapUsers();
  const updateProfile = useUpdateProfile();
  const mapRef = useRef<MapView>(null);
  const showOnMap = me?.show_on_map ?? false;

  useRefreshOnFocus(refetch);

  // Konum açıksa gerçek konumu al, haritayı oraya götür ve profile yaz
  useEffect(() => {
    if (!showOnMap) return;
    let cancelled = false;
    (async () => {
      const { granted } = await Location.requestForegroundPermissionsAsync();
      if (!granted || cancelled) return;
      const { coords } = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
      if (cancelled) return;
      const latitude = roundCoord(coords.latitude);
      const longitude = roundCoord(coords.longitude);
      mapRef.current?.animateToRegion({ ...DEFAULT_REGION, latitude, longitude }, 600);
      updateProfile.mutate({ latitude, longitude });
    })().catch(() => {});
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [showOnMap]);

  const others = users.filter((u) => u.id !== myId);
  const mine = users.find((u) => u.id === myId);

  return (
    <View style={styles.container}>
      <MapView
        ref={mapRef}
        style={StyleSheet.absoluteFill}
        initialRegion={DEFAULT_REGION}
        showsPointsOfInterests={false}>
        {others.map((user) => (
          <Marker
            key={user.id}
            coordinate={{ latitude: user.latitude, longitude: user.longitude }}
            onPress={() => router.push(`/story/${user.id}`)}>
            <View style={styles.marker}>
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
            </View>
          </Marker>
        ))}
        {mine && me && (
          <Marker
            coordinate={{ latitude: mine.latitude, longitude: mine.longitude }}
            onPress={() => router.push(mine.stories.length > 0 ? `/story/${myId}` : '/story/new')}>
            <View style={styles.marker}>
              {/* Son 24 saatte hikâye paylaştıysan halka pembe olur, yoksa mavi */}
              <View style={[styles.ring, mine.stories.length === 0 && styles.meRing]}>
                <View style={styles.avatarBorder}>
                  <Avatar uri={me.avatar_url} name={me.name} size={42} />
                </View>
              </View>
              <Text style={styles.markerName}>Sen</Text>
            </View>
          </Marker>
        )}
      </MapView>

      <View style={[styles.header, { top: insets.top + 8 }]}>
        <Text style={styles.logo}>cadde</Text>
        <Text style={styles.subtitle}>
          {others.length > 0
            ? `${others.length} kişi son 24 saatte hikâye paylaştı`
            : 'Henüz kimse hikâye paylaşmadı. İlk sen paylaş!'}
        </Text>
        {!showOnMap && me && <Text style={styles.hidden}>Konumun gizli · Ayarlar'dan açabilirsin</Text>}
      </View>
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
    elevation: 4,
  },
  logo: { fontSize: 24, fontWeight: '800', color: theme.primary, letterSpacing: -0.5 },
  subtitle: { fontSize: 13, color: theme.muted, marginTop: 2 },
  hidden: { fontSize: 12, color: theme.private, marginTop: 4, fontWeight: '600' },
  marker: { alignItems: 'center' },
  ring: {
    padding: 3,
    borderRadius: 30,
    backgroundColor: theme.primary,
  },
  meRing: { backgroundColor: '#2F80ED' },
  avatarBorder: { borderRadius: 23, borderWidth: 2, borderColor: '#fff' },
  avatar: {
    width: 46,
    height: 46,
    borderRadius: 23,
    borderWidth: 2,
    borderColor: '#fff',
  },
  markerName: {
    marginTop: 3,
    fontSize: 11,
    fontWeight: '700',
    color: theme.text,
    backgroundColor: '#fff',
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: 8,
    overflow: 'hidden',
  },
});
