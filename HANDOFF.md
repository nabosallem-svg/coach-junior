# Coach Junior: handoff

> **بالعربي باختصار:** المشروع فيه حاجتين: صفحة الموقع (Landing) في جذر الريبو، ومنصة المشتركين ولوحة الكابتن في فولدر `platform/`. المنصة شغالة دلوقتي على https://coach-junior.vercel.app ببيانات تجريبية محفوظة في المتصفح. ربط Supabase جاهز في الكود: أول ما تتحط المفاتيح على Vercel الحسابات تشتغل من أي موبايل (خطوات §6). باسورد الكابتن التجريبي: `junior2026`. كل التفاصيل تحت بالإنجليزي عشان أي AI أو مبرمج يكمل.

Repo: `github.com/nabosallem-svg/coach-junior` (default branch `main`). Owner: nabeeh (writes Egyptian Arabic). Coach: كابتن عبد الملك «جونيور», WhatsApp **+20 101 400 7764**.

## 1. Layout

| Path | What |
| --- | --- |
| `/` (root) | Landing page. `src/index.html` is the source (HTML+CSS+JS in one file), `index.html` is the minified build (`npm run build`). GSAP/ScrollTrigger/Lenis self-hosted in `vendor/`, fonts in `fonts/`, AVIF/WebP photos in `img/`. See root `README.md`. |
| `platform/` | Trainee app (`/app/*`) and coach panel (`/coach/*`). Next.js 16 (App Router, Turbopack), TypeScript, Tailwind v4, lucide-react. |
| `platform/supabase/schema.sql` | Supabase schema: `docs` table + RLS + private `media` bucket (wired, see §6). |

## 2. Run, build, deploy

```sh
cd platform && npm install
npm run dev                 # http://localhost:3000
npx next build && npx next start
```

