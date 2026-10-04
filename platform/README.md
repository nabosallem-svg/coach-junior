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

## Demo mode

There is no backend yet. All data lives in the browser (`localStorage`, uploaded videos in IndexedDB) and starts from `lib/seed.ts`, so both sides can be clicked through on one device. "Reset demo data" on the sign-in page restores the seed.

## Connecting Supabase (next step)

1. Create a Supabase project and run `supabase/schema.sql` (tables, RLS, private `exercise-videos` bucket).
2. Add `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` in `.env.local` / Vercel.
3. Replace the demo `StoreProvider` (`lib/store.tsx`) and media helpers (`lib/media.ts`) with Supabase calls; the pages only use `useStore()` and `useVideoSrc()`.

## Accounts

Only the coach creates accounts: **المشتركين → إضافة مشترك** (name, phone, goal, package, a password he types or generates, training and nutrition template). "ابعت على واتساب" then sends the trainee a link to `/?login=client&phone=…` with the phone and password. Follow-up happens on WhatsApp; there is no in-app chat. Plans without `ownerId` are templates; "خصّص الخطة لـ …" on a trainee's page makes a personal copy. A paused trainee sees a wall screen.

With Supabase, a server route creates the user with `auth.admin.createUser({ phone, password, phone_confirm: true })` (no SMS cost) and trainees sign in with `signInWithPassword`. RLS limits every row to its owner, and a trainee can only open videos of exercises in their own assigned plan while their subscription is active.

Demo logins are listed under "Demo accounts" on the sign-in page (coach password `junior2026`). See `../HANDOFF.md` for the full picture.
