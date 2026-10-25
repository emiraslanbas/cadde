# Cadde

Konum tabanlı sosyalleşme uygulaması (Expo + React Native).

## Demo nasıl açılır

1. Telefona App Store / Play Store'dan **Expo Go** uygulamasını indir.
2. Bilgisayarda proje klasöründe:
   ```bash
   npx expo start
   ```
3. Terminalde çıkan QR kodu telefonun kamerasıyla (iPhone) ya da Expo Go içinden (Android) okut.

Telefon ve bilgisayar aynı Wi-Fi'da olmalı. Farklı ağdaysanız `npx expo start --tunnel` kullanın.

## Neler var

- **Hesaplar:** E-posta ve şifreyle kayıt / giriş. Kayıtta isim ve kullanıcı adı seçilir.
- **Harita:** Son 24 saatte hikâye paylaşan, konumu açık kişiler. Konum gizlilik için ~100 m'ye yuvarlanır; Ayarlar'dan kapatınca veritabanından da silinir.
- **Hikâyeler:** Alt menünün ortasındaki **+** ile kamera ya da galeriden paylaşılır, Supabase Storage'a yüklenir. Haritada 24 saat, profilde süresiz görünür.
- **Etkinlikler:** Herkese açık etkinliğe direkt katılınır, özel etkinliğe istek gönderilir; düzenleyen istekleri etkinlik sayfasında onaylar / reddeder. Katılımcılar etkinlik sohbetinde anlık mesajlaşır.
- **Profil:** Profil fotoğrafı, isim / kullanıcı adı düzenleme, arkadaş / etkinlik / hikâye sayıları. Arkadaş eklemek için birinin hikâyesinde "Arkadaş ekle"ye basılır.
- **Ayarlar:** Konumu haritada gösterme, çıkış. (Hikâye görünürlüğü ve bildirim tercihleri henüz sadece arayüzde.)

## Backend (Supabase)

- Bağlantı bilgileri `.env` dosyasında (`EXPO_PUBLIC_SUPABASE_URL`, `EXPO_PUBLIC_SUPABASE_KEY`). Buradaki anahtar herkese açık (publishable) anahtardır; `service_role` / secret anahtar asla buraya ya da koda konmaz.
- Veritabanı şeması, güvenlik kuralları (RLS) ve fotoğraf deposu: `supabase/migrations/`.
- Şemada değişiklik yapınca yeni bir migration dosyası ekleyip uygulayın:
  ```bash
  npx supabase migration new degisiklik_adi
  npx supabase db push
  ```
- Supabase ayarları `supabase/config.toml` içinde. `npx supabase config push` göndermeden önce farkı gösterir; yalnızca değiştirmek istediğiniz satırların farklı olduğundan emin olun.

## Yapı

```
app/(tabs)/index.tsx     Harita
app/(tabs)/events.tsx    Etkinlik listesi
app/(tabs)/profile.tsx   Profil
app/(tabs)/settings.tsx  Ayarlar
app/profile/edit.tsx     Profil düzenleme
app/chat/[id].tsx        Etkinlik sohbeti
app/story/[id].tsx       Hikâye görüntüleyici
app/story/new.tsx        Hikâye paylaşma
app/event/new.tsx        Etkinlik oluşturma
app/event/[id].tsx       Etkinlik detayı
app/sign-in.tsx          Giriş
app/sign-up.tsx          Kayıt
lib/api.ts               Supabase sorguları ve işlemleri (TanStack Query)
lib/supabase.ts          Supabase bağlantısı
store/                   Oturum ve yerel ayarlar (zustand)
supabase/                Veritabanı migration'ları ve ayarlar
```
