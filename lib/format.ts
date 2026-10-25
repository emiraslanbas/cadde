export const minutesSince = (iso: string) => Math.floor((Date.now() - new Date(iso).getTime()) / 60_000);

export const timeAgo = (iso: string) => {
  const minutes = minutesSince(iso);
  if (minutes < 1) return 'şimdi';
  if (minutes < 60) return `${minutes} dk önce`;
  if (minutes < 60 * 24) return `${Math.floor(minutes / 60)} sa önce`;
  return `${Math.floor(minutes / (60 * 24))} gün önce`;
};

export const formatTime = (iso: string) =>
  new Date(iso).toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' });

// Supabase hata mesajlarını kullanıcıya gösterilebilir Türkçe metne çevirir
export const errorMessage = (error: unknown) => {
  const message = error instanceof Error ? error.message : String((error as { message?: string })?.message ?? error);
  if (/invalid login credentials/i.test(message)) return 'E-posta ya da şifre hatalı.';
  if (/already registered|already been registered/i.test(message)) return 'Bu e-posta ile kayıtlı bir hesap zaten var.';
  if (/password should be at least/i.test(message)) return 'Şifre en az 6 karakter olmalı.';
  if (/email not confirmed/i.test(message)) return 'E-posta adresin henüz onaylanmamış.';
  if (/unable to validate email|invalid format/i.test(message)) return 'Geçerli bir e-posta adresi gir.';
  if (/network request failed|fetch failed/i.test(message)) return 'İnternet bağlantısı yok gibi görünüyor.';
  return message;
};
