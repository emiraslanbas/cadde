export const theme = {
  primary: '#FF4D6D',
  primaryDark: '#C9184A',
  bg: '#FFFFFF',
  surface: '#F6F6F8',
  text: '#16161A',
  muted: '#7A7A85',
  border: '#E6E6EB',
  private: '#6C5CE7',
  public: '#00B894',
};

export const formatEventDate = (iso: string) =>
  new Date(iso).toLocaleString('tr-TR', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    hour: '2-digit',
    minute: '2-digit',
  });
