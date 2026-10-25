import { Link } from 'expo-router';
import { useState } from 'react';
import { Alert, KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Field, Input, PrimaryButton } from '@/components/Form';
import { theme } from '@/constants/theme';
import { errorMessage } from '@/lib/format';
import { supabase } from '@/lib/supabase';

export default function SignInScreen() {
  const insets = useSafeAreaInsets();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const signIn = async () => {
    if (!email.trim() || !password) {
      Alert.alert('Eksik bilgi', 'E-posta ve şifreni gir.');
      return;
    }
    setLoading(true);
    const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
    setLoading(false);
    // Başarılı girişte oturum değişir ve uygulama kendiliğinden ana ekrana geçer
    if (error) Alert.alert('Giriş yapılamadı', errorMessage(error));
  };

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView
        style={styles.container}
        contentContainerStyle={[styles.content, { paddingTop: insets.top + 60 }]}
        keyboardShouldPersistTaps="handled">
        <Text style={styles.logo}>cadde</Text>
        <Text style={styles.tagline}>Çevrende neler oluyor, gör ve katıl.</Text>

        <Field label="E-posta">
          <Input
            value={email}
            onChangeText={setEmail}
            placeholder="ornek@mail.com"
            autoCapitalize="none"
            autoComplete="email"
            keyboardType="email-address"
          />
        </Field>
        <Field label="Şifre">
          <Input
            value={password}
            onChangeText={setPassword}
            placeholder="Şifren"
            secureTextEntry
            autoComplete="current-password"
          />
        </Field>

        <PrimaryButton label="Giriş yap" onPress={signIn} loading={loading} />

        <Text style={styles.footer}>
          Hesabın yok mu?{' '}
          <Link href="/sign-up" style={styles.link}>
            Hesap oluştur
          </Link>
        </Text>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  content: { padding: 24, gap: 18 },
  logo: { fontSize: 48, fontWeight: '800', color: theme.primary, letterSpacing: -1.5 },
  tagline: { fontSize: 16, color: theme.muted, marginTop: -10, marginBottom: 12 },
  footer: { textAlign: 'center', color: theme.muted, fontSize: 15, marginTop: 8 },
  link: { color: theme.primary, fontWeight: '700' },
});
