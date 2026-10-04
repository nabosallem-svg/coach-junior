# Coach Junior Platform

Client app and coach panel for كابتن جونيور. Same look as the landing page (gold on near-black, Cairo + Anton, Arabic RTL with an English toggle), mobile first.

- **Client** (`/app`): home with subscription status, weight/waist progress and today's workout and meals; nutrition plan with macros, food swap at equal calories, meal check-off and a weekly shopping list; training plan by day with exercise videos, sets/reps/tempo/RIR, previous numbers and a "start this day" logger; forms from the coach; chat with the coach.
- **Coach** (`/coach`): dashboard (who needs attention), clients (add after payment, extend subscription, assign plans, send forms, read answers, see logged workouts), video library (upload his own exercise videos or paste a link), training / nutrition plan builders and form builder, messages.

## Run

```sh
cd platform
npm install
npm run dev      # http://localhost:3000
```

## Demo mode

There is no backend yet. All data lives in the browser (`localStorage`, uploaded videos in IndexedDB) and starts from `lib/seed.ts`, so both sides can be clicked through on one device. "Reset demo data" on the sign-in page restores the seed.

## Connecting Supabase (next step)

1. Create a Supabase project and run `supabase/schema.sql` (tables, RLS, private `exercise-videos` bucket).
2. Add `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` in `.env.local` / Vercel.
3. Replace the demo `StoreProvider` (`lib/store.tsx`) and media helpers (`lib/media.ts`) with Supabase calls; the pages only use `useStore()` and `useVideoSrc()`.

Client sign-in is by phone (OTP); the coach creates the account after payment.