- **Live platform:** Vercel project `coach-junior` on the owner's account (`vercel.com/nabeeh2`), **Root Directory = `platform`**, auto-deploys every push to `main`.
- **Static copy (optional):** `STATIC_EXPORT=1 BASE_PATH=/some/path npx next build` writes `out/`. It drops the API route (`pageExtensions: ["tsx"]`), so AI macros don't work there.
- Env vars (Vercel → Settings → Environment Variables):
  - `GEMINI_API_KEY`: AI via `lib/ai.ts` (model `gemini-flash-latest`, falls back to `gemini-flash-lite-latest` when busy). Powers "احسب السعرات تلقائي" for new foods (`/api/macros`) and the trainee's "صوّر وجبتك" meal-photo estimate on the nutrition page (`/api/meal`). `ANTHROPIC_API_KEY` still works as a fallback if Gemini isn't set. Without either key the buttons say AI isn't set up.
    Also `/api/ai` (one route, task-based prompts; client helper `lib/aiTasks.ts`): coach trainee page → "ملخص الأسبوع", "رسالة واتس جاهزة" (editable, opens WhatsApp), "قارن آخر صورتين", "اعمل مسودة أكل بالذكاء الاصطناعي" (creates a personal nutrition plan from the intake form using only the coach's foods, then opens the editor); trainee workout → "مش لاقي الجهاز؟" picks a replacement from the coach's library. Live RLS lets active trainees read the whole exercise library for this.
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
8. Exercise card in the builder: sets stepper, reps for all sets, rest between sets (60/90/120/180 s or custom), note; RIR ("احتياطي") and per-set rows are opt-in.
9. Keep replies and work lean; the owner asked to conserve usage.

## 5. Code map (`platform/`)

- `lib/types.ts`: data model. `Client` (phone, demo `password`, package, `subStart/subEnd`, `active`, `trainingPlanId`, `nutritionPlanId`), `Exercise` (muscle, cue, `videoKey` in IndexedDB or `videoUrl`), `TrainingPlan` → days → `PlanExercise` (`sets[]` of reps/rir, `rest`, `note`), `Food` (macros per `per` × `unit`), `NutritionPlan` → meals → items, `Swap`, `WorkoutLog`, `Measurement`, `FormTemplate`/`FormAssignment`.
- `lib/store.tsx`: **demo backend.** Whole DB in `localStorage` key `cj-platform-db-v9` (bump the version when the seed changes), session in `cj-platform-session-v1`. `useStore()` gives `db`, `update(fn)`, `session`, `setSession`, `reset`. `uid()`, `normPhone()`, `genPassword()`.
- `lib/media.ts`: uploaded videos in IndexedDB. `lib/seed.ts`: demo data (3 trainees `01000000001/ahmed123`, `…02/mohamed123`, `…03/youssef123`, Arabic exercises, templates "علوي وسفلي - 4 أيام", "فول بادي - 3 أيام", "تنشيف - 4 وجبات", "سكيني فات - 4 وجبات"; food values checked against USDA, cooked weights).
- `lib/plans.ts` (`personalize`), `lib/calc.ts` (macros, swaps, dates), `lib/wa.ts` (`waLink`, converts 01x → 201x), `lib/hooks.ts`.
- Pages: `app/page.tsx` login; `app/app/*` trainee (home, nutrition, training, training/session, forms); `app/coach/*` coach (dashboard, clients, clients/view, library, plans + training/nutrition/forms editors). Detail pages use `?id=` so a static export works.
- Components: `ClientShell`, `CoachShell`, `ExerciseCard`, `Creds`, `Activate`, `ui.tsx` (Sheet, Field, Pills, Segmented, Toast…), `charts.tsx`, `MacroLine`.

## 6. Going live: Supabase (code is ready, keys pending)

The app has two modes. If the Supabase keys are missing it runs on demo data in the browser, as now. If they are set it switches to live mode: Supabase Auth handles logins, `public.docs` stores the data, and the `media` bucket holds videos and photos.

- `lib/supabase.ts`: the client and the `LIVE` flag. Logins are phone + password, stored in Auth as `<last 10 digits>@coach-junior.app` (no SMS provider needed).
- `lib/sync.ts`: every record is one `docs` row (`coll`, `id`, `client_id`, `data` jsonb). `update()` diffs before and after and upserts or deletes only what changed. Passwords never leave the browser.
- `lib/accounts.ts` → `app/api/accounts/route.ts` (service key, coach-only): create trainee, reset password, delete.
- `lib/media.ts`: `videos/<key>` and `photos/<clientId>/<id>.jpg` in the `media` bucket, played through signed URLs.
- RLS (tested on a local Postgres 16 with a stubbed `auth.uid()`): the coach sees everything. A trainee sees their own client record, food list, assigned plans and those plans' exercises (only while active and in date), and their own logs, weights and photos. A trainee can't write to another trainee's rows.

Setup:

1. Create a Supabase project. In **SQL Editor** run all of `platform/supabase/schema.sql`. It creates the `docs` table, RLS policies and a private `media` bucket.
2. **Authentication → Users → Add user**: email `coach@coach-junior.app`, the coach's password, "Auto Confirm User" on. Then run:
   `insert into public.coaches (id) select id from auth.users where email = 'coach@coach-junior.app';`
3. In Vercel, under **Settings → Environment Variables**, add `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY` and `SUPABASE_SERVICE_ROLE_KEY` (server only, never `NEXT_PUBLIC_`). Then redeploy. See `platform/.env.example`.
4. The coach logs in with his password only. His first login copies the starter library (foods, exercises, plan templates). After that he adds trainees as before. `/api/accounts` creates their Supabase login, and they sign in with phone + password from any device.

5. For many/long videos consider Bunny Stream (signed URLs) instead of Supabase storage.
6. Costs told to the owner: Supabase free → Pro ~$25/mo; Vercel Hobby is non-commercial → Pro ~$20/mo (or Netlify); Bunny ~$1–3/mo; Anthropic key ~ less than a cent per AI food lookup.

## 7. Status of the owner's recent requests (2026-10-04)

All merged to `main` and live (PRs #6–#19):
coach-only accounts with own password · full mobile pass and fixes · builder typography/colours · all-Arabic UI · per-trainee plan copies · CSS animations + Windows Arabic font fix · add new food · AI calories (needs `ANTHROPIC_API_KEY`) · video upload asks name + muscle · coach and trainee walkthrough fixes · simpler exercise card with rest · extend vs activate + confirmations · WhatsApp link opens the trainee login, international wa.me numbers.

Open / waiting on the owner:
- Supabase Project URL + anon key + service role key on Vercel, plus the two setup steps in §6.
- `GEMINI_API_KEY` on Vercel for AI calories and meal photos.
- Real coach photos/prices for the landing if not final; a custom domain.
- Old data in a browser that used an earlier demo version: hard refresh (the DB key version bump resets it).
