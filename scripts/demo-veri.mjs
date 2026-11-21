#!/usr/bin/env node
// Uygulamayı dolu göstermek için örnek kişiler, hikâyeler ve etkinlikler.
//
//   node scripts/demo-veri.mjs ekle   → demo hesapları açar (yoksa) ve paylaşımları baştan yükler
//   node scripts/demo-veri.mjs sil    → demo hesapları ve tüm paylaşımlarını siler
//
// Hikâyeler haritada 24 saat görünür; süre dolunca "ekle"yi tekrar çalıştırmak yeterli.
// Hesap bilgileri scripts/.demo-hesaplar.json dosyasında tutulur (git'e girmez).
// Fotoğraflar picsum.photos'tan (Unsplash lisanslı, ücretsiz) alınır.
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { randomBytes } from 'node:crypto';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const ACCOUNTS_FILE = join(ROOT, 'scripts/.demo-hesaplar.json');
const env = readFileSync(join(ROOT, '.env'), 'utf8');
const SUPABASE_URL = env.match(/EXPO_PUBLIC_SUPABASE_URL=(\S+)/)?.[1]?.replace(/\/$/, '');
const SUPABASE_KEY = env.match(/EXPO_PUBLIC_SUPABASE_KEY=(\S+)/)?.[1];
if (!SUPABASE_URL || !SUPABASE_KEY) throw new Error('.env içinde Supabase bilgileri yok');

const MINUTE = 60_000;
const HOUR = 60 * MINUTE;
const DAY = 24 * HOUR;
const photo = (id, w, h) => `https://picsum.photos/id/${id}/${w}/${h}`;

// Bugünden `day` gün sonra, bu bilgisayarın saatiyle hour:minute (geçmişte kalırsa bir gün ileri)
function nextAt({ day, hour, minute }) {
  const date = new Date();
  date.setDate(date.getDate() + day);
  date.setHours(hour, minute, 0, 0);
  if (date.getTime() < Date.now()) date.setDate(date.getDate() + 1);
  return date.toISOString();
}

// Kadıköy çevresi; konumlar uygulamadaki gibi ~100 m'ye yuvarlanmış
const PEOPLE = [
  {
    key: 'ilayda', name: 'İlayda', lat: 40.981, lng: 29.024,
    stories: [
      { photo: 1065, caption: 'Moda’ya iniyoruz 🌊', ago: 25 * MINUTE },
      { photo: 1051, caption: 'Sessiz bir sabah', ago: 3 * DAY },
    ],
  },
  {
    key: 'berke', name: 'Berke', lat: 40.993, lng: 29.031,
    stories: [
      { photo: 1078, caption: 'Bu gece efsane geçti 🔥', ago: 12 * MINUTE },
      { photo: 1067, caption: 'Akşam manzarası', ago: 2 * DAY },
    ],
  },
  {
    key: 'defne', name: 'Defne', lat: 40.997, lng: 29.023,
    stories: [{ photo: 1047, caption: 'Yeldeğirmeni sokakları', ago: 2 * HOUR }],
  },
  {
    key: 'mert', name: 'Mert', lat: 40.966, lng: 29.064,
    stories: [
      { photo: 1083, caption: 'Tekne turu ⛵', ago: 5 * HOUR },
      { photo: 1019, caption: 'Sahilde rüzgâr', ago: 4 * DAY },
    ],
  },
  {
    key: 'zeynep', name: 'Zeynep', lat: 40.972, lng: 29.04,
    stories: [
      { photo: 1062, caption: 'Bugünün yıldızı 🐶', ago: 50 * MINUTE },
      { photo: 1080, caption: 'Pazar alışverişi 🍓', ago: 6 * DAY },
    ],
  },
];

const EVENTS = [
  {
    host: 'ilayda', title: 'Moda sahilinde gün batımı', place: 'Moda Sahili, Kadıköy', at: { day: 0, hour: 19, minute: 0 },
    visibility: 'public', cover: 1065,
    description: 'Herkes kendi içeceğini getirsin, müzik bizden. Hava kararınca Moda Parkı’na geçeriz.',
    members: ['berke', 'defne', 'zeynep'],
    chat: [
      ['ilayda', 'Saat 7 gibi sahilde olurum'],
      ['berke', 'Ben biraz geç kalırım, yer tutun 🙏'],
      ['defne', 'Hoparlörü getiriyorum 🎶'],
      ['zeynep', 'Ben de simit alırım'],
    ],
  },
  {
    host: 'berke', title: 'Kadıköy’de caz gecesi', place: 'Kadıköy Sahne', at: { day: 1, hour: 21, minute: 0 },
    visibility: 'private', cover: 1082,
    description: 'Küçük bir mekân, yer sınırlı. İstek gönder, onaylayayım.',
    members: ['mert'],
    chat: [['berke', 'Kapı 21:00’de açılıyor'], ['mert', 'Geliyorum!']],
  },
  {
    host: 'defne', title: 'Kahvaltı buluşması', place: 'Yeldeğirmeni', at: { day: 2, hour: 10, minute: 30 },
    visibility: 'public', cover: 1060,
    description: 'Yeldeğirmeni’nde uzun bir kahvaltı, sonra Kadıköy çarşı turu.',
    members: ['ilayda', 'mert', 'zeynep'],
    chat: [['defne', 'Rezervasyonu 10:30’a yaptım'], ['ilayda', 'Süper, ben oradayım ☕']],
  },
];

// ───────────────────────── Supabase yardımcıları ─────────────────────────

