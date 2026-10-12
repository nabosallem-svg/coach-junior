-- Run once in the Supabase SQL editor on a project made from an older schema.sql.
-- Safe to run again. Makes the app fast with hundreds of trainees:
--  * indexes for "this trainee's rows" and "recent workout logs";
--  * policies call is_coach() / auth.uid() / my_client() once per query instead of once per row
--    (wrapped in select, as Supabase recommends);
--  * deletes ticked-meal rows older than a week (the app now cleans these up itself).

begin;

create index if not exists docs_client2 on public.docs (client_id, coll);
create index if not exists docs_coll_updated on public.docs (coll, updated_at);
drop index if exists public.docs_client;

drop policy if exists coach_all on docs;
drop policy if exists own_client on docs;
drop policy if exists own_rows on docs;
drop policy if exists foods_read on docs;
drop policy if exists forms_read on docs;
drop policy if exists plans_read on docs;
drop policy if exists exercises_read on docs;

create policy coach_all on docs for all using ((select is_coach())) with check ((select is_coach()));

-- trainee: own subscription record, read only (password changes go through Supabase Auth)
create policy own_client on docs for select using (coll = 'clients' and id = (select auth.uid())::text);

-- trainee: their own logs, weights, photos, swaps, ticked meals, forms
create policy own_rows on docs for all
  using (coll in ('measurements','logs','swaps','photos','eaten','assignments','messages') and client_id = (select auth.uid()))
  with check (coll in ('measurements','logs','swaps','photos','eaten','assignments','messages') and client_id = (select auth.uid()));

-- trainee: food list, assigned plans and the exercise library while the subscription runs
create policy foods_read on docs for select using (coll = 'foods' and (select auth.uid()) is not null);
create policy forms_read on docs for select using (coll = 'forms' and (select auth.uid()) is not null);
create policy plans_read on docs for select using (
  (select client_active()) and (
    (coll = 'trainingPlans' and id = (select my_client()->>'trainingPlanId')) or
    (coll = 'nutritionPlans' and id = (select my_client()->>'nutritionPlanId'))
  )
);
-- the whole exercise library, so "مش لاقي الجهاز؟" can suggest a replacement
create policy exercises_read on docs for select using (coll = 'exercises' and (select client_active()));

delete from public.docs where coll = 'eaten' and split_part(id, '|', 2) < to_char(current_date - 7, 'YYYY-MM-DD');

commit;
