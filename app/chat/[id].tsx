import { Stack, useLocalSearchParams } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Icon } from '@/components/Icon';
import { Avatar } from '@/components/Avatar';
import { theme } from '@/constants/theme';
import { useEvent, useMessages, useSendMessage } from '@/lib/api';
import { errorMessage, formatTime } from '@/lib/format';
import type { Message } from '@/lib/types';
import { useMyId } from '@/store/auth';

export default function EventChatScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const myId = useMyId();
  const { data: event } = useEvent(id);
  const { data: messages = [], isLoading } = useMessages(id);
  const sendMessage = useSendMessage(id);
  const [text, setText] = useState('');
  const listRef = useRef<FlatList<Message>>(null);
  const insets = useSafeAreaInsets();

  useEffect(() => {
    const t = setTimeout(() => listRef.current?.scrollToEnd({ animated: true }), 50);
    return () => clearTimeout(t);
  }, [messages.length]);

  if (!event) return null;

  const send = () => {
    const clean = text.trim();
    if (!clean) return;
    setText('');
    sendMessage.mutate(clean, {
      onError: (error) => {
        setText(clean);
        Alert.alert('Mesaj gönderilemedi', errorMessage(error));
      },
    });
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={Platform.OS === 'ios' ? insets.top + 44 : 0}>
      <Stack.Screen
        options={{
          title: event.title,
          headerTitle: () => (
            <View style={{ alignItems: 'center' }}>
              <Text style={styles.headerTitle} numberOfLines={1}>
                {event.title}
              </Text>
              <Text style={styles.headerSubtitle}>{event.members.filter((m) => m.status === 'joined').length} kişi</Text>
            </View>
          ),
        }}
      />

      <FlatList
        ref={listRef}
        data={messages}
        keyExtractor={(m) => m.id}
        contentContainerStyle={{ padding: 16, gap: 10 }}
        ListEmptyComponent={
          isLoading ? (
            <ActivityIndicator style={{ marginTop: 40 }} color={theme.primary} />
          ) : (
            <Text style={styles.empty}>Henüz mesaj yok. Sohbeti sen başlat!</Text>
          )
        }
        renderItem={({ item, index }) => (
          <MessageBubble
            message={item}
            mine={item.user_id === myId}
            showAuthor={messages[index - 1]?.user_id !== item.user_id}
          />
        )}
      />

      <View style={[styles.composer, { paddingBottom: Math.max(insets.bottom, 10) }]}>
        <TextInput
          style={styles.input}
          value={text}
          onChangeText={setText}
          placeholder="Mesaj yaz…"
          multiline
        />
        <Pressable onPress={send} style={[styles.sendButton, !text.trim() && { opacity: 0.4 }]}>
          <Icon name="send" color="#fff" size={18} />
        </Pressable>
      </View>
    </KeyboardAvoidingView>
  );
}

function MessageBubble({ message, mine, showAuthor }: { message: Message; mine: boolean; showAuthor: boolean }) {
  const author = message.profile;

  return (
    <View style={[styles.row, mine && { justifyContent: 'flex-end' }]}>
      {!mine && (
        <View style={{ width: 32 }}>
          {showAuthor && author && <Avatar uri={author.avatar_url} name={author.name} size={26} />}
        </View>
      )}
      <View style={{ maxWidth: '75%' }}>
        {!mine && showAuthor && <Text style={styles.author}>{author?.name}</Text>}
        <View style={[styles.bubble, mine ? styles.bubbleMine : styles.bubbleOther]}>
          <Text style={[styles.msgText, mine && { color: '#fff' }]}>{message.text}</Text>
          <Text style={[styles.time, mine && { color: 'rgba(255,255,255,0.75)' }]}>
            {formatTime(message.created_at)}
          </Text>
        </View>
      </View>
      {mine && showAuthor && (
        <View style={{ marginLeft: 6, alignSelf: 'flex-end' }}>
          <Avatar uri={author?.avatar_url} name={author?.name ?? ''} size={26} />
        </View>
      )}
      {mine && !showAuthor && <View style={{ width: 32 }} />}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.surface },
  headerTitle: { fontSize: 16, fontWeight: '700', color: theme.text, maxWidth: 220 },
  headerSubtitle: { fontSize: 12, color: theme.muted },
  empty: { textAlign: 'center', color: theme.muted, marginTop: 40 },
  row: { flexDirection: 'row', alignItems: 'flex-end' },
  author: { fontSize: 12, fontWeight: '700', color: theme.muted, marginBottom: 3, marginLeft: 4 },
  bubble: { paddingHorizontal: 14, paddingVertical: 9, borderRadius: 18 },
  bubbleMine: { backgroundColor: theme.primary, borderBottomRightRadius: 6 },
  bubbleOther: { backgroundColor: '#fff', borderBottomLeftRadius: 6 },
  msgText: { fontSize: 16, color: theme.text, lineHeight: 21 },
  time: { fontSize: 11, color: theme.muted, marginTop: 3, alignSelf: 'flex-end' },
  composer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 8,
    paddingHorizontal: 12,
    paddingTop: 10,
    backgroundColor: '#fff',
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: theme.border,
  },
  input: {
    flex: 1,
    maxHeight: 110,
    backgroundColor: theme.surface,
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingTop: 10,
    paddingBottom: 10,
    fontSize: 16,
    color: theme.text,
  },
  sendButton: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: theme.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
