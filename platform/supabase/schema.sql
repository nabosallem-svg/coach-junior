-- Coach Junior platform: Supabase schema (Postgres + RLS).
-- Run in the Supabase SQL editor once a project exists. Mirrors lib/types.ts.
-- Roles: one coach (profiles.role = 'coach'); clients only see their own rows.
--
-- Accounts: trainees sign up themselves (auth.signUp with phone + password and
-- { data: { name, goal } }). The trigger below creates their profile, a
-- PENDING clients row and sends them the starter forms. They get in straight
-- away (forms + messages work); plans and videos stay hidden by RLS until the
-- coach activates them (active = true, package dates, plans). The coach can also
-- create accounts himself via auth.admin.createUser from a server route.
-- Supabase stores only a bcrypt hash of the password.

create table public.profiles (
  id uuid primary key references auth.users on delete cascade,
  role text not null check (role in ('coach','client')) default 'client',
  name text not null,
  phone text unique
);

create or replace function public.is_coach() returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from profiles where id = auth.uid() and role = 'coach')
$$;

create table public.exercises (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  muscle text not null,
  cue text,
  video_path text,          -- object in storage bucket 'exercise-videos'
  video_url text,
  created_at timestamptz default now()
);

create table public.training_plans (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  days jsonb not null default '[]'   -- [{id,name,exercises:[{id,exerciseId,note,sets:[{reps,tempo,rir}]}]}]
);

create table public.foods (
  id uuid primary key default gen_random_uuid(),
  name_ar text not null, name_en text not null,
  food_group text not null, unit text not null, per numeric not null,
  kcal numeric not null, c numeric not null, f numeric not null, p numeric not null
);

create table public.nutrition_plans (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  meals jsonb not null default '[]'  -- [{id,name,note,items:[{id,foodId,qty}]}]
);

create table public.clients (
  id uuid primary key references profiles on delete cascade,
  goal text,
  package_name text,
  sub_start date,
  sub_end date,
  training_plan_id uuid references training_plans on delete set null,
  nutrition_plan_id uuid references nutrition_plans on delete set null,
  active boolean not null default false,
  pending boolean not null default true,
  signed_up_at timestamptz not null default now()
);

-- self sign-up -> profile + pending client
create or replace function public.handle_new_user() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  insert into profiles (id, role, name, phone)
  values (new.id, 'client', coalesce(new.raw_user_meta_data->>'name', ''), new.phone);
  insert into clients (id, goal) values (new.id, new.raw_user_meta_data->>'goal');
  insert into form_assignments (form_id, client_id) select id, new.id from forms where starter;
  return new;
end $$;
create trigger on_auth_user_created after insert on auth.users
  for each row execute function public.handle_new_user();
-- the coach's own account: after signing up once, run
--   update profiles set role = 'coach' where phone = '<coach phone>';
--   delete from clients where id = (select id from profiles where role = 'coach');

create table public.measurements (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references clients on delete cascade,
  date date not null, weight numeric not null, waist numeric,
  unique (client_id, date)
);

create table public.workout_logs (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references clients on delete cascade,
  plan_id uuid references training_plans on delete set null,
  day_id text not null,
  date timestamptz not null default now(),
  sets jsonb not null
);

create table public.swaps (
  client_id uuid not null references clients on delete cascade,
  item_id text not null,
  food_id uuid not null references foods,
  qty numeric not null,
  primary key (client_id, item_id)
);

create table public.forms (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  starter boolean not null default false,   -- sent to every new sign-up
  questions jsonb not null default '[]'
);

create table public.form_assignments (
  id uuid primary key default gen_random_uuid(),
  form_id uuid not null references forms on delete cascade,
  client_id uuid not null references clients on delete cascade,
  sent_at timestamptz not null default now(),
  status text not null check (status in ('pending','submitted')) default 'pending',
  answers jsonb,
  submitted_at timestamptz,
  reviewed boolean not null default false
);

create table public.messages (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references clients on delete cascade,
  sender text not null check (sender in ('coach','client')),
  body text not null,
  at timestamptz not null default now(),
  read boolean not null default false
);

