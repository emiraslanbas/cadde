import { useFocusEffect } from 'expo-router';
import { decode } from 'base64-arraybuffer';
import { QueryClient, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useCallback, useEffect, useRef } from 'react';

import { supabase } from '@/lib/supabase';
import type {
  CaddeEvent,
  EventVisibility,
  MapUser,
  Message,
  Profile,
  ProfileSummary,
  Story,
} from '@/lib/types';
import { useMyId } from '@/store/auth';

export const queryClient = new QueryClient({
  defaultOptions: { queries: { staleTime: 15_000, retry: 1 } },
});

const STORY_LIFETIME_MS = 24 * 60 * 60 * 1000;
const storiesSince = () => new Date(Date.now() - STORY_LIFETIME_MS).toISOString();

const PROFILE_SUMMARY = 'id, name, username, avatar_url';

// Sekmeye geri dönülünce veriyi tazele (React Native'de pencere odağı olayı yok)
export function useRefreshOnFocus(refetch: () => unknown) {
  const first = useRef(true);
  useFocusEffect(
    useCallback(() => {
      if (first.current) {
        first.current = false;
        return;
      }
      refetch();
    }, [refetch]),
  );
}

// ───────────────────────── Profil ─────────────────────────

export function useProfile(userId: string) {
  return useQuery({
    queryKey: ['profile', userId],
    enabled: !!userId,
    queryFn: async () => {
      const { data, error } = await supabase.from('profiles').select('*').eq('id', userId).single();
      if (error) throw error;
      return data as Profile;
    },
  });
}

export function useMyProfile() {
  return useProfile(useMyId());
}

export function useUpdateProfile() {
  const myId = useMyId();
  const client = useQueryClient();
  return useMutation({
    mutationFn: async (patch: Partial<Omit<Profile, 'id'>>) => {
      const { error } = await supabase.from('profiles').update(patch).eq('id', myId);
      if (error) throw error;
    },
    onSuccess: () => {
      client.invalidateQueries({ queryKey: ['profile', myId] });
      client.invalidateQueries({ queryKey: ['map'] });
    },
  });
}

export async function isUsernameAvailable(username: string) {
  const { data, error } = await supabase.rpc('username_available', { candidate: username });
  if (error) throw error;
  return data as boolean;
}

// ───────────────────────── Fotoğraf yükleme ─────────────────────────

export async function uploadImage(userId: string, base64: string, mimeType = 'image/jpeg') {
  const ext = mimeType.split('/')[1] ?? 'jpg';
  const path = `${userId}/${Date.now()}.${ext}`;
  const { error } = await supabase.storage
    .from('media')
    .upload(path, decode(base64), { contentType: mimeType });
  if (error) throw error;
  return supabase.storage.from('media').getPublicUrl(path).data.publicUrl;
}

// ───────────────────────── Harita ve hikâyeler ─────────────────────────

// Konumu açık ve son 24 saatte hikâye paylaşmış kişiler (+ kendin, hikâyen olmasa da)
export function useMapUsers() {
  const myId = useMyId();
  return useQuery({
    queryKey: ['map'],
    refetchInterval: 30_000,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('profiles')
        .select(`${PROFILE_SUMMARY}, latitude, longitude, stories(*)`)
        .not('latitude', 'is', null)
        .gte('stories.created_at', storiesSince())
        .order('created_at', { referencedTable: 'stories', ascending: true });
      if (error) throw error;
      return (data as MapUser[]).filter((u) => u.stories.length > 0 || u.id === myId);
    },
  });
}

// Başkasının yalnızca son 24 saatteki hikâyeleri, kendinin ise tüm hikâyelerin
export function useUserStories(userId: string) {
  const myId = useMyId();
  return useQuery({
    queryKey: ['stories', userId],
    enabled: !!userId,
    queryFn: async () => {
      let query = supabase.from('stories').select('*').eq('user_id', userId);
      if (userId !== myId) query = query.gte('created_at', storiesSince());
      const { data, error } = await query.order('created_at', { ascending: true });
      if (error) throw error;
      return data as Story[];
    },
  });
}

export function useCreateStory() {
  const myId = useMyId();
  const client = useQueryClient();
  return useMutation({
    mutationFn: async (input: { base64: string; mimeType?: string; caption: string }) => {
      const imageUrl = await uploadImage(myId, input.base64, input.mimeType);
      const { error } = await supabase.from('stories').insert({ image_url: imageUrl, caption: input.caption });
      if (error) throw error;
    },
    onSuccess: () => {
      client.invalidateQueries({ queryKey: ['stories', myId] });
      client.invalidateQueries({ queryKey: ['map'] });
    },
  });
}

// ───────────────────────── Arkadaşlar ─────────────────────────

export function useFriends() {
  const myId = useMyId();
  return useQuery({
    queryKey: ['friends', myId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('friendships')
        .select(`friend:profiles!friend_id(${PROFILE_SUMMARY})`)
        .eq('user_id', myId)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return (data as unknown as { friend: ProfileSummary }[]).map((row) => row.friend);
    },
  });
}