async function api(path, { method = 'GET', token, body, headers = {}, raw } = {}) {
  const res = await fetch(`${SUPABASE_URL}${path}`, {
    method,
    headers: {
      apikey: SUPABASE_KEY,
      Authorization: `Bearer ${token ?? SUPABASE_KEY}`,
      ...(raw ? {} : { 'Content-Type': 'application/json' }),
      ...headers,
    },
    body: raw ?? (body ? JSON.stringify(body) : undefined),
  });
  const text = await res.text();
  if (!res.ok) throw new Error(`${method} ${path} → ${res.status} ${text}`);
  return text ? JSON.parse(text) : null;
}

const loadAccounts = () => (existsSync(ACCOUNTS_FILE) ? JSON.parse(readFileSync(ACCOUNTS_FILE, 'utf8')) : {});
const saveAccounts = (accounts) => writeFileSync(ACCOUNTS_FILE, `${JSON.stringify(accounts, null, 2)}\n`);

async function signIn(account) {
  const session = await api('/auth/v1/token?grant_type=password', {
    method: 'POST',
    body: { email: account.email, password: account.password },
  });
  return { token: session.access_token, uid: session.user.id };
}

async function ensureAccount(person, accounts) {
  if (accounts[person.key]) return signIn(accounts[person.key]);
  const account = { email: `demo-${person.key}-${randomBytes(2).toString('hex')}@example.com`, password: randomBytes(12).toString('base64url') };
  const signup = await api('/auth/v1/signup', {
    method: 'POST',
    body: { ...account, data: { name: person.name, username: `demo_${person.key}` } },
  });
  accounts[person.key] = account;
  saveAccounts(accounts);
  return { token: signup.access_token, uid: signup.user.id };
}

async function uploadPhoto(session, url, name) {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Fotoğraf indirilemedi: ${url}`);
  const bytes = Buffer.from(await res.arrayBuffer());
  const path = `${session.uid}/demo-${name}.jpg`;
  await api(`/storage/v1/object/media/${path}`, {
    method: 'POST', token: session.token, raw: bytes, headers: { 'Content-Type': 'image/jpeg', 'x-upsert': 'true' },
  });
  return `${SUPABASE_URL}/storage/v1/object/public/media/${path}`;
}

async function clearContent(session) {
  await api(`/rest/v1/events?host_id=eq.${session.uid}`, { method: 'DELETE', token: session.token });
  await api(`/rest/v1/stories?user_id=eq.${session.uid}`, { method: 'DELETE', token: session.token });
  const files = await api(`/storage/v1/object/list/media`, {
    method: 'POST', token: session.token, body: { prefix: session.uid, limit: 100 },
  });
  if (files.length > 0) {
    await api('/storage/v1/object/media', {
      method: 'DELETE', token: session.token, body: { prefixes: files.map((f) => `${session.uid}/${f.name}`) },
    });
  }
}

// ───────────────────────── Komutlar ─────────────────────────

async function add() {
  const accounts = loadAccounts();
  const sessions = {};
  for (const person of PEOPLE) {
    const session = await ensureAccount(person, accounts);
    sessions[person.key] = session;
    await clearContent(session);
    await api(`/rest/v1/profiles?id=eq.${session.uid}`, {
      method: 'PATCH', token: session.token, body: { latitude: person.lat, longitude: person.lng, show_on_map: true },
    });
    for (const [i, story] of person.stories.entries()) {
      const imageUrl = await uploadPhoto(session, photo(story.photo, 1080, 1920), `story-${i}`);
      await api('/rest/v1/stories', {
        method: 'POST', token: session.token,
        body: { image_url: imageUrl, caption: story.caption, created_at: new Date(Date.now() - story.ago).toISOString() },
      });
    }
    console.log(`✓ ${person.name}: ${person.stories.length} hikâye`);
  }

  for (const [i, event] of EVENTS.entries()) {
    const host = sessions[event.host];
    const coverUrl = await uploadPhoto(host, photo(event.cover, 1200, 700), `event-${i}`);
    const [created] = await api('/rest/v1/events', {
      method: 'POST', token: host.token, headers: { Prefer: 'return=representation' },
      body: {
        title: event.title, description: event.description, place: event.place, visibility: event.visibility,
        cover_url: coverUrl, starts_at: nextAt(event.at),
      },
    });
    for (const key of event.members) {
      // Özel etkinliğe önce istek gönderilir, düzenleyen onaylar
      const status = event.visibility === 'public' ? 'joined' : 'requested';
      await api('/rest/v1/event_members', { method: 'POST', token: sessions[key].token, body: { event_id: created.id, status } });
      if (status === 'requested') {
        await api(`/rest/v1/event_members?event_id=eq.${created.id}&user_id=eq.${sessions[key].uid}`, {
          method: 'PATCH', token: host.token, body: { status: 'joined' },
        });
      }
    }
    for (const [key, text] of event.chat) {
      await api('/rest/v1/messages', { method: 'POST', token: sessions[key].token, body: { event_id: created.id, text } });
    }
    console.log(`✓ Etkinlik: ${event.title}`);
  }
}

async function remove() {
  const accounts = loadAccounts();
  for (const [key, account] of Object.entries(accounts)) {
    const session = await signIn(account);
    await clearContent(session);
    await api('/rest/v1/rpc/delete_my_account', { method: 'POST', token: session.token, body: {} });
    delete accounts[key];
    saveAccounts(accounts);
    console.log(`✓ ${key} silindi`);
  }
}

const command = process.argv[2];
if (command === 'ekle') await add();
else if (command === 'sil') await remove();
else console.log('Kullanım: node scripts/demo-veri.mjs ekle | sil');
