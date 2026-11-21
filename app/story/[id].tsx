import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, Animated, Easing, Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { showActionMenu } from '@/components/ActionMenu';
import { Avatar } from '@/components/Avatar';
import { Icon } from '@/components/Icon';
import { useSafetyActions } from '@/components/useSafetyActions';
import { theme } from '@/constants/theme';
import { useDeleteStory, useFriends, useProfile, useToggleFriend, useUserStories } from '@/lib/api';
import { errorMessage, timeAgo } from '@/lib/format';
import { useMyId } from '@/store/auth';

const STORY_DURATION = 5000;

export default function StoryScreen() {
  const { id, start } = useLocalSearchParams<{ id: string; start?: string }>();
  const myId = useMyId();
  const isMe = id === myId;
  const { data: user } = useProfile(id);
  const { data: stories = [], isLoading } = useUserStories(id);
  const { data: friends = [] } = useFriends();
  const toggleFriend = useToggleFriend();
  const deleteStory = useDeleteStory();
  const { openReport, confirmBlock } = useSafetyActions();
  const insets = useSafeAreaInsets();
  const [index, setIndex] = useState(Number(start) || 0);
  // Render sırasında ref okumamak için animasyon değeri state'te tutulur
  const [progress] = useState(() => new Animated.Value(0));

  const isFriend = friends.some((f) => f.id === id);
  const hasStories = stories.length > 0;

  const next = () => {
    if (index < stories.length - 1) setIndex(index + 1);
    else router.back();
  };
  const prev = () => {
    if (index > 0) setIndex(index - 1);
    else {
      progress.setValue(0);
      startProgress();
    }
  };

  // from: kaldığı yer (0-1); menü kapanınca hikâye kaldığı yerden devam eder
  const startProgress = (from = 0) => {
    Animated.timing(progress, {
      toValue: 1,
      duration: STORY_DURATION * (1 - from),
      easing: Easing.linear,
      useNativeDriver: false,
    }).start(({ finished }) => finished && next());
  };

  // Hikâyeler yüklenince ilerleme çubuğu başlar
  useEffect(() => {
    if (!hasStories) return;
    progress.setValue(0);
    startProgress();
    return () => progress.stopAnimation();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [index, hasStories]);

  if (!hasStories) {
    return (
      <View style={[styles.container, styles.center]}>
        {isLoading ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <>
            <Text style={styles.emptyText}>Hikâye bulunamadı</Text>
            <Pressable onPress={() => router.back()} style={{ marginTop: 16 }}>
              <Text style={styles.emptyLink}>Geri dön</Text>
            </Pressable>
          </>
        )}
      </View>
    );
  }

  const story = stories[Math.min(index, stories.length - 1)];

  const openMenu = () => {
    let pausedAt = 0;
    progress.stopAnimation((value) => {
      pausedAt = value;
    });
    const resume = () => startProgress(pausedAt);
    if (isMe) {
      showActionMenu(undefined, [
        {
          label: 'Hikâyeyi sil',
          destructive: true,
          onPress: () =>
            Alert.alert('Hikâyeyi sil', 'Bu hikâye kalıcı olarak silinecek.', [
              { text: 'Vazgeç', style: 'cancel', onPress: resume },
              {
                text: 'Sil',
                style: 'destructive',
                onPress: () =>
                  deleteStory.mutate(story, {
                    onSuccess: () => (stories.length <= 1 ? router.back() : setIndex(Math.max(0, index - 1))),
                    onError: (error) => Alert.alert('Silinemedi', errorMessage(error)),
                  }),
              },
            ]),
        },
      ], resume);
      return;
    }
    if (!user) return resume();
    showActionMenu(user.name, [
      {
        label: 'Hikâyeyi bildir',
        onPress: () => {
          router.back();
          openReport({ type: 'story', id: story.id, userId: user.id, name: user.name });
        },
      },
      { label: 'Engelle', destructive: true, onPress: () => confirmBlock(user, () => router.back()) },
    ], resume);
  };

  return (
    <View style={styles.container}>
      <Image source={story.image_url} style={StyleSheet.absoluteFill} contentFit="cover" transition={150} />
      <LinearGradient colors={['rgba(0,0,0,0.55)', 'transparent']} style={styles.topShade} />
      <LinearGradient colors={['transparent', 'rgba(0,0,0,0.7)']} style={styles.bottomShade} />

      {/* Ekranın sol / sağ yarısına dokununca önceki / sonraki hikâye */}
      <View style={StyleSheet.absoluteFill}>
        <View style={{ flex: 1, flexDirection: 'row' }}>
          <Pressable style={{ flex: 1 }} onPress={prev} />
          <Pressable style={{ flex: 2 }} onPress={next} />
        </View>
      </View>

      <View style={[styles.top, { paddingTop: insets.top + 8 }]} pointerEvents="box-none">
        <View style={styles.bars}>
          {stories.map((s, i) => (
            <View key={s.id} style={styles.barTrack}>
              <Animated.View
                style={[
                  styles.barFill,
                  {
                    width:
                      i < index
                        ? '100%'
                        : i === index
                          ? progress.interpolate({ inputRange: [0, 1], outputRange: ['0%', '100%'] })
                          : '0%',
                  },
                ]}
              />
            </View>
          ))}
        </View>
        <View style={styles.userRow}>
          <View style={styles.avatarBorder}>
            <Avatar uri={user?.avatar_url} name={user?.name ?? ''} size={31} />
          </View>
          <Text style={styles.username} numberOfLines={1}>
            {user?.username}
          </Text>
          <Text style={styles.time}>{timeAgo(story.created_at)}</Text>
          {!isMe && user && (
            <Pressable
              onPress={() => toggleFriend.mutate({ friendId: user.id, isFriend })}
              disabled={toggleFriend.isPending}
              style={[styles.friendButton, isFriend && styles.friendButtonActive]}>
              <Text style={styles.friendText}>{isFriend ? 'Arkadaşsınız' : 'Arkadaş ekle'}</Text>
            </Pressable>
          )}
          <Pressable
            onPress={openMenu}
            hitSlop={12}
            style={styles.more}
            accessibilityLabel="Seçenekler"
            accessibilityRole="button">
            <Icon name="more" color="#fff" size={20} />
          </Pressable>
          <Pressable onPress={() => router.back()} hitSlop={16} style={styles.closeButton} accessibilityLabel="Kapat">
            <Text style={styles.closeText}>✕</Text>
          </Pressable>
        </View>
      </View>

      <View style={[styles.bottom, { paddingBottom: insets.bottom + 24 }]} pointerEvents="none">
        <Text style={styles.caption}>{story.caption}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000' },
  center: { alignItems: 'center', justifyContent: 'center' },
  emptyText: { color: '#fff', fontSize: 16 },
  emptyLink: { color: theme.primary, fontSize: 16, fontWeight: '700' },
  topShade: { position: 'absolute', top: 0, left: 0, right: 0, height: 180 },
  bottomShade: { position: 'absolute', bottom: 0, left: 0, right: 0, height: 220 },
  top: { position: 'absolute', top: 0, left: 0, right: 0, paddingHorizontal: 12 },
  bars: { flexDirection: 'row', gap: 4 },
  barTrack: { flex: 1, height: 3, borderRadius: 2, backgroundColor: 'rgba(255,255,255,0.35)', overflow: 'hidden' },
  barFill: { height: '100%', backgroundColor: '#fff' },
  userRow: { flexDirection: 'row', alignItems: 'center', marginTop: 12 },
  avatarBorder: { borderRadius: 17, borderWidth: 1.5, borderColor: '#fff' },
  // Uzun kullanıcı adı kısalır; menü ve kapat düğmeleri her zaman ekranda kalır
  username: { color: '#fff', fontWeight: '700', marginLeft: 10, fontSize: 15, flexShrink: 1 },
  time: { color: 'rgba(255,255,255,0.75)', marginLeft: 8, fontSize: 13, flexShrink: 0 },
  friendButton: {
    marginLeft: 10,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 12,
    backgroundColor: theme.primary,
  },
  friendButtonActive: { backgroundColor: 'rgba(255,255,255,0.25)' },
  friendText: { color: '#fff', fontSize: 12, fontWeight: '700' },
  more: { marginLeft: 'auto', padding: 6 },
  closeButton: { marginLeft: 8, padding: 4 },
  closeText: { color: '#fff', fontSize: 22, fontWeight: '600' },
  bottom: { position: 'absolute', bottom: 0, left: 0, right: 0, paddingHorizontal: 20 },
  caption: { color: '#fff', fontSize: 20, fontWeight: '700' },
});
