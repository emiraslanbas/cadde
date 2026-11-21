import * as Location from 'expo-location';
import { router } from 'expo-router';
import { useEffect, useRef } from 'react';
import { StyleSheet, View } from 'react-native';
import MapView, { Marker } from 'react-native-maps';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { MapHeader, MapPerson } from '@/components/MapChrome';
import { DARK_MAP_STYLE } from '@/constants/mapStyle';
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
        userInterfaceStyle="dark"
        customMapStyle={DARK_MAP_STYLE}
        showsPointsOfInterests={false}>
        {others.map((user) => (
          <Marker
            key={user.id}
            coordinate={{ latitude: user.latitude, longitude: user.longitude }}
            onPress={() => router.push(`/story/${user.id}`)}>
            <MapPerson name={user.name} avatarUrl={user.avatar_url} hasStory label={user.name.split(' ')[0]} />
          </Marker>
        ))}
        {mine && me && (
          <Marker
            coordinate={{ latitude: mine.latitude, longitude: mine.longitude }}
            onPress={() => router.push(mine.stories.length > 0 ? `/story/${myId}` : '/story/new')}>
            {/* Son 24 saatte hikâye paylaştıysan halka parlar, yoksa sönük kalır */}
            <MapPerson name={me.name} avatarUrl={me.avatar_url} hasStory={mine.stories.length > 0} label="Sen" />
          </Marker>
        )}
      </MapView>

      <MapHeader top={insets.top + 8} othersCount={others.length} locationHidden={!showOnMap && !!me} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.bg },
});
