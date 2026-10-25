import { useState } from 'react';
import { Alert, KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text } from 'react-native';

import {
  cleanUsername,
  Field,
  Input,
  PrimaryButton,
  USERNAME_HINT,
  USERNAME_PATTERN,
} from '@/components/Form';
import { theme } from '@/constants/theme';
import { isUsernameAvailable } from '@/lib/api';
import { errorMessage } from '@/lib/format';
import { supabase } from '@/lib/supabase';

export default function SignUpScreen() {
  const [name, setName] = useState('');
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const signUp = async () => {
    const cleanName = name.trim();
    if (!cleanName || !username || !email.trim() || !password) {
      Alert.alert('Eksik bilgi', 'Tüm alanları doldur.');
      return;
    }
    if (!USERNAME_PATTERN.test(username)) {
      Alert.alert('Geçersiz kullanıcı adı', USERNAME_HINT);
      return;
    }
    if (password.length < 6) {
      Alert.alert('Şifre çok kısa', 'Şifre en az 6 karakter olmalı.');
      return;
    }

    setLoading(true);
    try {
      if (!(await isUsernameAvailable(username))) {
        Alert.alert('Kullanıcı adı alınmış', `@${username} kullanılıyor, başka bir tane dene.`);
        return;
      }
      // İsim ve kullanıcı adı, veritabanındaki tetikleyiciyle profile yazılır
      const { data, error } = await supabase.auth.signUp({
        email: email.trim(),
        password,
        options: { data: { name: cleanName, username } },
      });
      if (error) throw error;
      if (!data.session) {
        Alert.alert('E-postanı kontrol et', 'Hesabını onaylamak için sana bir e-posta gönderdik.');
      }
    } catch (error) {
      Alert.alert('Hesap oluşturulamadı', errorMessage(error));
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView style={styles.container} contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <Field label="İsim">
          <Input value={name} onChangeText={setName} placeholder="Adın" autoComplete="name" />
        </Field>
        <Field label="Kullanıcı adı">
          <Input
            value={username}
            onChangeText={(t) => setUsername(cleanUsername(t))}
            placeholder="kullaniciadi"
            autoCapitalize="none"
            autoCorrect={false}
            autoComplete="username"
          />
          <Text style={styles.hint}>{USERNAME_HINT}</Text>
        </Field>
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
            placeholder="En az 6 karakter"
            secureTextEntry
            autoComplete="new-password"
          />
        </Field>

        <PrimaryButton label="Hesap oluştur" onPress={signUp} loading={loading} />
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  content: { padding: 20, gap: 18 },
  hint: { fontSize: 12, color: theme.muted },
});
