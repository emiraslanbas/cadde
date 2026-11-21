import Constants from 'expo-constants';
import { router } from 'expo-router';
import * as WebBrowser from 'expo-web-browser';
import { ReactNode, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Linking,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import { Avatar } from '@/components/Avatar';
import { Icon, IconName } from '@/components/Icon';
import { Toggle } from '@/components/Toggle';
import { LINKS } from '@/constants/links';
import { TAB_BAR_CLEARANCE, theme } from '@/constants/theme';
import { useMyProfile, useUpdateProfile } from '@/lib/api';
import { errorMessage } from '@/lib/format';
import { registerForPush, unregisterPushToken } from '@/lib/notifications';
import { deleteMyAccount } from '@/lib/safety';
import { supabase } from '@/lib/supabase';
import type { Audience, ProfileUpdate } from '@/lib/types';
import { useMyId } from '@/store/auth';

type NotifyKey = 'notify_invites' | 'notify_messages' | 'notify_friends';

export default function SettingsScreen() {
  const myId = useMyId();
  const { data: me } = useMyProfile();
  const updateProfile = useUpdateProfile();
  const [deleting, setDeleting] = useState(false);

  const save = (patch: ProfileUpdate) =>
    updateProfile.mutate(patch, { onError: (error) => Alert.alert('Kaydedilemedi', errorMessage(error)) });

  // Bir bildirim türü açılınca telefondan bildirim izni istenir
  const toggleNotification = async (key: NotifyKey, value: boolean) => {
    save({ [key]: value });
    if (!value) return;
    const result = await registerForPush(true).catch(() => 'unsupported' as const);
    if (result === 'denied') {
      Alert.alert(
        'Bildirimler kapalı',
        'Cadde bildirimlerini almak için telefonunun ayarlarından bildirim iznini aç.',
        [
          { text: 'Vazgeç', style: 'cancel' },
          { text: 'Ayarları aç', onPress: () => Linking.openSettings() },
        ],
      );
    }
  };

  const signOut = () =>
    Alert.alert('Çıkış yap', 'Hesabından çıkış yapmak istediğine emin misin?', [
      { text: 'Vazgeç', style: 'cancel' },
      {
        text: 'Çıkış yap',
        style: 'destructive',
        onPress: async () => {
          await unregisterPushToken().catch(() => {});
          await supabase.auth.signOut();
        },
      },
    ]);

  const runDelete = async () => {
    setDeleting(true);
    try {
      await deleteMyAccount(myId);
    } catch (error) {
      setDeleting(false);
      Alert.alert('Hesap silinemedi', `${errorMessage(error)}\n\nTekrar dene ya da bize yaz.`);
    }
  };

  const confirmDelete = () =>
    Alert.alert(
      'Hesabını sil',
      'Profilin, hikâyelerin, fotoğrafların, düzenlediğin etkinlikler, mesajların ve arkadaşlıkların kalıcı olarak silinir. Bu işlem geri alınamaz.',
      [
        { text: 'Vazgeç', style: 'cancel' },
        {
          text: 'Devam et',
          style: 'destructive',
          onPress: () =>
            Alert.alert('Emin misin?', 'Hesabın ve tüm verilerin şimdi silinecek.', [
              { text: 'Vazgeç', style: 'cancel' },
              { text: 'Hesabımı sil', style: 'destructive', onPress: runDelete },
            ]),
        },
      ],
    );

  return (
    <View style={{ flex: 1 }}>
      <ScrollView style={styles.container} contentContainerStyle={{ padding: 16, paddingBottom: TAB_BAR_CLEARANCE }}>
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
            onChange={(show_on_map) => save({ show_on_map })}
          />
          <Row icon="eye" label="Hikâyelerimi kimler görebilir?">
            <Segmented
              value={me?.story_audience ?? 'everyone'}
              onChange={(story_audience) => save({ story_audience })}
            />
          </Row>
          <LinkRow icon="block" label="Engellenen kişiler" onPress={() => router.push('/blocked')} last />
        </Section>
        <Text style={styles.footnote}>
          “Arkadaşlar” seçiliyse hikâyelerini ve haritadaki yerini yalnızca arkadaş olarak eklediğin kişiler görür.
        </Text>

        <Section title="Bildirimler">
          <ToggleRow
            icon="calendar"
            label="Etkinlik istekleri ve onaylar"
            value={me?.notify_invites ?? true}
            onChange={(v) => toggleNotification('notify_invites', v)}
          />
          <ToggleRow
            icon="message"
            label="Sohbet mesajları"
            value={me?.notify_messages ?? true}
            onChange={(v) => toggleNotification('notify_messages', v)}
          />
          <ToggleRow
            icon="friends"
            label="Biri beni arkadaş eklediğinde"
            value={me?.notify_friends ?? true}
            onChange={(v) => toggleNotification('notify_friends', v)}
            last
          />
        </Section>

        <Section title="Destek">
          <LinkRow icon="help" label="Yardım ve iletişim" onPress={() => WebBrowser.openBrowserAsync(LINKS.support)} />
          <LinkRow icon="mail" label="Bize e-posta gönder" onPress={() => Linking.openURL(LINKS.supportEmail)} />
          <LinkRow icon="lock" label="Gizlilik politikası" onPress={() => WebBrowser.openBrowserAsync(LINKS.privacy)} />
          <LinkRow icon="doc" label="Kullanım koşulları" onPress={() => WebBrowser.openBrowserAsync(LINKS.terms)} />
          <Row icon="info" label="Sürüm" last>
            <Text style={styles.value}>{Constants.expoConfig?.version ?? '1.0.0'}</Text>
          </Row>
        </Section>

        <Pressable style={styles.logout} onPress={signOut}>
          <Icon name="logout" color={theme.danger} size={17} />
          <Text style={styles.logoutText}>Çıkış yap</Text>
        </Pressable>

        <Pressable style={styles.deleteButton} onPress={confirmDelete} hitSlop={8}>
          <Text style={styles.deleteText}>Hesabımı sil</Text>
        </Pressable>
      </ScrollView>

      {deleting && (
        <View style={styles.overlay}>
          <ActivityIndicator color={theme.text} size="large" />
          <Text style={styles.overlayText}>Hesabın siliniyor…</Text>
        </View>
      )}
    </View>
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

function LinkRow(props: { icon: IconName; label: string; onPress: () => void; last?: boolean }) {
  return (
    <Pressable onPress={props.onPress} accessibilityRole="button">
      <Row icon={props.icon} label={props.label} last={props.last}>
        <Icon name="chevron" color={theme.muted} size={13} />
      </Row>
    </Pressable>
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
      <Toggle value={props.value} onChange={props.onChange} />
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
          accessibilityRole="radio"
          accessibilityState={{ selected: value === a.key }}
          style={[styles.segmentItem, value === a.key && styles.segmentActive]}>
          <Text style={[styles.segmentText, value === a.key && { color: theme.text }]}>{a.label}</Text>
        </Pressable>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.bg },
  profileCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    padding: 14,
    borderRadius: 18,
    backgroundColor: theme.card,
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
  footnote: { fontSize: 12, color: theme.muted, lineHeight: 17, marginTop: 8, marginHorizontal: 6 },
  card: { backgroundColor: theme.card, borderRadius: 18, overflow: 'hidden' },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 14, paddingVertical: 12 },
  rowBorder: { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: theme.border },
  iconBox: {
    width: 30,
    height: 30,
    borderRadius: 9,
    backgroundColor: theme.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  label: { flex: 1, fontSize: 15, color: theme.text },
  value: { fontSize: 15, color: theme.muted },
  segment: { flexDirection: 'row', backgroundColor: theme.surface, borderRadius: 10, padding: 2 },
  segmentItem: { paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8 },
  segmentActive: {
    backgroundColor: theme.border,
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
    backgroundColor: theme.card,
  },
  logoutText: { fontSize: 16, fontWeight: '700', color: theme.danger },
  deleteButton: { alignSelf: 'center', marginTop: 18, padding: 6 },
  deleteText: { fontSize: 14, fontWeight: '600', color: theme.muted, textDecorationLine: 'underline' },
  overlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.55)',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
  },
  overlayText: { color: theme.text, fontSize: 16, fontWeight: '700' },
});
