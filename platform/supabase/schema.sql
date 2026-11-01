-- Coach Junior platform: Supabase schema. Run once in the SQL editor of a new project.
--
-- Already set up before October 2026? Run supabase/perf.sql and then supabase/security.sql once.
--
-- Data: every record of lib/types.ts is one row in public.docs
--   (coll = collection name like 'clients' or 'trainingPlans', id, client_id, data jsonb).
-- The app reads everything RLS allows and writes back only the rows that changed (lib/sync.ts).
--
-- Accounts: only the coach creates trainee logins, through /api/accounts (service key).
-- A trainee's auth user id is also their clients doc id. Logins are phone + password;
-- Supabase Auth stores them as <last 10 digits>@coach-junior.app (no SMS needed) and keeps
-- only a bcrypt hash of the password.
--
-- Coach account, once:
--   1) Authentication > Users > Add user: email coach@coach-junior.app, a password,
--      "Auto Confirm User" on.
--   2) insert into public.coaches (id) select id from auth.users where email = 'coach@coach-junior.app';
-- His first login copies the starter library (foods, exercises, plan templates).

create table public.coaches (id uuid primary key references auth.users on delete cascade);

create table public.docs (
  coll text not null,
  id text not null,
  client_id uuid references auth.users on delete cascade,
  data jsonb not null,
  updated_at timestamptz not null default now(),
  primary key (coll, id)
);
create index docs_client2 on public.docs (client_id, coll);
create index docs_coll_updated on public.docs (coll, updated_at);

create or replace function public.is_coach() returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from coaches where id = auth.uid())
$$;

-- the signed-in trainee's own record (bypasses RLS, so policies can use it)
create or replace function public.my_client() returns jsonb
language sql stable security definer set search_path = public as $$
  select data from docs where coll = 'clients' and id = auth.uid()::text
$$;

create or replace function public.client_active() returns boolean
language sql stable security definer set search_path = public as $$
  -- Cairo's date, not the server's UTC one, so the last day lasts until midnight in Egypt
  select coalesce((my_client()->>'active')::boolean and (my_client()->>'subEnd')::date >= (now() at time zone 'Africa/Cairo')::date, false)
$$;

alter table public.coaches enable row level security;
alter table public.docs enable row level security;

create policy own_row on coaches for select using (id = auth.uid());

-- the coach can do everything
create policy coach_all on docs for all using ((select is_coach())) with check ((select is_coach()));

-- trainee: own subscription record, read only (password changes go through Supabase Auth)
create policy own_client on docs for select using (coll = 'clients' and id = (select auth.uid())::text);

-- what a trainee may save in their own rows (used by the insert and update policies below)
create or replace function public.own_row_ok(coll text, id text, client_id uuid, data jsonb) returns boolean
language sql stable set search_path = public as $$
  select coll in ('measurements','logs','swaps','photos','eaten','assignments','messages') and client_id = auth.uid() and (
    (coll = 'eaten' and id like auth.uid()::text || '|%') or
    (coll <> 'eaten' and data->>'clientId' = auth.uid()::text
      and (coll <> 'swaps' or id like auth.uid()::text || ':%')
      and (coll <> 'messages' or data->>'from' = 'client')
      and (coll <> 'assignments' or coalesce(data->>'reviewed', 'false') <> 'true'))
  )
$$;

-- trainee: their own logs, weights, photos, swaps, ticked meals, forms.
-- The app reads the trainee id from inside data (data->>'clientId'), so that must match too;
-- swap and meal-tick ids start with the trainee id so nobody can take another trainee's id;
-- a trainee can't write a message "from the coach" or mark their own form as reviewed,
-- and can't rewrite or delete the coach's messages or the forms the coach sent them.
create policy own_rows on docs for select
  using (coll in ('measurements','logs','swaps','photos','eaten','assignments','messages') and client_id = (select auth.uid()));
create policy own_rows_add on docs for insert with check (public.own_row_ok(coll, id, client_id, data));
create policy own_rows_edit on docs for update
  using (client_id = (select auth.uid()) and coll in ('measurements','logs','swaps','photos','eaten','assignments','messages') and (coll <> 'messages' or data->>'from' = 'client'))
  with check (public.own_row_ok(coll, id, client_id, data));
create policy own_rows_remove on docs for delete
  using (client_id = (select auth.uid()) and (coll in ('measurements','logs','swaps','photos','eaten') or (coll = 'messages' and data->>'from' = 'client')));

-- trainee: food list, assigned plans and the exercise library while the subscription runs
-- only real trainees (a clients row exists), so a stray self sign-up sees nothing
create policy foods_read on docs for select using (coll = 'foods' and (select my_client()) is not null);
create policy forms_read on docs for select using (coll = 'forms' and (select my_client()) is not null);
create policy plans_read on docs for select using (
  (select client_active()) and (
    (coll = 'trainingPlans' and id = (select my_client()->>'trainingPlanId')) or
    (coll = 'nutritionPlans' and id = (select my_client()->>'nutritionPlanId'))
  )
);
-- the whole exercise library, so "مش لاقي الجهاز؟" can suggest a replacement
create policy exercises_read on docs for select using (coll = 'exercises' and (select client_active()));

-- Storage: one PRIVATE bucket 'media'.
--   videos/<key>                 coach uploads, active trainees can play (signed URLs)
--   photos/<client id>/<id>.jpg  each trainee uploads their own progress photos, the coach sees all
insert into storage.buckets (id, name, public) values ('media', 'media', false) on conflict do nothing;
-- the server enforces what the app already checks: 50 MB at most, only videos and photos
update storage.buckets set file_size_limit = 52428800,
  allowed_mime_types = array['video/mp4','video/quicktime','video/webm','video/x-m4v','video/3gpp','image/jpeg','image/png','image/webp']
  where id = 'media';
create policy coach_media on storage.objects for all
  using (bucket_id = 'media' and is_coach()) with check (bucket_id = 'media' and is_coach());
create policy client_videos on storage.objects for select
  using (bucket_id = 'media' and name like 'videos/%' and client_active());
create policy own_photos on storage.objects for all
  using (bucket_id = 'media' and name like 'photos/' || auth.uid()::text || '/%' and (select public.my_client()) is not null)
  with check (bucket_id = 'media' and name like 'photos/' || auth.uid()::text || '/%' and (select public.my_client()) is not null);

-- Phone notifications (Web Push): one row per subscribed browser. Only the server
-- (service role) reads or writes it, so RLS stays on with no policies.
create table if not exists public.push_subs (
  endpoint text primary key,
  user_id uuid not null,
  is_coach boolean not null default false,
  sub jsonb not null,
  created_at timestamptz not null default now()
);
alter table public.push_subs enable row level security;
