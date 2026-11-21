// Koyu tema: gece fotoğrafları ve etkinlikler siyah zeminde öne çıkar; vurgu rengi marka mavisi
export const theme = {
  primary: '#3B82F6',
  primaryDark: '#2563EB',
  primarySoft: 'rgba(59,130,246,0.16)',
  onPrimary: '#FFFFFF',
  bg: '#0A0A0D',
  card: '#15151A',
  surface: '#1F1F26',
  text: '#F4F4F6',
  muted: '#8B8B96',
  border: '#26262E',
  glass: 'rgba(20,20,26,0.86)',
  glassBorder: 'rgba(255,255,255,0.08)',
  private: '#8B7CF6',
  public: '#10B981',
  danger: '#FF5A5F',
  // Hikâye halkası ve vurgu parıltısı: maviden mora
  glow: ['#60A5FA', '#3B82F6', '#8B5CF6'] as const,
};

// Yüzen alt menü: kaydırılan içerik altında kalmasın diye ekranlar bu kadar boşluk bırakır
export const TAB_BAR_HEIGHT = 64;
export const TAB_BAR_CLEARANCE = TAB_BAR_HEIGHT + 56;

export const formatEventDate = (iso: string) =>
  new Date(iso).toLocaleString('tr-TR', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    hour: '2-digit',
    minute: '2-digit',
  });
