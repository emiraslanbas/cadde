import { Image } from 'expo-image';
import { router, Stack, useLocalSearchParams } from 'expo-router';
import { ActivityIndicator, Alert, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { Avatar } from '@/components/Avatar';
import { Icon, IconName } from '@/components/Icon';
import { formatEventDate, theme } from '@/constants/theme';
import { useApproveMember, useEvent, useJoinEvent, useRefreshOnFocus, useRemoveMember } from '@/lib/api';
import { errorMessage } from '@/lib/format';
import { useMyId } from '@/store/auth';

const onError = (error: unknown) => Alert.alert('İşlem yapılamadı', errorMessage(error));

export default function EventDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const myId = useMyId();
  const { data: event, isLoading, refetch } = useEvent(id);
  const join = useJoinEvent();
  const remove = useRemoveMember();
  const approve = useApproveMember();

  useRefreshOnFocus(refetch);

  if (!event) {
    return (
      <View style={[styles.container, styles.center]}>
        {isLoading ? (
          <ActivityIndicator color={theme.primary} />
        ) : (
          <Text style={styles.hint}>Etkinlik bulunamadı.</Text>
        )}
      </View>
    );
  }

  const isHost = event.host_id === myId;
  const isPrivate = event.visibility === 'private';
  const myStatus = event.members.find((m) => m.user_id === myId)?.status;
  const attending = myStatus === 'joined';
  const requested = myStatus === 'requested';
  const joined = event.members.filter((m) => m.status === 'joined');
  const requests = event.members.filter((m) => m.status === 'requested');
  const busy = join.isPending || remove.isPending;

  const leave = () =>
    Alert.alert('Etkinlikten ayrıl', 'Etkinlikten ve sohbetinden ayrılmak istediğine emin misin?', [
      { text: 'Vazgeç', style: 'cancel' },
      {
        text: 'Ayrıl',
        style: 'destructive',
        onPress: () => remove.mutate({ eventId: event.id, userId: myId }, { onError }),
      },
    ]);

  return (
    <ScrollView style={styles.container} contentContainerStyle={{ paddingBottom: 40 }}>
      <Stack.Screen options={{ title: event.title }} />
      {event.cover_url && <Image source={event.cover_url} style={styles.cover} />}
      <View style={styles.body}>
        <InfoRow
          icon={isPrivate ? 'lock' : 'globe'}
          text={isPrivate ? 'Özel etkinlik · istekle katılım' : 'Herkese açık'}
          muted
        />
        <Text style={styles.title}>{event.title}</Text>
        <InfoRow icon="calendar" text={formatEventDate(event.starts_at)} />
        <InfoRow icon="pin" text={event.place} />
        <InfoRow icon="person" text={`${isHost ? 'Sen' : event.host?.name} düzenliyor`} />

        {event.description ? <Text style={styles.description}>{event.description}</Text> : null}

        {isHost && requests.length > 0 && (
          <>
            <Text style={styles.section}>Katılma istekleri ({requests.length})</Text>
            {requests.map((m) => (
              <View key={m.user_id} style={styles.requestRow}>
                <Avatar uri={m.profile?.avatar_url} name={m.profile?.name ?? ''} size={42} />
                <View style={{ flex: 1 }}>
                  <Text style={styles.requestName}>{m.profile?.name}</Text>
                  <Text style={styles.requestUsername}>@{m.profile?.username}</Text>
                </View>
                <Pressable
                  style={[styles.smallButton, styles.rejectButton]}
                  disabled={remove.isPending}
                  onPress={() => remove.mutate({ eventId: event.id, userId: m.user_id }, { onError })}>
                  <Text style={[styles.smallButtonText, { color: theme.muted }]}>Reddet</Text>
                </Pressable>
                <Pressable
                  style={styles.smallButton}
                  disabled={approve.isPending}
                  onPress={() => approve.mutate({ eventId: event.id, userId: m.user_id }, { onError })}>
                  <Text style={styles.smallButtonText}>Onayla</Text>
                </Pressable>
              </View>
            ))}
          </>
        )}

        <Text style={styles.section}>Katılımcılar ({joined.length})</Text>
        <View style={styles.avatars}>
          {joined.map((m) => (
            <View key={m.user_id} style={styles.attendee}>
              <Avatar uri={m.profile?.avatar_url} name={m.profile?.name ?? ''} size={50} />
              <Text style={styles.avatarName} numberOfLines={1}>
                {m.user_id === myId ? 'Sen' : m.profile?.name.split(' ')[0]}
              </Text>
            </View>
          ))}
        </View>

        <View style={styles.actions}>
          {isHost ? null : attending ? (
            <ActionButton label="Katılıyorsun" icon="check" variant="outline" onPress={leave} disabled={busy} />
          ) : requested ? (
            <ActionButton
              label="İstek gönderildi"
              icon="clock"
              variant="muted"
              disabled={busy}
              onPress={() => remove.mutate({ eventId: event.id, userId: myId }, { onError })}
            />
          ) : (
            <ActionButton
              label={isPrivate ? 'Katılma isteği gönder' : 'Katıl'}
              icon={isPrivate ? 'lock' : undefined}
              variant="filled"
              disabled={busy}
              onPress={() => join.mutate(event, { onError })}
            />
          )}

          {(isHost || attending) && (
            <ActionButton
              label="Sohbet"
              icon="chat"
              variant="filled"
              onPress={() => router.push(`/chat/${event.id}`)}
            />
          )}
        </View>

        {isPrivate && !isHost && !attending && (
          <Text style={styles.hint}>
            {requested
              ? `${event.host?.name ?? 'Düzenleyen'} isteğini onaylayınca etkinliğe ve sohbete katılabileceksin. İsteği geri çekmek için butona tekrar dokun.`
              : 'Bu özel bir etkinlik. Düzenleyen kişi isteğini onaylarsa katılabilirsin.'}
          </Text>
        )}
      </View>
    </ScrollView>
  );
}

