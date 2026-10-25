import { Image } from 'expo-image';
import * as ImagePicker from 'expo-image-picker';
import { Link, router } from 'expo-router';
import { useState } from 'react';
import { ActivityIndicator, Alert, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { Avatar } from '@/components/Avatar';
import { Icon } from '@/components/Icon';
import { theme } from '@/constants/theme';
import {
  uploadImage,
  useEvents,
  useFriends,
  useMyProfile,
  useRefreshOnFocus,
  useUpdateProfile,
  useUserStories,
} from '@/lib/api';
import { errorMessage, timeAgo } from '@/lib/format';
import { useMyId } from '@/store/auth';

export default function ProfileScreen() {
  const myId = useMyId();
  const { data: me, refetch: refetchMe } = useMyProfile();
  const { data: stories = [], refetch: refetchStories } = useUserStories(myId);
  const { data: friends = [], refetch: refetchFriends } = useFriends();
  const { data: events = [] } = useEvents();
  const updateProfile = useUpdateProfile();
  const [uploading, setUploading] = useState(false);

  useRefreshOnFocus(refetchMe);
  useRefreshOnFocus(refetchStories);
  useRefreshOnFocus(refetchFriends);

  // Yaklaşan etkinliklerden katıldıkların ve düzenlediklerin
  const totalEvents = events.filter((e) => e.members.some((m) => m.user_id === myId && m.status === 'joined')).length;

  // Sistem fotoğraf seçicisi tüm galeriye erişim izni istemeden çalışır
  const pickAvatar = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.6,
      base64: true,
    });
    const asset = result.assets?.[0];
    if (result.canceled || !asset?.base64) return;
    setUploading(true);
    try {
      const url = await uploadImage(myId, asset.base64, asset.mimeType);
      await updateProfile.mutateAsync({ avatar_url: url });
    } catch (error) {
      Alert.alert('Fotoğraf yüklenemedi', errorMessage(error));
    } finally {
      setUploading(false);
    }
  };

  if (!me) {
    return (
      <View style={[styles.container, { alignItems: 'center', justifyContent: 'center' }]}>
        <ActivityIndicator color={theme.primary} />
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Pressable onPress={pickAvatar} style={styles.avatarWrap} disabled={uploading}>
        <Avatar uri={me.avatar_url} name={me.name} size={104} />
        {uploading && (
          <View style={styles.uploading}>
            <ActivityIndicator color="#fff" />
          </View>
        )}
        <View style={styles.cameraBadge}>
          <Icon name="camera" color="#fff" size={15} />
        </View>
      </Pressable>

      <Text style={styles.name}>{me.name}</Text>
      <Text style={styles.username}>@{me.username}</Text>

      <Link href="/profile/edit" asChild>
        <Pressable style={styles.editButton}>
          <Text style={styles.editText}>Profili düzenle</Text>
        </Pressable>
      </Link>

      <View style={styles.stats}>
        <Stat value={friends.length} label="Arkadaş" />
        <View style={styles.divider} />
        <Stat value={totalEvents} label="Etkinlik" />
        <View style={styles.divider} />
        <Stat value={stories.length} label="Hikâye" />
      </View>

      <Text style={styles.section}>Hikâyelerim</Text>
      {stories.length === 0 ? (
        <Pressable style={styles.emptyStories} onPress={() => router.push('/story/new')}>
          <Icon name="camera" color={theme.primary} size={22} />
          <Text style={styles.emptyTitle}>Henüz hikâye paylaşmadın</Text>
          <Text style={styles.emptyLink}>İlk hikâyeni paylaş</Text>
        </Pressable>
      ) : (
        <View style={styles.grid}>
          {/* En yeni hikâye başta */}
          {[...stories].reverse().map((story) => (
            <Pressable
              key={story.id}
              style={styles.tile}
              onPress={() =>
                router.push({
                  pathname: '/story/[id]',
                  params: { id: myId, start: String(stories.indexOf(story)) },
                })
              }>
              <Image source={story.image_url} style={StyleSheet.absoluteFill} contentFit="cover" />
              <Text style={styles.tileTime}>{timeAgo(story.created_at)}</Text>
            </Pressable>
          ))}
        </View>
      )}

      <Text style={styles.section}>Arkadaşlar</Text>
      {friends.length === 0 ? (
        <Text style={styles.emptyFriends}>
          Haritada birinin hikâyesini açıp "Arkadaş ekle"ye basarak arkadaş ekleyebilirsin.
        </Text>
      ) : (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 14 }}>
          {friends.map((f) => (
            <View key={f.id} style={styles.friend}>
              <View style={styles.friendRing}>
                <Avatar uri={f.avatar_url} name={f.name} size={52} />
              </View>
              <Text style={styles.friendName} numberOfLines={1}>
                {f.name}
              </Text>
            </View>
          ))}
        </ScrollView>
      )}
    </ScrollView>
  );
}

function Stat({ value, label }: { value: number; label: string }) {
  return (
    <View style={{ alignItems: 'center', flex: 1 }}>
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  content: { alignItems: 'center', paddingTop: 32, paddingHorizontal: 20, paddingBottom: 40 },
  avatarWrap: { position: 'relative' },
  uploading: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    borderRadius: 52,
    backgroundColor: 'rgba(0,0,0,0.4)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyFriends: { alignSelf: 'flex-start', fontSize: 14, color: theme.muted, lineHeight: 20 },
  friendRing: { borderRadius: 30, borderWidth: 2, borderColor: theme.primary, padding: 1 },
  cameraBadge: {
    position: 'absolute',
    right: 0,
    bottom: 2,
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: theme.text,
    borderWidth: 3,
    borderColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
  },
  name: { fontSize: 22, fontWeight: '800', color: theme.text, marginTop: 14 },
  username: { fontSize: 15, color: theme.muted, marginTop: 2 },
  editButton: {
    marginTop: 16,
    paddingHorizontal: 22,
    paddingVertical: 10,
    borderRadius: 20,
    backgroundColor: theme.surface,
  },
  editText: { fontSize: 14, fontWeight: '700', color: theme.text },
  stats: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 24,
    paddingVertical: 16,
    width: '100%',
    borderRadius: 18,
    backgroundColor: theme.surface,
  },
  divider: { width: 1, height: 32, backgroundColor: theme.border },
  statValue: { fontSize: 22, fontWeight: '800', color: theme.text },
  statLabel: { fontSize: 13, color: theme.muted, marginTop: 2 },
  section: {
    alignSelf: 'flex-start',
    fontSize: 17,
    fontWeight: '800',
    color: theme.text,
    marginTop: 28,
    marginBottom: 12,
  },
  emptyStories: {
    width: '100%',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 24,
    borderRadius: 18,
    borderWidth: 2,
    borderStyle: 'dashed',
    borderColor: theme.border,
  },
  emptyTitle: { fontSize: 15, color: theme.muted },
  emptyLink: { fontSize: 15, fontWeight: '700', color: theme.primary },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, width: '100%' },
  tile: {
    width: '32%',
    aspectRatio: 9 / 16,
    borderRadius: 12,
    overflow: 'hidden',
    backgroundColor: theme.surface,
    justifyContent: 'flex-end',
  },
  tileTime: {
    margin: 6,
    alignSelf: 'flex-start',
    fontSize: 11,
    fontWeight: '700',
    color: '#fff',
    backgroundColor: 'rgba(0,0,0,0.45)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 8,
    overflow: 'hidden',
  },
  friend: { alignItems: 'center', width: 64 },
  friendName: { fontSize: 12, color: theme.text, marginTop: 6 },
});
