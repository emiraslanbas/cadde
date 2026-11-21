import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { StyleSheet, Text } from 'react-native';

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
    <LinearGradient colors={[theme.primaryDark, theme.glow[2]]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={[shape, styles.fallback]}>
      <Text style={[styles.initials, { fontSize: size * 0.36 }]}>{initials || '?'}</Text>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  fallback: { alignItems: 'center', justifyContent: 'center' },
  initials: { color: theme.onPrimary, fontWeight: '800' },
});