function ActionButton(props: {
  label: string;
  icon?: IconName;
  variant: 'filled' | 'outline' | 'muted';
  onPress: () => void;
  disabled?: boolean;
}) {
  const color = props.variant === 'filled' ? '#fff' : props.variant === 'outline' ? theme.primary : theme.muted;
  return (
    <Pressable
      onPress={props.onPress}
      disabled={props.disabled}
      style={[
        styles.button,
        props.variant === 'filled' && styles.buttonFilled,
        props.variant === 'outline' && styles.buttonOutline,
        props.variant === 'muted' && styles.buttonMuted,
        props.disabled && { opacity: 0.6 },
      ]}>
      {props.icon && <Icon name={props.icon} color={color} size={17} />}
      <Text style={[styles.buttonText, { color }]}>{props.label}</Text>
    </Pressable>
  );
}

function InfoRow({ icon, text, muted }: { icon: IconName; text: string; muted?: boolean }) {
  return (
    <View style={styles.infoRow}>
      <Icon name={icon} color={muted ? theme.muted : theme.primary} size={16} />
      <Text style={[styles.info, muted && styles.badge]}>{text}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  center: { alignItems: 'center', justifyContent: 'center' },
  cover: { width: '100%', height: 220, backgroundColor: theme.border },
  body: { padding: 20 },
  badge: { fontSize: 13, fontWeight: '700', color: theme.muted },
  title: { fontSize: 26, fontWeight: '800', color: theme.text, marginTop: 2, marginBottom: 12 },
  infoRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8 },
  info: { fontSize: 15, color: theme.text },
  description: { fontSize: 15, color: theme.text, lineHeight: 22, marginTop: 12 },
  section: { fontSize: 17, fontWeight: '800', color: theme.text, marginTop: 24, marginBottom: 12 },
  requestRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 12 },
  requestName: { fontSize: 15, fontWeight: '700', color: theme.text },
  requestUsername: { fontSize: 13, color: theme.muted },
  smallButton: { paddingHorizontal: 12, paddingVertical: 8, borderRadius: 12, backgroundColor: theme.primary },
  rejectButton: { backgroundColor: theme.surface },
  smallButtonText: { fontSize: 13, fontWeight: '700', color: '#fff' },
  avatars: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  attendee: { alignItems: 'center', width: 58 },
  avatarName: { fontSize: 12, color: theme.muted, marginTop: 4 },
  actions: { flexDirection: 'row', gap: 10, marginTop: 28 },
  button: {
    flex: 1,
    flexDirection: 'row',
    gap: 8,
    borderRadius: 16,
    paddingVertical: 15,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: 'transparent',
  },
  buttonFilled: { backgroundColor: theme.primary, borderColor: theme.primary },
  buttonOutline: { backgroundColor: '#fff', borderColor: theme.primary },
  buttonMuted: { backgroundColor: theme.surface, borderColor: theme.border },
  buttonText: { fontSize: 16, fontWeight: '800' },
  hint: { fontSize: 13, color: theme.muted, lineHeight: 19, marginTop: 12, textAlign: 'center' },
});
