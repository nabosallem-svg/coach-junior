-- Run once in the Supabase SQL editor (after perf.sql) on a project made from an older schema.sql.
-- Safe to run again. Closes the gaps found in the October 2026 security review:
--  * a trainee could save rows whose data names another trainee, take a swap id meant for
--    another trainee, write a message "from the coach" or mark their own form as reviewed;
--  * anyone who self-signed-up could read the food list and forms;
--  * the last subscription day ended at 2 am Cairo time (UTC date);
--  * the media bucket took any file type and size;
--  * a trainee could rewrite or delete the coach's messages and the forms sent to them;
--  * any login, even a stray self sign-up, could upload into its own photos folder.
-- Also turn off Authentication > Sign In / Providers > "Allow new users to sign up" in Supabase.

begin;

create or replace function public.client_active() returns boolean
language sql stable security definer set search_path = public as $$
  -- Cairo's date, not the server's UTC one, so the last day lasts until midnight in Egypt
  select coalesce((my_client()->>'active')::boolean and (my_client()->>'subEnd')::date >= (now() at time zone 'Africa/Cairo')::date, false)
$$;

drop policy if exists own_rows on docs;
drop policy if exists own_rows_add on docs;
drop policy if exists own_rows_edit on docs;
drop policy if exists own_rows_remove on docs;
drop policy if exists foods_read on docs;
drop policy if exists forms_read on docs;

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

-- the server enforces what the app already checks: 50 MB at most, only videos and photos
update storage.buckets set file_size_limit = 52428800,
  allowed_mime_types = array['video/mp4','video/quicktime','video/webm','video/x-m4v','video/3gpp','image/jpeg','image/png','image/webp']
  where id = 'media';

-- progress photos: only real trainees (a clients row exists) may upload, so a stray sign-up can't fill the bucket
drop policy if exists own_photos on storage.objects;
create policy own_photos on storage.objects for all
  using (bucket_id = 'media' and name like 'photos/' || auth.uid()::text || '/%' and (select public.my_client()) is not null)
  with check (bucket_id = 'media' and name like 'photos/' || auth.uid()::text || '/%' and (select public.my_client()) is not null);

commit;
