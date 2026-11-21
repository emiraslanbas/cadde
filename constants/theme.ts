export const theme = {
  primary: '#2563EB',
  primaryDark: '#1D4ED8',
  bg: '#FFFFFF',
  surface: '#F6F6F8',
  text: '#16161A',
  muted: '#7A7A85',
  border: '#E6E6EB',
  private: '#6C5CE7',
  public: '#00B894',
  danger: '#E5484D',
  primarySoft: '#EEF4FF',
};

export const formatEventDate = (iso: string) =>
  new Date(iso).toLocaleString('tr-TR', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    hour: '2-digit',
    minute: '2-digit',
  });
