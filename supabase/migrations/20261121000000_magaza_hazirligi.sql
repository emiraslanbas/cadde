-- Cadde: mağazaya çıkış öncesi zorunlu eksikler
--   • Uygulama içinden hesap silme (Apple 5.1.1(v), Google Play hesap silme politikası)
--   • Engelleme ve kötüye kullanım bildirme (Apple 1.2)
--   • Hikâye görünürlüğü (Herkes / Arkadaşlar) gerçekten uygulanır
--   • Bildirim tercihleri ve anlık bildirimler (Expo Push, pg_net ile)
--   • Konumlar artık API'den doğrudan okunamaz; yalnızca haritada görünmesi gerekenler döner
-- Uygulamak için: npx supabase db push

-- ───────────────────────── Profil tercihleri ─────────────────────────
alter table public.profiles
  add column story_audience text not null default 'everyone'
    check (story_audience in ('everyone', 'friends')),
  add column notify_invites boolean not null default true,
  add column notify_messages boolean not null default true,
  add column notify_friends boolean not null default true;

-- Konum kolonları herkese açık değil: tablo yerine kolon bazında izin verilir.
-- Harita verisi aşağıdaki map_users() fonksiyonundan gelir.
revoke select on public.profiles from authenticated, anon;
grant select (
  id, name, username, avatar_url, show_on_map, story_audience,
  notify_invites, notify_messages, notify_friends, updated_at
) on public.profiles to authenticated;

