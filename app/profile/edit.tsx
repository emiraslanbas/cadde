import { router } from 'expo-router';
import { useState } from 'react';
import { ActivityIndicator, Alert, StyleSheet, Text, View } from 'react-native';

import {
  cleanUsername,
  Field,
  Input,
  PrimaryButton,
  USERNAME_HINT,
  USERNAME_PATTERN,
} from '@/components/Form';
import { theme } from '@/constants/theme';
import { isUsernameAvailable, useMyProfile, useUpdateProfile } from '@/lib/api';
import { errorMessage } from '@/lib/format';
import type { Profile } from '@/lib/types';

export default function EditProfileScreen() {
  const { data: me } = useMyProfile();

  if (!me) {
    return (
      <View style={[styles.container, { alignItems: 'center', justifyContent: 'center' }]}>
        <ActivityIndicator color={theme.primary} />
      </View>
    );
  }

  return <EditForm me={me} />;
}

function EditForm({ me }: { me: Profile }) {
  const updateProfile = useUpdateProfile();
  const [name, setName] = useState(me.name);
  const [username, setUsername] = useState(me.username);
  const [checking, setChecking] = useState(false);

  const save = async () => {
    const cleanName = name.trim();
    if (!cleanName || !username) {
      Alert.alert('Eksik bilgi', 'İsim ve kullanıcı adı boş olamaz.');
      return;
    }
    if (!USERNAME_PATTERN.test(username)) {
      Alert.alert('Geçersiz kullanıcı adı', USERNAME_HINT);
      return;
    }
    try {
      if (username !== me.username) {
        setChecking(true);
        const available = await isUsernameAvailable(username);
        setChecking(false);
        if (!available) {
          Alert.alert('Kullanıcı adı alınmış', `@${username} kullanılıyor, başka bir tane dene.`);
          return;
        }
      }
      await updateProfile.mutateAsync({ name: cleanName, username });
      router.back();
    } catch (error) {
      setChecking(false);
      Alert.alert('Kaydedilemedi', errorMessage(error));
    }
  };

  return (
    <View style={styles.container}>
      <Field label="İsim">
        <Input value={name} onChangeText={setName} placeholder="Adın" />
      </Field>

      <Field label="Kullanıcı adı">
        <Input
          value={username}
          onChangeText={(t) => setUsername(cleanUsername(t))}
          placeholder="kullaniciadi"
          autoCapitalize="none"
          autoCorrect={false}
        />
        <Text style={styles.hint}>{USERNAME_HINT}</Text>
      </Field>

      <PrimaryButton label="Kaydet" onPress={save} loading={checking || updateProfile.isPending} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff', padding: 20, gap: 18 },
  hint: { fontSize: 12, color: theme.muted },
});
