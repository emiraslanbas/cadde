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
  return (
    <TextInput
      placeholderTextColor={theme.muted}
      keyboardAppearance="dark"
      selectionColor={theme.primary}
      {...props}
      style={[styles.input, props.style]}
    />
  );
}

// variant="light": koyu zeminde beyaz, hap şeklinde ana düğme (karşılama ekranı gibi)
export function PrimaryButton(props: {
  label: string;
  onPress: () => void;
  loading?: boolean;
  disabled?: boolean;
  variant?: 'primary' | 'light';
}) {
  const disabled = props.disabled || props.loading;
  const light = props.variant === 'light';
  const textColor = light ? theme.bg : theme.onPrimary;
  return (
    <Pressable
      style={[styles.button, light && styles.buttonLight, disabled && { opacity: 0.6 }]}
      onPress={props.onPress}
      disabled={disabled}
      accessibilityRole="button">
      {props.loading ? (
        <ActivityIndicator color={textColor} />
      ) : (
        <Text style={[styles.buttonText, { color: textColor }]}>{props.label}</Text>
      )}
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
  buttonLight: { backgroundColor: theme.text, borderRadius: 28 },
  input: {
    backgroundColor: theme.surface,
    borderRadius: 14,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: theme.border,
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
  buttonText: { fontSize: 17, fontWeight: '800' },
});