-- ───────────────────────── Engelleme ─────────────────────────
create table public.blocks (
  blocker_id uuid not null default auth.uid() references public.profiles (id) on delete cascade,
  blocked_id uuid not null references public.profiles (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (blocker_id, blocked_id),
  check (blocker_id <> blocked_id)
);

create index blocks_blocked_idx on public.blocks (blocked_id, blocker_id);

alter table public.blocks enable row level security;
grant select, insert, delete on public.blocks to authenticated;

create policy "blocks: kendi listesi" on public.blocks
  for select to authenticated using (blocker_id = (select auth.uid()));
create policy "blocks: engeller" on public.blocks
  for insert to authenticated with check (blocker_id = (select auth.uid()));
create policy "blocks: engeli kaldırır" on public.blocks
  for delete to authenticated using (blocker_id = (select auth.uid()));

-- İki kişiden biri diğerini engellediyse birbirlerini hiçbir yerde görmezler
create function public.is_blocked(other uuid)
returns boolean language sql stable security definer set search_path = ''
as $$
  select exists (
    select 1 from public.blocks
    where (blocker_id = auth.uid() and blocked_id = other)
       or (blocker_id = other and blocked_id = auth.uid())
  );
$$;

-- Engellenen kişilerin listesi (profilleri RLS gereği gizli olduğu için ayrı fonksiyon)
create function public.my_blocked_users()
returns table (id uuid, name text, username text, avatar_url text)
language sql stable security definer set search_path = ''
as $$
  select p.id, p.name, p.username, p.avatar_url
  from public.blocks b
  join public.profiles p on p.id = b.blocked_id
  where b.blocker_id = auth.uid()
  order by b.created_at desc;
$$;

-- Engellenince iki yönlü arkadaşlık da silinir
create function public.blocks_after_insert()
returns trigger language plpgsql security definer set search_path = ''
as $$
begin
  delete from public.friendships
  where (user_id = new.blocker_id and friend_id = new.blocked_id)
     or (user_id = new.blocked_id and friend_id = new.blocker_id);
  return new;
end;
$$;

create trigger blocks_after_insert
  after insert on public.blocks
  for each row execute function public.blocks_after_insert();

-- ───────────────────────── Bildirimler (şikâyet) ─────────────────────────
alter table public.stories add column hidden boolean not null default false;
alter table public.messages add column hidden boolean not null default false;

create table public.reports (
  id uuid primary key default gen_random_uuid(),
  reporter_id uuid default auth.uid() references public.profiles (id) on delete set null,
  target_type text not null check (target_type in ('user', 'story', 'event', 'message')),
  target_id uuid not null,
  target_user_id uuid references public.profiles (id) on delete set null,
  reason text not null check (reason in ('spam', 'harassment', 'inappropriate', 'fake', 'other')),
  details text not null default '' check (char_length(details) <= 500),
  status text not null default 'open' check (status in ('open', 'resolved')),
  created_at timestamptz not null default now(),
  unique (reporter_id, target_type, target_id)
);

create index reports_open_idx on public.reports (status, created_at desc);

alter table public.reports enable row level security;
grant select, insert on public.reports to authenticated;

-- Kullanıcı yalnızca kendi bildirimlerini görür (bildirdiği içerik ona gizlenir).
-- Tüm bildirimleri Supabase panelinden `reports` tablosunda takip edin.
create policy "reports: kendi bildirimleri" on public.reports
  for select to authenticated using (reporter_id = (select auth.uid()));
create policy "reports: bildirir" on public.reports
  for insert to authenticated with check (reporter_id = (select auth.uid()) and status = 'open');

create function public.i_reported(kind text, target uuid)
returns boolean language sql stable security definer set search_path = ''
as $$
  select exists (
    select 1 from public.reports
    where reporter_id = auth.uid() and target_type = kind and target_id = target
  );
$$;

-- Aynı hikâye ya da mesaj 3 farklı kişi tarafından bildirilirse herkesten gizlenir
create function public.reports_after_insert()
returns trigger language plpgsql security definer set search_path = ''
as $$
declare
  auto_hide_threshold constant int := 3;
  report_count int;
begin
  if new.target_type not in ('story', 'message') then
    return new;
  end if;

  select count(distinct reporter_id) into report_count
  from public.reports
  where target_type = new.target_type and target_id = new.target_id and status = 'open';

  if report_count >= auto_hide_threshold then
    if new.target_type = 'story' then
      update public.stories set hidden = true where id = new.target_id;
    else
      update public.messages set hidden = true where id = new.target_id;
    end if;
  end if;
  return new;
end;
$$;

create trigger reports_after_insert
  after insert on public.reports
  for each row execute function public.reports_after_insert();

-- ───────────────────────── Görünürlük kuralları ─────────────────────────
-- Hikâye görünür mü: sahibi sensin, ya da engel yok + kitle uygun + gizlenmemiş + sen bildirmemişsin
create function public.story_visible(author uuid, story_id uuid, is_hidden boolean)
returns boolean language sql stable security definer set search_path = ''
as $$
  select author = auth.uid() or (
    not is_hidden
    and not public.is_blocked(author)
    and not public.i_reported('story', story_id)
    and exists (
      select 1 from public.profiles p
      where p.id = author
        and (
          p.story_audience = 'everyone'
          or exists (
            select 1 from public.friendships f
            where f.user_id = author and f.friend_id = auth.uid()
          )
        )
    )
  );
$$;

drop policy "profiles: herkes görür" on public.profiles;
create policy "profiles: engellenmeyenler görür" on public.profiles
  for select to authenticated using (not public.is_blocked(id));

drop policy "stories: herkes görür" on public.stories;
create policy "stories: görünür olanlar" on public.stories
  for select to authenticated using (public.story_visible(user_id, id, hidden));

drop policy "events: herkes görür" on public.events;
create policy "events: engellenmeyenler görür" on public.events
  for select to authenticated using (
    host_id = (select auth.uid())
    or (not public.is_blocked(host_id) and not public.i_reported('event', id))
  );

drop policy "messages: katılımcılar okur" on public.messages;
create policy "messages: katılımcılar okur" on public.messages
  for select to authenticated using (
    public.is_event_member(event_id)
    and (
      user_id = (select auth.uid())
      or (not hidden and not public.is_blocked(user_id) and not public.i_reported('message', id))
    )
  );

-- Harita: son 24 saatte sana görünür hikâyesi olan, konumu açık kişiler (+ sen)
create function public.map_users()
returns table (
  id uuid,
  name text,
  username text,
  avatar_url text,
  latitude double precision,
  longitude double precision,
  stories jsonb
)
language sql stable security definer set search_path = ''
as $$
  select * from (
    select
      p.id, p.name, p.username, p.avatar_url, p.latitude, p.longitude,
      coalesce((
        select jsonb_agg(
          jsonb_build_object(
            'id', s.id, 'user_id', s.user_id, 'image_url', s.image_url,
            'caption', s.caption, 'created_at', s.created_at
          ) order by s.created_at
        )
        from public.stories s
        where s.user_id = p.id
          and s.created_at > now() - interval '24 hours'
          and public.story_visible(s.user_id, s.id, s.hidden)
      ), '[]'::jsonb) as stories
    from public.profiles p
    where p.latitude is not null
      and p.longitude is not null
      and not public.is_blocked(p.id)
  ) u
  where u.id = auth.uid() or jsonb_array_length(u.stories) > 0;
$$;

-- ───────────────────────── Fotoğraf deposu ─────────────────────────
-- Hesap silinirken uygulama kendi klasörünü listeleyip silebilsin
create policy "media: kendi klasörünü listeler" on storage.objects
  for select to authenticated
  using (bucket_id = 'media' and (storage.foldername(name))[1] = (select auth.uid())::text);

-- ───────────────────────── Hesap silme ─────────────────────────
-- Uygulama önce kullanıcının fotoğraflarını depodan siler, sonra bunu çağırır.
-- auth.users silinince profil, hikâyeler, etkinlikler, mesajlar, arkadaşlıklar,
-- engeller ve bildirim cihazları zincirleme silinir; şikâyetlerde bildiren kişi boşaltılır.
create function public.delete_my_account()
returns void language plpgsql security definer set search_path = ''
as $$
declare
  uid uuid := auth.uid();
begin
  if uid is null then
    raise exception 'Oturum bulunamadı';
  end if;
  delete from auth.users where id = uid;
end;
$$;

-- ───────────────────────── Anlık bildirimler ─────────────────────────
create extension if not exists pg_net;

create table public.push_tokens (
  token text primary key,
  user_id uuid not null references public.profiles (id) on delete cascade,
  updated_at timestamptz not null default now()
);

create index push_tokens_user_idx on public.push_tokens (user_id);

-- Tabloya doğrudan erişim yok; yalnızca aşağıdaki fonksiyonlarla kaydedilir
alter table public.push_tokens enable row level security;

-- Aynı telefonda başka hesaba geçilirse cihaz yeni hesaba taşınır
create function public.register_push_token(push_token text)
returns void language plpgsql security definer set search_path = ''
as $$
begin
  if auth.uid() is null then
    raise exception 'Oturum bulunamadı';
  end if;
  if push_token !~ '^Expo(nent)?PushToken\[.+\]$' then
    raise exception 'Geçersiz bildirim anahtarı';
  end if;
  insert into public.push_tokens (token, user_id) values (push_token, auth.uid())
  on conflict (token) do update set user_id = excluded.user_id, updated_at = now();
end;
$$;

create function public.unregister_push_token(push_token text)
returns void language sql security definer set search_path = ''
as $$
  delete from public.push_tokens where token = push_token and user_id = auth.uid();
$$;

-- Expo Push servisine en fazla 100'lük paketler hâlinde gönderir
create function public.send_push(recipients uuid[], p_title text, p_body text, p_data jsonb default '{}')
returns void language plpgsql security definer set search_path = ''
as $$
declare
  expo_push_url constant text := 'https://exp.host/--/api/v2/push/send';
  batch jsonb;
begin
  for batch in
    select jsonb_agg(
      jsonb_build_object(
        'to', t.token, 'title', p_title, 'body', p_body,
        'data', p_data, 'sound', 'default', 'channelId', 'default'
      )
    )
    from (
      select token, (row_number() over () - 1) / 100 as batch_no
      from public.push_tokens
      where user_id = any (recipients)
    ) t
    group by t.batch_no
  loop
    perform net.http_post(
      url := expo_push_url,
      body := batch,
      headers := '{"Content-Type": "application/json", "Accept": "application/json"}'::jsonb
    );
  end loop;
exception when others then
  -- Bildirim gönderilemese bile asıl işlem (mesaj, istek) bozulmasın
  raise warning 'send_push başarısız: %', sqlerrm;
end;
$$;

-- Sohbet mesajı → etkinliğin diğer katılımcıları
create function public.notify_new_message()
returns trigger language plpgsql security definer set search_path = ''
as $$
declare
  recipients uuid[];
  sender_name text;
  event_title text;
begin
  select name into sender_name from public.profiles where id = new.user_id;
  select title into event_title from public.events where id = new.event_id;

  select array_agg(m.user_id) into recipients
  from public.event_members m
  join public.profiles p on p.id = m.user_id
  where m.event_id = new.event_id
    and m.status = 'joined'
    and m.user_id <> new.user_id
    and p.notify_messages
    and not exists (
      select 1 from public.blocks b
      where (b.blocker_id = m.user_id and b.blocked_id = new.user_id)
         or (b.blocker_id = new.user_id and b.blocked_id = m.user_id)
    );

  if recipients is not null then
    perform public.send_push(
      recipients,
      event_title,
      sender_name || ': ' || left(new.text, 120),
      jsonb_build_object('url', '/chat/' || new.event_id)
    );
  end if;
  return new;
end;
$$;

create trigger messages_notify
  after insert on public.messages
  for each row execute function public.notify_new_message();

-- Katılma isteği / katılım → düzenleyen; istek onayı → isteyen kişi
create function public.notify_event_member()
returns trigger language plpgsql security definer set search_path = ''
as $$
declare
  ev record;
  member_name text;
  recipient uuid;
  msg_title text;
  msg_body text;
begin
  select id, title, host_id into ev from public.events where id = new.event_id;
  select name into member_name from public.profiles where id = new.user_id;

  if tg_op = 'INSERT' then
    if new.user_id = ev.host_id then
      return new;
    end if;
    recipient := ev.host_id;
    if new.status = 'requested' then
      msg_title := 'Yeni katılma isteği';
      msg_body := member_name || ', "' || ev.title || '" etkinliğine katılmak istiyor.';
    else
      msg_title := 'Yeni katılımcı';
      msg_body := member_name || ', "' || ev.title || '" etkinliğine katılıyor.';
    end if;
  elsif old.status = 'requested' and new.status = 'joined' then
    recipient := new.user_id;
    msg_title := 'İsteğin onaylandı';
    msg_body := '"' || ev.title || '" etkinliğine ve sohbetine katılabilirsin.';
  else
    return new;
  end if;

  if exists (select 1 from public.profiles where id = recipient and notify_invites) then
    perform public.send_push(
      array[recipient], msg_title, msg_body,
      jsonb_build_object('url', '/event/' || new.event_id)
    );
  end if;
  return new;
end;
$$;

create trigger event_members_notify
  after insert or update on public.event_members
  for each row execute function public.notify_event_member();

-- Biri seni arkadaş olarak ekleyince
create function public.notify_new_friend()
returns trigger language plpgsql security definer set search_path = ''
as $$
declare
  adder_name text;
begin
  if not exists (select 1 from public.profiles where id = new.friend_id and notify_friends) then
    return new;
  end if;
  select name into adder_name from public.profiles where id = new.user_id;
  perform public.send_push(
    array[new.friend_id],
    'Yeni arkadaş',
    adder_name || ' seni arkadaş olarak ekledi.',
    '{}'::jsonb
  );
  return new;
end;
$$;

create trigger friendships_notify
  after insert on public.friendships
  for each row execute function public.notify_new_friend();

-- ───────────────────────── Fonksiyon izinleri ─────────────────────────
revoke execute on function
  public.is_blocked(uuid),
  public.my_blocked_users(),
  public.i_reported(text, uuid),
  public.story_visible(uuid, uuid, boolean),
  public.map_users(),
  public.delete_my_account(),
  public.register_push_token(text),
  public.unregister_push_token(text),
  public.send_push(uuid[], text, text, jsonb),
  public.blocks_after_insert(),
  public.reports_after_insert(),
  public.notify_new_message(),
  public.notify_event_member(),
  public.notify_new_friend()
from public, anon;

grant execute on function
  public.is_blocked(uuid),
  public.my_blocked_users(),
  public.i_reported(text, uuid),
  public.story_visible(uuid, uuid, boolean),
  public.map_users(),
  public.delete_my_account(),
  public.register_push_token(text),
  public.unregister_push_token(text)
to authenticated;

-- Supabase yeni fonksiyonlara varsayılan olarak authenticated izni verir;
-- bildirim gönderme ve tetikleyici fonksiyonları kullanıcılar doğrudan çağıramasın
revoke execute on function
  public.send_push(uuid[], text, text, jsonb),
  public.blocks_after_insert(),
  public.reports_after_insert(),
  public.notify_new_message(),
  public.notify_event_member(),
  public.notify_new_friend()
from authenticated;