export function useToggleFriend() {
  const myId = useMyId();
  const client = useQueryClient();
  return useMutation({
    mutationFn: async ({ friendId, isFriend }: { friendId: string; isFriend: boolean }) => {
      const { error } = isFriend
        ? await supabase.from('friendships').delete().eq('user_id', myId).eq('friend_id', friendId)
        : await supabase.from('friendships').insert({ user_id: myId, friend_id: friendId });
      if (error) throw error;
    },
    onSuccess: () => client.invalidateQueries({ queryKey: ['friends', myId] }),
  });
}

// ───────────────────────── Etkinlikler ─────────────────────────

const EVENT_SELECT = `*, host:profiles!host_id(${PROFILE_SUMMARY}), members:event_members(user_id, status, profile:profiles(${PROFILE_SUMMARY}))`;

export function useEvents() {
  return useQuery({
    queryKey: ['events'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('events')
        .select(EVENT_SELECT)
        // Geçmiş etkinlikleri 6 saat daha göster
        .gte('starts_at', new Date(Date.now() - 6 * 60 * 60 * 1000).toISOString())
        .order('starts_at', { ascending: true });
      if (error) throw error;
      return data as unknown as CaddeEvent[];
    },
  });
}

export function useEvent(eventId: string) {
  return useQuery({
    queryKey: ['event', eventId],
    enabled: !!eventId,
    queryFn: async () => {
      const { data, error } = await supabase.from('events').select(EVENT_SELECT).eq('id', eventId).single();
      if (error) throw error;
      return data as unknown as CaddeEvent;
    },
  });
}

function useInvalidateEvent() {
  const client = useQueryClient();
  return (eventId: string) => {
    client.invalidateQueries({ queryKey: ['event', eventId] });
    client.invalidateQueries({ queryKey: ['events'] });
  };
}

export function useCreateEvent() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: async (input: {
      title: string;
      description: string;
      place: string;
      starts_at: string;
      visibility: EventVisibility;
      cover_url: string;
    }) => {
      const { error } = await supabase.from('events').insert(input);
      if (error) throw error;
    },
    onSuccess: () => client.invalidateQueries({ queryKey: ['events'] }),
  });
}

// Herkese açık etkinliğe katıl ya da özel etkinliğe istek gönder
export function useJoinEvent() {
  const invalidate = useInvalidateEvent();
  return useMutation({
    mutationFn: async (event: Pick<CaddeEvent, 'id' | 'visibility'>) => {
      const status = event.visibility === 'public' ? 'joined' : 'requested';
      const { error } = await supabase.from('event_members').insert({ event_id: event.id, status });
      if (error) throw error;
      return event.id;
    },
    onSuccess: invalidate,
  });
}

// Etkinlikten ayrıl, isteği geri çek ya da (düzenleyen olarak) isteği reddet
export function useRemoveMember() {
  const invalidate = useInvalidateEvent();
  return useMutation({
    mutationFn: async ({ eventId, userId }: { eventId: string; userId: string }) => {
      const { error } = await supabase.from('event_members').delete().eq('event_id', eventId).eq('user_id', userId);
      if (error) throw error;
      return eventId;
    },
    onSuccess: invalidate,
  });
}

export function useApproveMember() {
  const invalidate = useInvalidateEvent();
  return useMutation({
    mutationFn: async ({ eventId, userId }: { eventId: string; userId: string }) => {
      const { error } = await supabase
        .from('event_members')
        .update({ status: 'joined' })
        .eq('event_id', eventId)
        .eq('user_id', userId);
      if (error) throw error;
      return eventId;
    },
    onSuccess: invalidate,
  });
}

// ───────────────────────── Sohbet ─────────────────────────

export function useMessages(eventId: string) {
  const client = useQueryClient();
  const query = useQuery({
    queryKey: ['messages', eventId],
    enabled: !!eventId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('messages')
        .select(`*, profile:profiles(${PROFILE_SUMMARY})`)
        .eq('event_id', eventId)
        .order('created_at', { ascending: true })
        .limit(500);
      if (error) throw error;
      return data as unknown as Message[];
    },
  });

  // Yeni mesaj gelince listeyi tazele
  useEffect(() => {
    if (!eventId) return;
    const channel = supabase
      .channel(`messages:${eventId}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'messages', filter: `event_id=eq.${eventId}` },
        () => client.invalidateQueries({ queryKey: ['messages', eventId] }),
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [eventId, client]);

  return query;
}

export function useSendMessage(eventId: string) {
  const client = useQueryClient();
  return useMutation({
    mutationFn: async (text: string) => {
      const { error } = await supabase.from('messages').insert({ event_id: eventId, text });
      if (error) throw error;
    },
    onSuccess: () => client.invalidateQueries({ queryKey: ['messages', eventId] }),
  });
}
