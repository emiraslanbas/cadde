-- Cadde veritabanı kurulumu (ilk sürüm)
-- Uygulamak için: npx supabase db push
-- ───────────────────────── Profiller ─────────────────────────
create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  name text not null check (char_length(name) between 1 and 50),
  username text not null unique check (username ~ '^[a-z0-9._]{3,30}$'),
  avatar_url text,
  -- Gizlilik için ~100 m hassasiyete yuvarlanmış konum
  latitude double precision,
  longitude double precision,
  show_on_map boolean not null default true,
  updated_at timestamptz not null default now()
);

-- Kayıt olunca profil otomatik oluşur (isim ve kullanıcı adı kayıt formundan gelir)
create function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = ''
as $$
begin
  insert into public.profiles (id, name, username)
  values (new.id, new.raw_user_meta_data ->> 'name', new.raw_user_meta_data ->> 'username');
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Konumunu gizleyen kullanıcının koordinatları veritabanında hiç tutulmaz
create function public.profiles_before_write()
returns trigger language plpgsql set search_path = ''
as $$
begin
  if not new.show_on_map then
    new.latitude := null;
    new.longitude := null;
  end if;
  new.updated_at := now();
  return new;
end;
$$;

create trigger profiles_before_write
  before insert or update on public.profiles
  for each row execute function public.profiles_before_write();

-- Kayıt ekranı giriş yapmadan kullanıcı adının boş olup olmadığını sorabilsin
create function public.username_available(candidate text)
returns boolean language sql stable security definer set search_path = ''
as $$
  select not exists (select 1 from public.profiles where username = lower(candidate));
$$;

-- ───────────────────────── Arkadaşlar ─────────────────────────
create table public.friendships (
  user_id uuid not null references public.profiles (id) on delete cascade,
  friend_id uuid not null references public.profiles (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_id, friend_id),
  check (user_id <> friend_id)
);

-- ───────────────────────── Hikâyeler ─────────────────────────
create table public.stories (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references public.profiles (id) on delete cascade,
  image_url text not null,
  caption text not null default '' check (char_length(caption) <= 120),
  created_at timestamptz not null default now()
);

create index stories_user_created_idx on public.stories (user_id, created_at desc);

-- ───────────────────────── Etkinlikler ─────────────────────────
create table public.events (
  id uuid primary key default gen_random_uuid(),
  host_id uuid not null default auth.uid() references public.profiles (id) on delete cascade,
  title text not null check (char_length(title) between 1 and 80),
  description text not null default '' check (char_length(description) <= 1000),
  place text not null check (char_length(place) between 1 and 120),
  starts_at timestamptz not null,
  visibility text not null check (visibility in ('public', 'private')),
  cover_url text,
  created_at timestamptz not null default now()
);

-- requested: özel etkinliğe istek gönderildi, joined: katılımcı
create table public.event_members (
  event_id uuid not null references public.events (id) on delete cascade,
  user_id uuid not null default auth.uid() references public.profiles (id) on delete cascade,
  status text not null check (status in ('requested', 'joined')),
  created_at timestamptz not null default now(),
  primary key (event_id, user_id)
);

create index event_members_user_idx on public.event_members (user_id);

-- Etkinliği oluşturan kişi otomatik olarak katılımcı olur
create function public.add_host_as_member()
returns trigger language plpgsql security definer set search_path = ''
as $$
begin
  insert into public.event_members (event_id, user_id, status) values (new.id, new.host_id, 'joined');
  return new;
end;
$$;

create trigger events_add_host
  after insert on public.events
  for each row execute function public.add_host_as_member();

create function public.is_event_member(eid uuid)
returns boolean language sql stable security definer set search_path = ''
as $$
  select exists (
    select 1 from public.event_members
    where event_id = eid and user_id = auth.uid() and status = 'joined'
  );
$$;

create function public.is_event_host(eid uuid)
returns boolean language sql stable security definer set search_path = ''
as $$
  select exists (select 1 from public.events where id = eid and host_id = auth.uid());
$$;

-- ───────────────────────── Sohbet ─────────────────────────
create table public.messages (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.events (id) on delete cascade,
  user_id uuid not null default auth.uid() references public.profiles (id) on delete cascade,
  text text not null check (char_length(text) between 1 and 1000),
  created_at timestamptz not null default now()
);

create index messages_event_created_idx on public.messages (event_id, created_at);

-- Yeni mesajlar sohbet ekranına anlık düşsün
alter publication supabase_realtime add table public.messages;

