# Coach Junior Platform

Client app and coach panel for كابتن جونيور. Same look as the landing page (gold on near-black, Cairo + Anton, Arabic RTL with an English toggle), mobile first.

- **Client** (`/app`): home with subscription status, weight/waist progress and today's workout and meals; nutrition plan with macros, food swap at equal calories, meal check-off and a weekly shopping list; training plan by day with exercise videos, sets/reps/RIR, previous numbers and a "start this day" logger; the starter form; a WhatsApp tab to the coach.
- **Coach** (`/coach`): dashboard (who needs attention), clients (add with a password and plans, send login on WhatsApp, extend / pause, personal plan copies, see logged workouts), video library (drag in several videos at once, or upload one / paste a link), training / nutrition plan builders and form builder.

## Run

```sh
cd platform
npm install
npm run dev      # http://localhost:3000
```

## Static demo build

`STATIC_EXPORT=1 BASE_PATH=/coach-junior/platform npm run build` writes a static copy to `out/` that works under that sub-path (used for the GitHub Pages preview). Detail pages take `?id=` query params instead of path segments so they work without a server.

## Demo mode vs live mode

Without Supabase keys all data lives in the browser (`localStorage`, uploaded media in IndexedDB) and starts from `lib/seed.ts`, so both sides can be clicked through on one device. "Reset demo data" on the sign-in page restores the seed.

With `NEXT_PUBLIC_SUPABASE_URL` + `NEXT_PUBLIC_SUPABASE_ANON_KEY` set, the same pages run on Supabase. `lib/sync.ts` stores each record as a row of `public.docs`, and `lib/media.ts` uses the private `media` bucket.

## Connecting Supabase

1. Create a Supabase project. In **SQL Editor** run all of `supabase/schema.sql`. It creates the `docs` table, RLS policies and a private `media` bucket.
2. **Authentication → Users → Add user**: email `coach@coach-junior.app`, the coach's password, "Auto Confirm User" on. Then run:
   `insert into public.coaches (id) select id from auth.users where email = 'coach@coach-junior.app';`
3. In Vercel, under **Settings → Environment Variables**, add `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY` and `SUPABASE_SERVICE_ROLE_KEY` (server only, never `NEXT_PUBLIC_`). Then redeploy. See `.env.example`.
4. The coach logs in with his password only. His first login copies the starter library (foods, exercises, plan templates). After that he adds trainees as before. `/api/accounts` creates their Supabase login, and they sign in with phone + password from any device.

## Accounts

Only the coach creates accounts: **المشتركين → إضافة مشترك** (name, phone, goal, package, a password he types or generates, training and nutrition template). "ابعت على واتساب" then sends the trainee a link to `/?login=client&phone=…` with the phone and password. Follow-up happens on WhatsApp; there is no in-app chat. Plans without `ownerId` are templates; "خصّص الخطة لـ …" on a trainee's page makes a personal copy. A paused trainee sees a wall screen.

Live, `/api/accounts` creates the trainee's Supabase login (service key, coach only). Trainees sign in with phone + password. RLS limits every row to its owner, and a trainee only sees the plans and exercises assigned to them while their subscription is active.

Demo logins are listed under "Demo accounts" on the sign-in page (coach password `123456789`). See `../HANDOFF.md` for the full picture.
