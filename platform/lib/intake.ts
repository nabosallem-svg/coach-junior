import { targets, type Activity, type Goal } from "./calc";
import type { Client, DB } from "./types";

/** options of the starter form questions; the index maps to the calculator values */
export const SEX_OPTIONS = ["ذكر", "أنثى"];
export const ACTIVITY_OPTIONS = ["قاعد معظم اليوم", "تمرين 1-3 أيام", "تمرين 3-5 أيام", "تمرين 6-7 أيام", "شغل بدني + تمرين"];
export const GOAL_OPTIONS = ["تنشيف", "ثبات", "تضخيم"];
const ACTS: Activity[] = ["sedentary", "light", "moderate", "high", "athlete"];
const GOALS: Goal[] = ["cut", "maintain", "bulk"];

export type NeedsInput = { sex: "m" | "f"; age: number; heightCm: number; weightKg: number; activity: Activity; goal: Goal };

/** what the trainee answered in the starter form (questions matched by a word in their label), plus the latest weigh-in */
export function intakeInputs(db: DB, c: Client) {
  const a = db.assignments.filter((x) => x.clientId === c.id && x.status === "submitted" && x.answers).sort((x, y) => (y.submittedAt ?? "").localeCompare(x.submittedAt ?? ""))[0];
  const form = a && db.forms.find((f) => f.id === a.formId);
  const ans = (...words: string[]) => {
    const q = form?.questions.find((qq) => words.some((w) => qq.label.includes(w)));
    return (q && a?.answers?.[q.id]?.trim()) || "";
  };
  const num = (s: string) => parseFloat(s.replace(/[٠-٩]/g, (d) => String("٠١٢٣٤٥٦٧٨٩".indexOf(d)))) || 0;
  const lastWeight = db.measurements.filter((m) => m.clientId === c.id).sort((x, y) => x.date.localeCompare(y.date)).at(-1)?.weight;
  const act = ACTIVITY_OPTIONS.indexOf(ans("نشاط"));
  const goalAns = GOAL_OPTIONS.indexOf(ans("هدف"));
  const goal: Goal = goalAns >= 0 ? GOALS[goalAns] : /تنشيف|cut/i.test(c.goal) ? "cut" : /تضخيم|bulk/i.test(c.goal) ? "bulk" : "maintain";
  return {
    submitted: !!a,
    input: {
      sex: ans("النوع", "الجنس") === SEX_OPTIONS[1] ? "f" : "m",
      age: num(ans("السن", "العمر")),
      heightCm: num(ans("الطول")),
      weightKg: lastWeight ?? num(ans("الوزن")),
      activity: act >= 0 ? ACTS[act] : "moderate",
      goal,
    } as NeedsInput,
  };
}

export const complete = (i: NeedsInput) => i.age > 0 && i.heightCm > 0 && i.weightKg > 0;

/** daily targets: the coach's own numbers if he edited them, otherwise calculated from the starter form */
export function clientTargets(db: DB, c: Client) {
  if (c.targets) return c.targets;
  const { input } = intakeInputs(db, c);
  if (!complete(input)) return null;
  const r = targets(input);
  return { kcal: r.kcal, p: r.p, c: r.c, f: r.f };
}
