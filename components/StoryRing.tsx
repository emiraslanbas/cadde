import { LinearGradient } from 'expo-linear-gradient';
import { ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';

import { theme } from '@/constants/theme';

const RING_WIDTH = 2.5;
const GAP = 2.5;

// Avatarın etrafına maviden mora parlayan hikâye halkası çizer.
// active=false: hikâye yokken sönük gri halka.
export function StoryRing({ size, active = true, children }: { size: number; active?: boolean; children: ReactNode }) {
  const outer = size + (RING_WIDTH + GAP) * 2;
  const inner = size + GAP * 2;
  return (
    <LinearGradient
      colors={active ? theme.glow : [theme.border, theme.border]}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={[styles.center, { width: outer, height: outer, borderRadius: outer / 2 }]}>
      <View style={[styles.center, { width: inner, height: inner, borderRadius: inner / 2, backgroundColor: theme.bg }]}>
        {children}
      </View>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  center: { alignItems: 'center', justifyContent: 'center' },
});
