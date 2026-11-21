import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { Alert, KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Switch, Text, View } from 'react-native';

import { Input, PrimaryButton } from '@/components/Form';
import { Icon } from '@/components/Icon';
import { theme } from '@/constants/theme';
import { errorMessage } from '@/lib/format';
import { useBlockUser, useReport } from '@/lib/safety';
import type { ReportReason, ReportTarget } from '@/lib/types';
import { useMyId } from '@/store/auth';

const REASONS: { key: ReportReason; label: string }[] = [
  { key: 'inappropriate', label: 'Uygunsuz ya da müstehcen içerik' },
  { key: 'harassment', label: 'Taciz, zorbalık ya da tehdit' },
  { key: 'spam', label: 'Spam ya da dolandırıcılık' },
  { key: 'fake', label: 'Sahte hesap ya da başkasını taklit' },
  { key: 'other', label: 'Başka bir sebep' },
];

const TARGET_LABELS: Record<ReportTarget, string> = {
  user: 'bu kişiyi',
  story: 'bu hikâyeyi',
  event: 'bu etkinliği',
  message: 'bu mesajı',
};

const VALID_TARGETS = Object.keys(TARGET_LABELS) as ReportTarget[];

export default function ReportScreen() {
  const params = useLocalSearchParams<{ type: string; id: string; userId?: string; name?: string }>();
  const myId = useMyId();
  const report = useReport();
  const block = useBlockUser();
  const [reason, setReason] = useState<ReportReason | null>(null);
  const [details, setDetails] = useState('');
  const [alsoBlock, setAlsoBlock] = useState(false);

  const type = VALID_TARGETS.find((t) => t === params.type);
  const canBlock = !!params.userId && params.userId !== myId;
  const busy = report.isPending || block.isPending;

  if (!type || !params.id) {
    return (
      <View style={[styles.container, styles.center]}>
        <Text style={styles.hint}>Bildirilecek içerik bulunamadı.</Text>
      </View>
    );
  }

  const submit = async () => {
    if (!reason) {
      Alert.alert('Bir sebep seç', 'Neden bildirdiğini seçmen incelememizi hızlandırır.');
      return;
    }
    try {
      await report.mutateAsync({
        targetType: type,
        targetId: params.id,
        targetUserId: params.userId,
        reason,
        details,
      });
      if (alsoBlock && canBlock) await block.mutateAsync(params.userId!);
      Alert.alert(
        'Teşekkürler',
        'Bildirimini aldık ve en kısa sürede inceleyeceğiz. Bu içerik artık sana gösterilmeyecek.',
        [{ text: 'Tamam', onPress: () => router.back() }],
      );
    } catch (error) {
      Alert.alert('Gönderilemedi', errorMessage(error));
    }
  };

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView style={styles.container} contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <Text style={styles.title}>Neden {TARGET_LABELS[type]} bildiriyorsun?</Text>
        <Text style={styles.hint}>Bildirimin gizlidir; kimin bildirdiğini kimse görmez.</Text>

        <View style={styles.card}>
          {REASONS.map((r, i) => (
            <Pressable
              key={r.key}
              onPress={() => setReason(r.key)}
              accessibilityRole="radio"
              accessibilityState={{ selected: reason === r.key }}
              style={[styles.row, i < REASONS.length - 1 && styles.rowBorder]}>
              <Text style={styles.label}>{r.label}</Text>
              <View style={[styles.radio, reason === r.key && styles.radioActive]}>
                {reason === r.key && <Icon name="check" color="#fff" size={12} />}
              </View>
            </Pressable>
          ))}
        </View>

        <Input
          value={details}
          onChangeText={setDetails}
          placeholder="Eklemek istediğin bir şey var mı? (isteğe bağlı)"
          multiline
          maxLength={500}
          style={styles.details}
        />

        {canBlock && (
          <View style={[styles.card, styles.row]}>
            <Text style={styles.label}>{params.name ? `${params.name} kişisini de engelle` : 'Bu kişiyi de engelle'}</Text>
            <Switch value={alsoBlock} onValueChange={setAlsoBlock} trackColor={{ true: theme.primary }} />
          </View>
        )}

        <PrimaryButton label="Bildir" onPress={submit} loading={busy} />
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.surface },
  center: { alignItems: 'center', justifyContent: 'center' },
  content: { padding: 16, gap: 14, paddingBottom: 40 },
  title: { fontSize: 20, fontWeight: '800', color: theme.text, marginTop: 4 },
  hint: { fontSize: 13, color: theme.muted, lineHeight: 18 },
  card: { backgroundColor: '#fff', borderRadius: 18, overflow: 'hidden' },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 14, paddingVertical: 14 },
  rowBorder: { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: theme.border },
  label: { flex: 1, fontSize: 15, color: theme.text },
  radio: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 2,
    borderColor: theme.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  radioActive: { backgroundColor: theme.primary, borderColor: theme.primary },
  details: { minHeight: 90, textAlignVertical: 'top', backgroundColor: '#fff' },
});
