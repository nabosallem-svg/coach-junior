-- Coach Junior platform: Supabase schema. Run once in the SQL editor of a new project.
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
create index docs_client on public.docs (client_id);

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
  select coalesce((my_client()->>'active')::boolean and (my_client()->>'subEnd')::date >= current_date, false)
$$;

alter table public.coaches enable row level security;
alter table public.docs enable row level security;

create policy own_row on coaches for select using (id = auth.uid());

-- the coach can do everything
create policy coach_all on docs for all using (is_coach()) with check (is_coach());

-- trainee: own subscription record, read only (password changes go through Supabase Auth)
create policy own_client on docs for select using (coll = 'clients' and id = auth.uid()::text);

-- trainee: their own logs, weights, photos, swaps, ticked meals, forms
create policy own_rows on docs for all
  using (coll in ('measurements','logs','swaps','photos','eaten','assignments','messages') and client_id = auth.uid())
  with check (coll in ('measurements','logs','swaps','photos','eaten','assignments','messages') and client_id = auth.uid());

-- trainee: food list, assigned plans and the exercise library while the subscription runs
create policy foods_read on docs for select using (coll = 'foods' and auth.uid() is not null);
create policy forms_read on docs for select using (coll = 'forms' and auth.uid() is not null);
create policy plans_read on docs for select using (
  client_active() and (
    (coll = 'trainingPlans' and id = my_client()->>'trainingPlanId') or
    (coll = 'nutritionPlans' and id = my_client()->>'nutritionPlanId')
  )
);
-- the whole exercise library, so "مش لاقي الجهاز؟" can suggest a replacement
create policy exercises_read on docs for select using (coll = 'exercises' and client_active());

-- Storage: one PRIVATE bucket 'media'.
--   videos/<key>                 coach uploads, active trainees can play (signed URLs)
--   photos/<client id>/<id>.jpg  each trainee uploads their own progress photos, the coach sees all
insert into storage.buckets (id, name, public) values ('media', 'media', false) on conflict do nothing;
create policy coach_media on storage.objects for all
  using (bucket_id = 'media' and is_coach()) with check (bucket_id = 'media' and is_coach());
create policy client_videos on storage.objects for select
  using (bucket_id = 'media' and name like 'videos/%' and client_active());
create policy own_photos on storage.objects for all
  using (bucket_id = 'media' and name like 'photos/' || auth.uid()::text || '/%')
  with check (bucket_id = 'media' and name like 'photos/' || auth.uid()::text || '/%');
