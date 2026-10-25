import { Image } from 'expo-image';
import { Link } from 'expo-router';
import { useState } from 'react';
import { ActivityIndicator, FlatList, Pressable, StyleSheet, Text, View } from 'react-native';

import { Icon } from '@/components/Icon';
import { formatEventDate, theme } from '@/constants/theme';
import { useEvents, useRefreshOnFocus } from '@/lib/api';
import type { CaddeEvent } from '@/lib/types';
import { useMyId } from '@/store/auth';

type Filter = 'all' | 'public' | 'private';

const FILTERS: { key: Filter; label: string }[] = [
  { key: 'all', label: 'Tümü' },
  { key: 'public', label: 'Herkese açık' },
  { key: 'private', label: 'Özel' },
];

export default function EventsScreen() {
  const { data: events = [], isLoading, isRefetching, refetch } = useEvents();
  const [filter, setFilter] = useState<Filter>('all');

  useRefreshOnFocus(refetch);

  // Özel etkinlikler de listede görünür; katılım istekle olur
  const visible = events.filter((e) => filter === 'all' || e.visibility === filter);

  return (
    <View style={styles.container}>
      <View style={styles.filters}>
        {FILTERS.map((f) => (
          <Pressable
            key={f.key}
            onPress={() => setFilter(f.key)}
            style={[styles.chip, filter === f.key && styles.chipActive]}>
            <Text style={[styles.chipText, filter === f.key && styles.chipTextActive]}>{f.label}</Text>
          </Pressable>
        ))}
      </View>

      <FlatList
        data={visible}
        keyExtractor={(e) => e.id}
        contentContainerStyle={{ padding: 16, paddingBottom: 100, gap: 16 }}
        renderItem={({ item }) => <EventCard event={item} />}
        refreshing={isRefetching}
        onRefresh={refetch}
        ListEmptyComponent={
          isLoading ? (
            <ActivityIndicator style={{ marginTop: 40 }} color={theme.primary} />
          ) : (
            <Text style={styles.empty}>
              {filter === 'all' ? 'Henüz etkinlik yok. İlk etkinliği sen oluştur!' : 'Bu filtrede etkinlik yok.'}
            </Text>
          )
        }
      />

      <Link href="/event/new" asChild>
        <Pressable style={styles.fab}>
          <Icon name="plus" color="#fff" size={18} />
          <Text style={styles.fabText}>Etkinlik oluştur</Text>
        </Pressable>
      </Link>
    </View>
  );
}

function EventCard({ event }: { event: CaddeEvent }) {
  const myId = useMyId();
  const hostName = event.host_id === myId ? 'Sen' : event.host?.name;
  const isPrivate = event.visibility === 'private';
  const joinedCount = event.members.filter((m) => m.status === 'joined').length;

  return (
    <Link href={`/event/${event.id}`} asChild>
      <Pressable style={styles.card}>
        <Image source={event.cover_url} style={styles.cover} />
        <View style={[styles.badge, { backgroundColor: isPrivate ? theme.private : theme.public }]}>
          <Icon name={isPrivate ? 'lock' : 'globe'} color="#fff" size={12} />
          <Text style={styles.badgeText}>{isPrivate ? 'Özel' : 'Herkese açık'}</Text>
        </View>
        <View style={styles.cardBody}>
          <Text style={styles.date}>{formatEventDate(event.starts_at)}</Text>
          <Text style={styles.title}>{event.title}</Text>
          <View style={styles.metaRow}>
            <Icon name="pin" color={theme.muted} size={14} />
            <Text style={styles.meta} numberOfLines={1}>
              {event.place} · {hostName} düzenliyor · {joinedCount} katılımcı
            </Text>
          </View>
        </View>
      </Pressable>
    </Link>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.surface },
  filters: { flexDirection: 'row', gap: 8, paddingHorizontal: 16, paddingTop: 12 },
  chip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: theme.border,
  },
  chipActive: { backgroundColor: theme.text, borderColor: theme.text },
  chipText: { fontSize: 14, fontWeight: '600', color: theme.text },
  chipTextActive: { color: '#fff' },
  card: { backgroundColor: '#fff', borderRadius: 18, overflow: 'hidden' },
  cover: { width: '100%', height: 150, backgroundColor: theme.border },
  badge: { flexDirection: 'row', alignItems: 'center', gap: 5, position: 'absolute', top: 12, left: 12, paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12 },
  badgeText: { color: '#fff', fontSize: 12, fontWeight: '700' },
  cardBody: { padding: 14 },
  date: { fontSize: 13, fontWeight: '700', color: theme.primary, textTransform: 'capitalize' },
  title: { fontSize: 18, fontWeight: '800', color: theme.text, marginTop: 4 },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 6 },
  meta: { fontSize: 13, color: theme.muted, flexShrink: 1 },
  empty: { textAlign: 'center', color: theme.muted, marginTop: 40 },
  fab: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    position: 'absolute',
    bottom: 20,
    alignSelf: 'center',
    backgroundColor: theme.primary,
    paddingHorizontal: 22,
    paddingVertical: 14,
    borderRadius: 28,
    shadowColor: theme.primaryDark,
    shadowOpacity: 0.35,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 6,
  },
  fabText: { color: '#fff', fontWeight: '800', fontSize: 16 },
});
