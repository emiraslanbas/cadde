import { ReactNode } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, TextInput, TextInputProps, View } from 'react-native';

import { theme } from '@/constants/theme';

export function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <View style={{ gap: 8 }}>
      <Text style={styles.label}>{label}</Text>
      {children}
    </View>
  );
}

export function Input(props: TextInputProps) {
  return <TextInput placeholderTextColor={theme.muted} {...props} style={[styles.input, props.style]} />;
}

export function PrimaryButton(props: { label: string; onPress: () => void; loading?: boolean; disabled?: boolean }) {
  const disabled = props.disabled || props.loading;
  return (
    <Pressable style={[styles.button, disabled && { opacity: 0.6 }]} onPress={props.onPress} disabled={disabled}>
      {props.loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.buttonText}>{props.label}</Text>}
    </Pressable>
  );
}

export const USERNAME_PATTERN = /^[a-z0-9._]{3,30}$/;

// Kullanıcı adını küçük harfe çevirir, boşlukları ve baştaki @'i atar
export const cleanUsername = (value: string) =>
  value.replace(/\s/g, '').replace(/^@/, '').toLocaleLowerCase('tr-TR');

export const USERNAME_HINT = '3-30 karakter; sadece a-z, rakam, nokta ve alt çizgi.';

const styles = StyleSheet.create({
  label: { fontSize: 14, fontWeight: '700', color: theme.text },
  input: {
    backgroundColor: theme.surface,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 16,
    color: theme.text,
  },
  button: {
    backgroundColor: theme.primary,
    borderRadius: 16,
    paddingVertical: 16,
    alignItems: 'center',
    marginTop: 8,
    minHeight: 54,
    justifyContent: 'center',
  },
  buttonText: { color: '#fff', fontSize: 17, fontWeight: '800' },
});