-- RLS -----------------------------------------------------------------
alter table profiles enable row level security;
alter table exercises enable row level security;
alter table training_plans enable row level security;
alter table foods enable row level security;
alter table nutrition_plans enable row level security;
alter table clients enable row level security;
alter table measurements enable row level security;
alter table workout_logs enable row level security;
alter table swaps enable row level security;
alter table forms enable row level security;
alter table form_assignments enable row level security;
alter table messages enable row level security;

-- coach can do everything
create policy coach_all on profiles for all using (is_coach()) with check (is_coach());
create policy coach_all on exercises for all using (is_coach()) with check (is_coach());
create policy coach_all on training_plans for all using (is_coach()) with check (is_coach());
create policy coach_all on foods for all using (is_coach()) with check (is_coach());
create policy coach_all on nutrition_plans for all using (is_coach()) with check (is_coach());
create policy coach_all on clients for all using (is_coach()) with check (is_coach());
create policy coach_all on measurements for all using (is_coach()) with check (is_coach());
create policy coach_all on workout_logs for all using (is_coach()) with check (is_coach());
create policy coach_all on swaps for all using (is_coach()) with check (is_coach());
create policy coach_all on forms for all using (is_coach()) with check (is_coach());
create policy coach_all on form_assignments for all using (is_coach()) with check (is_coach());
create policy coach_all on messages for all using (is_coach()) with check (is_coach());

-- clients: own profile and subscription, read-only
create policy own_profile on profiles for select using (id = auth.uid());
create policy own_client on clients for select using (id = auth.uid());

-- library and plans: readable by an active client (plans only when assigned)
-- a client sees an exercise (and its video) only if it is in HIS assigned plan
-- and his subscription is running
create or replace function public.client_has_exercise(ex_id uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from clients c join training_plans p on p.id = c.training_plan_id
    where c.id = auth.uid() and c.active and c.sub_end >= current_date
      and jsonb_path_exists(p.days, '$[*].exercises[*].exerciseId ? (@ == $id)', jsonb_build_object('id', ex_id::text))
  )
$$;
create policy plan_read on exercises for select using (client_has_exercise(id));
create policy active_read on foods for select using (auth.uid() is not null);
create policy assigned_read on training_plans for select using (exists (select 1 from clients where id = auth.uid() and active and training_plan_id = training_plans.id));
create policy assigned_read on nutrition_plans for select using (exists (select 1 from clients where id = auth.uid() and active and nutrition_plan_id = nutrition_plans.id));
create policy assigned_read on forms for select using (exists (select 1 from form_assignments a where a.form_id = forms.id and a.client_id = auth.uid()));

-- clients' own data
create policy own_rows on measurements for all using (client_id = auth.uid()) with check (client_id = auth.uid());
create policy own_rows on workout_logs for all using (client_id = auth.uid()) with check (client_id = auth.uid());
create policy own_rows on swaps for all using (client_id = auth.uid()) with check (client_id = auth.uid());
create policy own_read on form_assignments for select using (client_id = auth.uid());
create policy own_submit on form_assignments for update using (client_id = auth.uid() and status = 'pending') with check (client_id = auth.uid());
create policy own_read on messages for select using (client_id = auth.uid());
create policy own_send on messages for insert with check (client_id = auth.uid() and sender = 'client');
create policy own_mark_read on messages for update using (client_id = auth.uid()) with check (client_id = auth.uid());

-- Storage: PRIVATE bucket 'exercise-videos', objects named '<exercise_id>/<file>'.
-- Coach uploads; a client can only get a short-lived signed URL for videos of
-- exercises in his own plan while his subscription is active.
insert into storage.buckets (id, name, public) values ('exercise-videos', 'exercise-videos', false) on conflict do nothing;
create policy coach_videos on storage.objects for all using (bucket_id = 'exercise-videos' and is_coach()) with check (bucket_id = 'exercise-videos' and is_coach());
create policy client_videos on storage.objects for select using (
  bucket_id = 'exercise-videos'
  and public.client_has_exercise((split_part(name, '/', 1))::uuid)
);
