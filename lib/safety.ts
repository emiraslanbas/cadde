// Güvenlik ve hesap işlemleri: engelleme, bildirme (şikâyet), hesap silme
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { unregisterPushToken } from '@/lib/notifications';
import { supabase } from '@/lib/supabase';
import type { ProfileSummary, ReportReason, ReportTarget } from '@/lib/types';
import { useMyId } from '@/store/auth';

const UNIQUE_VIOLATION = '23505';
const STORAGE_PAGE_SIZE = 100;

// ───────────────────────── Engelleme ─────────────────────────

export function useBlockedUsers() {
  const myId = useMyId();
  return useQuery({
    queryKey: ['blocks', myId],
    queryFn: async () => {
      const { data, error } = await supabase.rpc('my_blocked_users');
      if (error) throw error;
      return data as ProfileSummary[];
    },
  });
}

export function useBlockUser() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: async (userId: string) => {
      const { error } = await supabase.from('blocks').insert({ blocked_id: userId });
      if (error && error.code !== UNIQUE_VIOLATION) throw error;
    },
    // Engellenen kişi harita, hikâye, etkinlik ve sohbetlerden hemen kaybolsun.
    // invalidate yetmez: artık görünmeyen kayıt hata döner ve eski veri ekranda kalır.
    onSuccess: () => client.resetQueries(),
  });
}

export function useUnblockUser() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: async (userId: string) => {
      const { error } = await supabase.from('blocks').delete().eq('blocked_id', userId);
      if (error) throw error;
    },
    onSuccess: () => client.invalidateQueries(),
  });
}

// ───────────────────────── Bildirme ─────────────────────────

export type ReportInput = {
  targetType: ReportTarget;
  targetId: string;
  targetUserId?: string;
  reason: ReportReason;
  details: string;
};

export function useReport() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: async (input: ReportInput) => {
      const { error } = await supabase.from('reports').insert({
        target_type: input.targetType,
        target_id: input.targetId,
        target_user_id: input.targetUserId ?? null,
        reason: input.reason,
        details: input.details.trim().slice(0, 500),
      });
      // Aynı içeriği ikinci kez bildirmek hata sayılmaz
      if (error && error.code !== UNIQUE_VIOLATION) throw error;
    },
    // Bildirilen içerik bildiren kişiye artık gösterilmez (eski veri önbellekte kalmasın)
    onSuccess: () => client.resetQueries(),
  });
}

// ───────────────────────── Hesap silme ─────────────────────────

async function deleteMyFiles(userId: string) {
  const bucket = supabase.storage.from('media');
  for (;;) {
    const { data, error } = await bucket.list(userId, { limit: STORAGE_PAGE_SIZE });
    if (error) throw error;
    if (!data || data.length === 0) return;
    const { data: removed, error: removeError } = await bucket.remove(data.map((file) => `${userId}/${file.name}`));
    if (removeError) throw removeError;
    // Depo izni silmeye izin vermezse hata vermeden boş döner; sonsuz döngüye girmeyelim
    if (!removed || removed.length === 0) throw new Error('Fotoğrafların silinemedi.');
  }
}

// Önce fotoğraflar depodan, sonra hesap ve ona bağlı tüm veriler veritabanından silinir.
// Fotoğraflar silinemezse hesap silinmez; kullanıcı tekrar deneyebilir.
export async function deleteMyAccount(userId: string) {
  await deleteMyFiles(userId);
  await unregisterPushToken();
  const { error } = await supabase.rpc('delete_my_account');
  if (error) throw error;
  await supabase.auth.signOut({ scope: 'local' });
}
