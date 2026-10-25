import { router } from 'expo-router';
import { ReactNode } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, Switch, Text, View } from 'react-native';

import { Icon, IconName } from '@/components/Icon';
import { Avatar } from '@/components/Avatar';
import { theme } from '@/constants/theme';
import { useMyProfile, useUpdateProfile } from '@/lib/api';
import { errorMessage } from '@/lib/format';
import { supabase } from '@/lib/supabase';
import { Audience, useSettings } from '@/store/settings';

export default function SettingsScreen() {
  const settings = useSettings();
  const { data: me } = useMyProfile();
  const updateProfile = useUpdateProfile();

  const signOut = () =>
    Alert.alert('Çıkış yap', 'Hesabından çıkış yapmak istediğine emin misin?', [
      { text: 'Vazgeç', style: 'cancel' },
      { text: 'Çıkış yap', style: 'destructive', onPress: () => supabase.auth.signOut() },
    ]);

  return (
    <ScrollView style={styles.container} contentContainerStyle={{ padding: 16, paddingBottom: 40 }}>
      <Pressable style={styles.profileCard} onPress={() => router.push('/profile/edit')}>
        <Avatar uri={me?.avatar_url} name={me?.name ?? ''} size={52} />
        <View style={{ flex: 1 }}>
          <Text style={styles.profileName}>{me?.name}</Text>
          <Text style={styles.profileUsername}>@{me?.username} · Profili düzenle</Text>
        </View>
        <Icon name="chevron" color={theme.muted} size={14} />
      </Pressable>

      <Section title="Gizlilik">
        <ToggleRow
          icon="location"
          label="Konumumu haritada göster"
          value={me?.show_on_map ?? false}
          onChange={(show_on_map) =>
            updateProfile.mutate(
              { show_on_map },
              { onError: (error) => Alert.alert('Kaydedilemedi', errorMessage(error)) },
            )
          }
        />
        <Row icon="eye" label="Hikâyelerimi kimler görebilir?">
          <Segmented
            value={settings.storyAudience}
            onChange={(storyAudience) => settings.set({ storyAudience })}
          />
        </Row>
      </Section>

      <Section title="Bildirimler">
        <ToggleRow
          icon="calendar"
          label="Etkinlik davetleri ve istekler"
          value={settings.notifyInvites}
          onChange={(notifyInvites) => settings.set({ notifyInvites })}
        />
        <ToggleRow
          icon="message"
          label="Sohbet mesajları"
          value={settings.notifyMessages}
          onChange={(notifyMessages) => settings.set({ notifyMessages })}
        />
        <ToggleRow
          icon="friends"
          label="Arkadaşlık istekleri"
          value={settings.notifyFriends}
          onChange={(notifyFriends) => settings.set({ notifyFriends })}
          last
        />
      </Section>

      <Section title="Hakkında">
        <Row icon="info" label="Sürüm" last>
          <Text style={styles.value}>1.0.0</Text>
        </Row>
      </Section>

      <Pressable
        style={styles.logout}
        onPress={signOut}>
        <Icon name="logout" color="#E5484D" size={17} />
        <Text style={styles.logoutText}>Çıkış yap</Text>
      </Pressable>
    </ScrollView>
  );
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <View style={{ marginTop: 24 }}>
      <Text style={styles.sectionTitle}>{title.toLocaleUpperCase('tr-TR')}</Text>
      <View style={styles.card}>{children}</View>
    </View>
  );
}

function Row(props: { icon: IconName; label: string; children?: ReactNode; last?: boolean }) {
  return (
    <View style={[styles.row, !props.last && styles.rowBorder]}>
      <View style={styles.iconBox}>
        <Icon name={props.icon} color={theme.primary} size={16} />
      </View>
      <Text style={styles.label}>{props.label}</Text>
      {props.children}
    </View>
  );
}

function ToggleRow(props: {
  icon: IconName;
  label: string;
  value: boolean;
  onChange: (v: boolean) => void;
  last?: boolean;
}) {
  return (
    <Row icon={props.icon} label={props.label} last={props.last}>
      <Switch value={props.value} onValueChange={props.onChange} trackColor={{ true: theme.primary }} />
    </Row>
  );
}

const AUDIENCES: { key: Audience; label: string }[] = [
  { key: 'everyone', label: 'Herkes' },
  { key: 'friends', label: 'Arkadaşlar' },
];

function Segmented({ value, onChange }: { value: Audience; onChange: (v: Audience) => void }) {
  return (
    <View style={styles.segment}>
      {AUDIENCES.map((a) => (
        <Pressable
          key={a.key}
          onPress={() => onChange(a.key)}
          style={[styles.segmentItem, value === a.key && styles.segmentActive]}>
          <Text style={[styles.segmentText, value === a.key && { color: theme.text }]}>{a.label}</Text>
        </Pressable>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.surface },
  profileCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    padding: 14,
    borderRadius: 18,
    backgroundColor: '#fff',
  },
  profileName: { fontSize: 17, fontWeight: '800', color: theme.text },
  profileUsername: { fontSize: 13, color: theme.muted, marginTop: 2 },
  sectionTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: theme.muted,
    marginLeft: 6,
    marginBottom: 8,
  },
  card: { backgroundColor: '#fff', borderRadius: 18, overflow: 'hidden' },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 14, paddingVertical: 12 },
  rowBorder: { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: theme.border },
  iconBox: {
    width: 30,
    height: 30,
    borderRadius: 9,
    backgroundColor: '#FFF0F3',
    alignItems: 'center',
    justifyContent: 'center',
  },
  label: { flex: 1, fontSize: 15, color: theme.text },
  value: { fontSize: 15, color: theme.muted },
  segment: { flexDirection: 'row', backgroundColor: theme.surface, borderRadius: 10, padding: 2 },
  segmentItem: { paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8 },
  segmentActive: {
    backgroundColor: '#fff',
    shadowColor: '#000',
    shadowOpacity: 0.08,
    shadowRadius: 3,
    shadowOffset: { width: 0, height: 1 },
    elevation: 1,
  },
  segmentText: { fontSize: 13, fontWeight: '600', color: theme.muted },
  logout: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginTop: 28,
    paddingVertical: 15,
    borderRadius: 18,
    backgroundColor: '#fff',
  },
  logoutText: { fontSize: 16, fontWeight: '700', color: '#E5484D' },
});
