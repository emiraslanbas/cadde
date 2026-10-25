import DateTimePicker, { DateTimePickerEvent } from '@react-native-community/datetimepicker';
import { router } from 'expo-router';
import { useState } from 'react';
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';

import { PrimaryButton } from '@/components/Form';
import { Icon, IconName } from '@/components/Icon';
import { formatEventDate, theme } from '@/constants/theme';
import { useCreateEvent } from '@/lib/api';
import { errorMessage } from '@/lib/format';
import type { EventVisibility } from '@/lib/types';

const defaultDate = () => {
  const d = new Date();
  d.setDate(d.getDate() + 1);
  d.setHours(19, 0, 0, 0);
  return d;
};

export default function NewEventScreen() {
  const createEvent = useCreateEvent();
  const [title, setTitle] = useState('');
  const [place, setPlace] = useState('');
  const [description, setDescription] = useState('');
  const [date, setDate] = useState(defaultDate);
  const [visibility, setVisibility] = useState<EventVisibility>('public');
  // Android'de tarih ve saat ayrı diyaloglarla seçilir
  const [androidPicker, setAndroidPicker] = useState<'date' | 'time' | null>(null);

  const onAndroidChange = (e: DateTimePickerEvent, value?: Date) => {
    const mode = androidPicker;
    setAndroidPicker(null);
    if (e.type !== 'set' || !value) return;
    setDate(value);
    if (mode === 'date') setAndroidPicker('time');
  };

  const submit = () => {
    if (!title.trim() || !place.trim()) {
      Alert.alert('Eksik bilgi', 'Etkinlik adı ve yer zorunlu.');
      return;
    }
    createEvent.mutate(
      {
        title: title.trim(),
        place: place.trim(),
        description: description.trim(),
        starts_at: date.toISOString(),
        visibility,
        // Şimdilik başlığa göre rastgele bir kapak fotoğrafı
        cover_url: `https://picsum.photos/seed/${encodeURIComponent(title.trim())}/800/450`,
      },
      {
        onSuccess: () => router.back(),
        onError: (error) => Alert.alert('Etkinlik oluşturulamadı', errorMessage(error)),
      },
    );
  };

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView style={styles.container} contentContainerStyle={{ padding: 20, gap: 18 }}>
        <Field label="Etkinlik adı">
          <TextInput style={styles.input} value={title} onChangeText={setTitle} placeholder="Örn. Sahilde piknik" />
        </Field>

        <Field label="Yer">
          <TextInput style={styles.input} value={place} onChangeText={setPlace} placeholder="Örn. Caddebostan Sahili" />
        </Field>

        <Field label="Açıklama">
          <TextInput
            style={[styles.input, { height: 90, textAlignVertical: 'top' }]}
            value={description}
            onChangeText={setDescription}
            placeholder="Detaylar…"
            multiline
          />
        </Field>

        <Field label="Tarih ve saat">
          {Platform.OS === 'ios' ? (
            <DateTimePicker
              value={date}
              mode="datetime"
              minimumDate={new Date()}
              locale="tr-TR"
              onChange={(_, v) => v && setDate(v)}
              style={{ alignSelf: 'flex-start' }}
            />
          ) : (
            <Pressable style={styles.input} onPress={() => setAndroidPicker('date')}>
              <Text style={{ fontSize: 16, color: theme.text }}>{formatEventDate(date.toISOString())}</Text>
            </Pressable>
          )}
          {androidPicker && (
            <DateTimePicker value={date} mode={androidPicker} minimumDate={new Date()} onChange={onAndroidChange} />
          )}
        </Field>

        <Field label="Kimler görebilir?">
          <View style={styles.segment}>
            <VisibilityOption
              active={visibility === 'public'}
              onPress={() => setVisibility('public')}
              icon="globe"
              title="Herkese açık"
              subtitle="Haritadaki herkes görür"
            />
            <VisibilityOption
              active={visibility === 'private'}
              onPress={() => setVisibility('private')}
              icon="lock"
              title="Özel"
              subtitle="Sadece davet ettiklerin"
            />
          </View>
        </Field>

        <PrimaryButton label="Etkinliği oluştur" onPress={submit} loading={createEvent.isPending} />
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <View style={{ gap: 8 }}>
      <Text style={styles.label}>{label}</Text>
      {children}
    </View>
  );
}

function VisibilityOption(props: {
  active: boolean;
  onPress: () => void;
  icon: IconName;
  title: string;
  subtitle: string;
}) {
  return (
    <Pressable onPress={props.onPress} style={[styles.option, props.active && styles.optionActive]}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
        <Icon name={props.icon} color={props.active ? theme.primary : theme.muted} size={15} />
        <Text style={styles.optionTitle}>{props.title}</Text>
      </View>
      <Text style={styles.optionSubtitle}>{props.subtitle}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  label: { fontSize: 14, fontWeight: '700', color: theme.text },
  input: {
    backgroundColor: theme.surface,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 16,
    color: theme.text,
  },
  segment: { flexDirection: 'row', gap: 10 },
  option: {
    flex: 1,
    padding: 12,
    borderRadius: 14,
    borderWidth: 2,
    borderColor: theme.border,
  },
  optionActive: { borderColor: theme.primary, backgroundColor: '#FFF0F3' },
  optionTitle: { fontSize: 15, fontWeight: '700', color: theme.text },
  optionSubtitle: { fontSize: 12, color: theme.muted, marginTop: 4 },
});
