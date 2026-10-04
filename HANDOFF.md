# Coach Junior: handoff

> **بالعربي باختصار:** المشروع فيه حاجتين: صفحة الموقع (Landing) في جذر الريبو، ومنصة المشتركين ولوحة الكابتن في فولدر `platform/`. المنصة شغالة دلوقتي على https://coach-junior.vercel.app ببيانات تجريبية محفوظة في المتصفح. الخطوة الجاية الأساسية هي ربط Supabase عشان الحسابات تشتغل من أي موبايل. باسورد الكابتن التجريبي: `junior2026`. كل التفاصيل تحت بالإنجليزي عشان أي AI أو مبرمج يكمل.

Repo: `github.com/nabosallem-svg/coach-junior` (default branch `main`). Owner: nabeeh (writes Egyptian Arabic). Coach: كابتن عبد الملك «جونيور», WhatsApp **+20 101 400 7764**.

## 1. Layout

| Path | What |
| --- | --- |
| `/` (root) | Landing page. `src/index.html` is the source (HTML+CSS+JS in one file), `index.html` is the minified build (`npm run build`). GSAP/ScrollTrigger/Lenis self-hosted in `vendor/`, fonts in `fonts/`, AVIF/WebP photos in `img/`. See root `README.md`. |
| `platform/` | Trainee app (`/app/*`) and coach panel (`/coach/*`). Next.js 16 (App Router, Turbopack), TypeScript, Tailwind v4, lucide-react. |
| `platform/supabase/schema.sql` | Draft Postgres schema with RLS and a private `exercise-videos` bucket (not wired yet, see §6). |

## 2. Run, build, deploy

```sh
cd platform && npm install
npm run dev                 # http://localhost:3000
npx next build && npx next start
```

- **Live platform:** Vercel project `coach-junior` on the owner's account (`vercel.com/nabeeh2`), **Root Directory = `platform`**, auto-deploys every push to `main`.
- **Static copy (optional):** `STATIC_EXPORT=1 BASE_PATH=/some/path npx next build` writes `out/`. It drops the API route (`pageExtensions: ["tsx"]`), so AI macros don't work there.
- Env vars (Vercel → Settings → Environment Variables):
  - `ANTHROPIC_API_KEY`: turns on the "احسب السعرات تلقائي" button (route `app/api/macros/route.ts`, model `claude-haiku-4-5-20251001`). Without it the button says AI isn't set up and the form stays manual. **Not set yet.**
  - `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`: for the Supabase step. **Not provided yet.**

## 3. Style rules

- Same look as the landing: gold `#d4af37` on near-black `#0a0a0c`, Cairo (Arabic + Latin) and Anton, loaded with `next/font/local` (`adjustFontFallback: false`, otherwise Windows renders Arabic in Arial).
- Arabic RTL first, EN toggle. **Each mode is one language only** (user request). Coach-entered data (exercise names, plan names) stays as typed. Strings live in `lib/i18n.tsx` as `key: [ar, en]`.
- Mobile first: test at 360–390 px, no horizontal scroll. Numbers use `.num` (LTR, tabular).
- Motion is CSS only (transform/opacity, `fill-mode: backwards`), disabled with `prefers-reduced-motion`. No heavy libraries in the platform.
- Custom Tailwind classes are `@utility` in `app/globals.css` (`card`, `btn-gold`, `btn-ghost`, `btn-quiet`, `input`, `chip`, `h1`, `label`).

## 4. Product decisions (from the owner)

1. **Only the coach creates accounts.** Coach → المشتركين → إضافة مشترك: name, phone, goal, package (1 / 3+1 / 6+1 / 12+1 months), a password he types or generates, training and nutrition template. Then "ابعت على واتساب" sends the trainee a message with a link to `/?login=client&phone=…`, phone and password. No trainee self sign-up.
2. Login = phone (last 10 digits compared) + password. Coach has a separate tab (demo password `junior2026`).
3. **Follow-up happens on WhatsApp**, not in the app: no chat, no recurring check-in forms. Only the starter form "استمارة البداية" remains. The trainee bottom nav has a WhatsApp tab to the coach.
4. **Per-trainee plans:** plans without `ownerId` are templates. On a trainee's page, "خصّص الخطة لـ …" clones the assigned template into a personal copy (`ownerId = clientId`) and opens the editor; edits don't touch the template or other trainees.
5. Coach can add new foods from the meal builder (name, type for swaps, amount + unit, macros; kcal auto = 4P+4C+9F if empty), saved to the food library.
6. Video upload: the coach must name each video and pick its muscle (no silent default; phone/screen-recorder file names are ignored).
7. Subscription: "تمديد شهر" only moves the end date; "تفعيل / إيقاف الاشتراك" toggles access. Both ask for confirmation. A paused trainee sees a wall screen.
8. Exercise card in the builder: sets stepper, reps for all sets, rest between sets (60/90/120/180 s or custom), note; tempo/RIR ("احتياطي") and per-set rows are opt-in.
9. Keep replies and work lean; the owner asked to conserve usage.

