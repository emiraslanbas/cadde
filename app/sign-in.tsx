import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { useState } from 'react';
import { Alert, KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Field, Input, PrimaryButton } from '@/components/Form';
import { theme } from '@/constants/theme';
import { errorMessage } from '@/lib/format';
import { supabase } from '@/lib/supabase';

// Karşılama: gece haritası illüstrasyonu, logo ve iki seçenek. "Giriş yap" formu aynı ekranda açar.
export default function SignInScreen() {
  const insets = useSafeAreaInsets();
  const [showForm, setShowForm] = useState(false);
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
    <View style={styles.container}>
      <Image source={require('../assets/images/welcome.png')} style={styles.hero} contentFit="cover" />
      <LinearGradient colors={['transparent', theme.bg]} locations={[0.35, 1]} style={styles.hero} />

      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView
          contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 24 }]}
          keyboardShouldPersistTaps="handled">
          <Text style={styles.logo}>cadde</Text>
          <Text style={styles.tagline}>Çevrende neler oluyor, gör ve katıl.</Text>

          {showForm ? (
            <View style={styles.form}>
              <Field label="E-posta">
                <Input
                  value={email}
                  onChangeText={setEmail}
                  placeholder="ornek@mail.com"
                  autoCapitalize="none"
                  autoComplete="email"
                  keyboardType="email-address"
                  autoFocus
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
              <Pressable onPress={() => setShowForm(false)} hitSlop={8} accessibilityRole="button">
                <Text style={styles.secondary}>Geri</Text>
              </Pressable>
            </View>
          ) : (
            <View style={styles.form}>
              <PrimaryButton label="Hesap oluştur" variant="light" onPress={() => router.push('/sign-up')} />
              <Pressable onPress={() => setShowForm(true)} hitSlop={8} accessibilityRole="button">
                <Text style={styles.secondary}>
                  Zaten hesabın var mı? <Text style={styles.link}>Giriş yap</Text>
                </Text>
              </Pressable>
            </View>
          )}
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.bg },
  hero: { position: 'absolute', top: 0, left: 0, right: 0, height: '72%' },
  content: { flexGrow: 1, justifyContent: 'flex-end', paddingHorizontal: 24 },
  logo: { fontSize: 64, fontWeight: '800', color: theme.text, letterSpacing: -2.5 },
  tagline: { fontSize: 17, color: theme.muted, marginTop: -4, marginBottom: 28 },
  form: { gap: 16 },
  secondary: { textAlign: 'center', color: theme.muted, fontSize: 15, marginTop: 4 },
  link: { color: theme.text, fontWeight: '700' },
});
