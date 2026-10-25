import { Image } from 'expo-image';
import { StyleSheet, Text, View } from 'react-native';

import { theme } from '@/constants/theme';

// Fotoğraf varsa onu, yoksa ismin baş harflerini gösterir
export function Avatar({ uri, name, size }: { uri: string | null | undefined; name: string; size: number }) {
  const shape = { width: size, height: size, borderRadius: size / 2 };

  if (uri) return <Image source={uri} style={shape} transition={150} />;

  const initials = name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0].toLocaleUpperCase('tr-TR'))
    .join('');

  return (
    <View style={[shape, styles.fallback]}>
      <Text style={[styles.initials, { fontSize: size * 0.36 }]}>{initials || '?'}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  fallback: { backgroundColor: theme.primary, alignItems: 'center', justifyContent: 'center' },
  initials: { color: '#fff', fontWeight: '800' },
});