## 5. Code map (`platform/`)

- `lib/types.ts`: data model. `Client` (phone, demo `password`, package, `subStart/subEnd`, `active`, `trainingPlanId`, `nutritionPlanId`), `Exercise` (muscle, cue, `videoKey` in IndexedDB or `videoUrl`), `TrainingPlan` → days → `PlanExercise` (`sets[]` of reps/tempo/rir, `rest`, `note`), `Food` (macros per `per` × `unit`), `NutritionPlan` → meals → items, `Swap`, `WorkoutLog`, `Measurement`, `FormTemplate`/`FormAssignment`.
- `lib/store.tsx`: **demo backend.** Whole DB in `localStorage` key `cj-platform-db-v9` (bump the version when the seed changes), session in `cj-platform-session-v1`. `useStore()` gives `db`, `update(fn)`, `session`, `setSession`, `reset`. `uid()`, `normPhone()`, `genPassword()`.
- `lib/media.ts`: uploaded videos in IndexedDB. `lib/seed.ts`: demo data (3 trainees `01000000001/ahmed123`, `…02/mohamed123`, `…03/youssef123`, Arabic exercises, templates "علوي وسفلي - 4 أيام", "فول بادي - 3 أيام", "تنشيف - 4 وجبات", "سكيني فات - 4 وجبات"; food values checked against USDA, cooked weights).
- `lib/plans.ts` (`personalize`), `lib/calc.ts` (macros, swaps, dates), `lib/wa.ts` (`waLink`, converts 01x → 201x), `lib/hooks.ts`.
- Pages: `app/page.tsx` login; `app/app/*` trainee (home, nutrition, training, training/session, forms); `app/coach/*` coach (dashboard, clients, clients/view, library, plans + training/nutrition/forms editors). Detail pages use `?id=` so a static export works.
- Components: `ClientShell`, `CoachShell`, `ExerciseCard`, `Creds`, `Activate`, `ui.tsx` (Sheet, Field, Pills, Segmented, Toast…), `charts.tsx`, `MacroLine`.

## 6. Going live: what's left

The demo stores everything in the browser, so **a trainee added on the coach's phone can't log in from their own phone yet.** Next step:

1. Create a Supabase project, run `supabase/schema.sql`. Update it first: add `owner_id` to `training_plans`/`nutrition_plans`, `rest` on plan exercises (they're inside the JSON days column), and drop the self-sign-up parts of `handle_new_user` (accounts are created by the coach now).
2. Coach "إضافة مشترك" → a server route with the service key calling `auth.admin.createUser({ phone, password, phone_confirm: true })` + insert into `clients`. Trainees sign in with `signInWithPassword({ phone, password })`. Reset password = `auth.admin.updateUserById`.
3. Replace `StoreProvider` (`lib/store.tsx`) and `lib/media.ts` with Supabase queries/storage (signed URLs). Pages only use `useStore()` and `useVideoSrc()`, so the swap is contained.
4. For many/long videos consider Bunny Stream (signed URLs) instead of Supabase storage.
5. Costs told to the owner: Supabase free → Pro ~$25/mo; Vercel Hobby is non-commercial → Pro ~$20/mo (or Netlify); Bunny ~$1–3/mo; Anthropic key ~ less than a cent per AI food lookup.

## 7. Status of the owner's recent requests (2026-10-04)

All merged to `main` and live (PRs #6–#19):
coach-only accounts with own password · full mobile pass and fixes · builder typography/colours · all-Arabic UI · per-trainee plan copies · CSS animations + Windows Arabic font fix · add new food · AI calories (needs `ANTHROPIC_API_KEY`) · video upload asks name + muscle · coach and trainee walkthrough fixes · simpler exercise card with rest · extend vs activate + confirmations · WhatsApp link opens the trainee login, international wa.me numbers.

Open / waiting on the owner:
- Supabase Project URL + anon key (and service role key for the server route) → §6.
- `ANTHROPIC_API_KEY` on Vercel for AI calories.
- Real coach photos/prices for the landing if not final; a custom domain.
- Old data in a browser that used an earlier demo version: hard refresh (the DB key version bump resets it).
