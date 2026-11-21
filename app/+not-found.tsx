import { Link, Stack } from 'expo-router';
import { StyleSheet, Text, View } from 'react-native';

import { theme } from '@/constants/theme';

export default function NotFoundScreen() {
  return (
    <>
      <Stack.Screen options={{ title: 'Bulunamadı' }} />
      <View style={styles.container}>
        <Text style={styles.title}>Aradığın sayfa bulunamadı.</Text>
        <Link href="/" style={styles.link}>
          <Text style={styles.linkText}>Haritaya dön</Text>
        </Link>
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 20, backgroundColor: theme.bg },
  title: { fontSize: 18, fontWeight: '700', color: theme.text },
  link: { marginTop: 15, paddingVertical: 15 },
  linkText: { fontSize: 15, fontWeight: '700', color: theme.primary },
});