-- ───────────────────────── Erişim kuralları (RLS) ─────────────────────────
alter table public.profiles enable row level security;
alter table public.friendships enable row level security;
alter table public.stories enable row level security;
alter table public.events enable row level security;
alter table public.event_members enable row level security;
alter table public.messages enable row level security;

grant select, insert, update, delete on
  public.profiles, public.friendships, public.stories,
  public.events, public.event_members, public.messages
to authenticated;

revoke execute on function public.username_available(text) from public;
grant execute on function public.username_available(text) to anon, authenticated;
revoke execute on function public.is_event_member(uuid), public.is_event_host(uuid) from public;
grant execute on function public.is_event_member(uuid), public.is_event_host(uuid) to authenticated;

-- Profiller: giriş yapan herkes görür, herkes yalnızca kendi profilini düzenler
create policy "profiles: herkes görür" on public.profiles
  for select to authenticated using (true);
create policy "profiles: kendini düzenler" on public.profiles
  for update to authenticated using (id = (select auth.uid())) with check (id = (select auth.uid()));

-- Arkadaşlar: herkes kendi listesini görür ve yönetir
create policy "friendships: kendi listesi" on public.friendships
  for select to authenticated using (user_id = (select auth.uid()));
create policy "friendships: ekler" on public.friendships
  for insert to authenticated with check (user_id = (select auth.uid()));
create policy "friendships: çıkarır" on public.friendships
  for delete to authenticated using (user_id = (select auth.uid()));

-- Hikâyeler: herkes görür, herkes yalnızca kendi hikâyesini ekler/siler
create policy "stories: herkes görür" on public.stories
  for select to authenticated using (true);
create policy "stories: kendi ekler" on public.stories
  for insert to authenticated with check (user_id = (select auth.uid()));
create policy "stories: kendi siler" on public.stories
  for delete to authenticated using (user_id = (select auth.uid()));

-- Etkinlikler: herkes görür (özel olanlar dahil, katılım istekle), yalnızca düzenleyen değiştirir
create policy "events: herkes görür" on public.events
  for select to authenticated using (true);
create policy "events: oluşturur" on public.events
  for insert to authenticated with check (host_id = (select auth.uid()));
create policy "events: düzenleyen günceller" on public.events
  for update to authenticated using (host_id = (select auth.uid())) with check (host_id = (select auth.uid()));
create policy "events: düzenleyen siler" on public.events
  for delete to authenticated using (host_id = (select auth.uid()));

-- Katılım: herkese açık etkinliğe direkt katılınır, özel etkinliğe yalnızca istek gönderilir
create policy "event_members: herkes görür" on public.event_members
  for select to authenticated using (true);
create policy "event_members: katılır veya istek gönderir" on public.event_members
  for insert to authenticated with check (
    user_id = (select auth.uid())
    and exists (
      select 1 from public.events e
      where e.id = event_id
        and (
          (e.visibility = 'public' and status = 'joined')
          or (e.visibility = 'private' and status = 'requested')
        )
    )
  );
create policy "event_members: düzenleyen isteği onaylar" on public.event_members
  for update to authenticated
  using (public.is_event_host(event_id))
  with check (public.is_event_host(event_id) and status = 'joined');
create policy "event_members: ayrılır, isteği geri çeker veya düzenleyen reddeder" on public.event_members
  for delete to authenticated
  using (user_id = (select auth.uid()) or public.is_event_host(event_id));

-- Sohbet: yalnızca etkinliğin katılımcıları okur ve yazar
create policy "messages: katılımcılar okur" on public.messages
  for select to authenticated using (public.is_event_member(event_id));
create policy "messages: katılımcılar yazar" on public.messages
  for insert to authenticated with check (
    user_id = (select auth.uid()) and public.is_event_member(event_id)
  );

-- ───────────────────────── Fotoğraf deposu ─────────────────────────
-- Profil fotoğrafları ve hikâyeler; herkes okuyabilir, herkes yalnızca kendi klasörüne yükler
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('media', 'media', true, 10485760, array['image/jpeg', 'image/png', 'image/heic', 'image/webp'])
on conflict (id) do nothing;

create policy "media: kendi klasörüne yükler" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'media' and (storage.foldername(name))[1] = (select auth.uid())::text);
create policy "media: kendi dosyasını siler" on storage.objects
  for delete to authenticated
  using (bucket_id = 'media' and owner_id = (select auth.uid())::text);
