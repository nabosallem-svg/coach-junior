import type { DB, Exercise, Food, TrainingPlan, NutritionPlan, Measurement } from "./types";
import { SEX_OPTIONS, ACTIVITY_OPTIONS, GOAL_OPTIONS } from "./intake";

const day = 86400000;
const iso = (offsetDays: number) => new Date(Date.now() + offsetDays * day).toISOString();
const isoDate = (offsetDays: number) => iso(offsetDays).slice(0, 10);

const exercises: Exercise[] = [
  { id: "ex-ty", name: "تسخين كتف", muscle: "shoulders", cue: "تسخين بأوزان خفيفة" },
  { id: "ex-incline-db", name: "ضغط دمبل عالي", muscle: "chest", cue: "انزل ببطء لحد ما تحس بفرد في الصدر" },
  { id: "ex-flat-bb", name: "بنش بار مستوي", muscle: "chest" },
  { id: "ex-fly", name: "تفتيح كابل", muscle: "chest", cue: "اقفل في النص وامسك ثانية" },
  { id: "ex-pulldown", name: "سحب أمامي", muscle: "back", cue: "اسحب بالكوع مش بالإيد" },
  { id: "ex-row", name: "سحب مسنود على الصدر", muscle: "back" },
  { id: "ex-rear", name: "كتف خلفي على الجهاز", muscle: "shoulders", cue: "رير دلت، متعليش الكتف" },
  { id: "ex-lateral", name: "رفرفة جانبي دمبل", muscle: "shoulders" },
  { id: "ex-ohp", name: "ضغط كتف دمبل جالس", muscle: "shoulders" },
  { id: "ex-curl", name: "باي دمبل على بنش مايل", muscle: "biceps" },
  { id: "ex-pushdown", name: "تراي حبل", muscle: "triceps" },
  { id: "ex-wrist", name: "سواعد دمبل", muscle: "forearms" },
  { id: "ex-squat", name: "هاك سكوات", muscle: "legs", cue: "نزول كامل وظهرك لازق" },
  { id: "ex-rdl", name: "رومانيان ديدلفت", muscle: "legs" },
  { id: "ex-legext", name: "رفرفة أمامي", muscle: "legs" },
  { id: "ex-calf", name: "سمانة واقف", muscle: "calves" },
];

const s = (n: number, reps: string, rir = "1") => Array.from({ length: n }, () => ({ reps, rir }));

const trainingPlans: TrainingPlan[] = [
  {
    id: "tp-ul",
    name: "علوي وسفلي - 4 أيام",
    days: [
      {
        id: "d1", name: "صدر وضهر",
        exercises: [
          { id: "pe1", exerciseId: "ex-ty", rest: "90", sets: s(2, "12-15", "3") },
          { id: "pe2", exerciseId: "ex-incline-db", rest: "90", note: "أول سيت تقيل", sets: s(3, "6-10", "1") },
          { id: "pe3", exerciseId: "ex-pulldown", rest: "90", sets: s(3, "8-12", "1") },
          { id: "pe4", exerciseId: "ex-fly", rest: "90", sets: s(2, "12-15", "0") },
          { id: "pe5", exerciseId: "ex-row", rest: "90", sets: s(3, "8-12", "1") },
          { id: "pe6", exerciseId: "ex-rear", rest: "90", sets: s(3, "15-20", "0") },
        ],
      },
      {
        id: "d2", name: "رجل",
        exercises: [
          { id: "pe7", exerciseId: "ex-squat", rest: "90", sets: s(3, "6-10", "1") },
          { id: "pe8", exerciseId: "ex-rdl", rest: "90", sets: s(3, "8-10", "2") },
          { id: "pe9", exerciseId: "ex-legext", rest: "90", sets: s(3, "12-15", "0") },
          { id: "pe10", exerciseId: "ex-calf", rest: "90", sets: s(4, "10-15", "0") },
        ],
      },
      {
        id: "d3", name: "أكتاف ودراعات",
        exercises: [
          { id: "pe11", exerciseId: "ex-ohp", rest: "90", sets: s(3, "6-10", "1") },
          { id: "pe12", exerciseId: "ex-lateral", rest: "90", sets: s(4, "12-20", "0") },
          { id: "pe13", exerciseId: "ex-curl", rest: "90", sets: s(3, "8-12", "1") },
          { id: "pe14", exerciseId: "ex-pushdown", rest: "90", sets: s(3, "10-15", "1") },
          { id: "pe15", exerciseId: "ex-wrist", rest: "90", sets: s(2, "15-20", "0") },
        ],
      },
    ],
  },
];

trainingPlans.push({
  id: "tp-fb",
  name: "فول بادي - 3 أيام",
  days: ["أ", "ب", "ج"].map((l, di) => ({
    id: `fb${di + 1}`,
    name: `يوم ${l}`,
    exercises: [
      { id: `fb${di}1`, rest: "120", exerciseId: di === 1 ? "ex-rdl" : "ex-squat", sets: s(3, "8-12", "2") },
      { id: `fb${di}2`, exerciseId: di === 1 ? "ex-flat-bb" : "ex-incline-db", sets: s(3, "8-12", "2") },
      { id: `fb${di}3`, exerciseId: di === 1 ? "ex-row" : "ex-pulldown", sets: s(3, "10-12", "2") },
      { id: `fb${di}4`, exerciseId: "ex-lateral", sets: s(2, "12-15", "1") },
      { id: `fb${di}5`, exerciseId: di === 1 ? "ex-pushdown" : "ex-curl", sets: s(2, "10-15", "1") },
    ],
  })),
});

const foods: Food[] = [
  { id: "f-egg", nameAr: "بيض", nameEn: "Egg", group: "protein", unit: "piece", per: 1, kcal: 78, c: 0.6, f: 5.3, p: 6.3 },
  { id: "f-chicken", nameAr: "صدور فراخ (مطبوخة)", nameEn: "Chicken breast (cooked)", group: "protein", unit: "g", per: 100, kcal: 165, c: 0, f: 3.6, p: 31 },
  { id: "f-beef", nameAr: "لحمة حمرا قليلة الدهن (مطبوخة)", nameEn: "Lean beef (cooked)", group: "protein", unit: "g", per: 100, kcal: 217, c: 0, f: 11.7, p: 26 },
  { id: "f-tuna", nameAr: "تونة مياه (مصفاة)", nameEn: "Tuna in water (drained)", group: "protein", unit: "g", per: 100, kcal: 116, c: 0, f: 1, p: 26 },
  { id: "f-fish", nameAr: "سمك بلطي (مطبوخ)", nameEn: "Tilapia (cooked)", group: "protein", unit: "g", per: 100, kcal: 128, c: 0, f: 2.7, p: 26 },
  { id: "f-rice", nameAr: "رز أبيض مطبوخ", nameEn: "White rice (cooked)", group: "carb", unit: "g", per: 100, kcal: 130, c: 28, f: 0.3, p: 2.7 },
  { id: "f-oats", nameAr: "شوفان", nameEn: "Oats", group: "carb", unit: "g", per: 100, kcal: 389, c: 66, f: 6.9, p: 17 },
  { id: "f-potato", nameAr: "بطاطس مسلوقة", nameEn: "Boiled potato", group: "carb", unit: "g", per: 100, kcal: 87, c: 20, f: 0.1, p: 1.9 },
  { id: "f-pasta", nameAr: "مكرونة مطبوخة", nameEn: "Pasta (cooked)", group: "carb", unit: "g", per: 100, kcal: 158, c: 31, f: 0.9, p: 5.8 },
  { id: "f-bread", nameAr: "عيش بلدي", nameEn: "Baladi bread", group: "carb", unit: "piece", per: 1, kcal: 250, c: 50, f: 1.5, p: 9 },
  { id: "f-olive", nameAr: "زيت زيتون", nameEn: "Olive oil", group: "fat", unit: "ml", per: 10, kcal: 80, c: 0, f: 9.1, p: 0 },
  { id: "f-pb", nameAr: "زبدة فول سوداني", nameEn: "Peanut butter", group: "fat", unit: "g", per: 15, kcal: 94, c: 3, f: 8, p: 4 },
  { id: "f-nuts", nameAr: "لوز", nameEn: "Almonds", group: "fat", unit: "g", per: 15, kcal: 87, c: 3, f: 7.5, p: 3.2 },
  { id: "f-salad", nameAr: "سلطة خضرا", nameEn: "Green salad", group: "veg", unit: "g", per: 100, kcal: 20, c: 4, f: 0.2, p: 1 },
  { id: "f-banana", nameAr: "موز", nameEn: "Banana", group: "fruit", unit: "piece", per: 1, kcal: 105, c: 27, f: 0.4, p: 1.3 },
  { id: "f-apple", nameAr: "تفاح", nameEn: "Apple", group: "fruit", unit: "piece", per: 1, kcal: 95, c: 25, f: 0.3, p: 0.5 },
  { id: "f-yogurt", nameAr: "زبادي يوناني", nameEn: "Greek yogurt", group: "dairy", unit: "g", per: 100, kcal: 59, c: 3.6, f: 0.4, p: 10 },
  { id: "f-cottage", nameAr: "جبنة قريش", nameEn: "Cottage cheese", group: "dairy", unit: "g", per: 100, kcal: 98, c: 3.4, f: 4.3, p: 11 },
  { id: "f-whey", nameAr: "واي بروتين", nameEn: "Whey protein", group: "supplement", unit: "scoop", per: 1, kcal: 120, c: 3, f: 1.5, p: 24 },
];

const nutritionPlans: NutritionPlan[] = [
  {
    id: "np-recomp",
    name: "تنشيف - 4 وجبات",
    meals: [
      {
        id: "m1", name: "الوجبة 1", note: "فيتامين د 5000 + كرياتين 5 جم (أي وقت)",
        items: [
          { id: "mi1", foodId: "f-egg", qty: 4 },
          { id: "mi2", foodId: "f-oats", qty: 60 },
          { id: "mi3", foodId: "f-banana", qty: 1 },
        ],
      },
      {
        id: "m2", name: "الوجبة 2", note: "السلطة خيار وخس وأي خضار تحبه",
        items: [
          { id: "mi4", foodId: "f-chicken", qty: 180 },
          { id: "mi5", foodId: "f-rice", qty: 200 },
          { id: "mi6", foodId: "f-salad", qty: 150 },
          { id: "mi7", foodId: "f-olive", qty: 10 },
        ],
      },
      {
        id: "m3", name: "قبل التمرين",
        items: [
          { id: "mi8", foodId: "f-yogurt", qty: 200 },
          { id: "mi9", foodId: "f-apple", qty: 1 },
          { id: "mi10", foodId: "f-nuts", qty: 15 },
        ],
      },
      {
        id: "m4", name: "بعد التمرين",
        items: [
          { id: "mi11", foodId: "f-whey", qty: 1 },
          { id: "mi12", foodId: "f-fish", qty: 200 },
          { id: "mi13", foodId: "f-potato", qty: 250 },
        ],
      },
    ],
  },
];

nutritionPlans.push({
  id: "np-skinnyfat",
  name: "سكيني فات - 4 وجبات",
  meals: [
    { id: "sf1", name: "الفطار", items: [{ id: "sfi1", foodId: "f-egg", qty: 3 }, { id: "sfi2", foodId: "f-bread", qty: 1 }, { id: "sfi3", foodId: "f-yogurt", qty: 150 }] },
    { id: "sf2", name: "الغدا", note: "بروتين عالي وكارب متوسط", items: [{ id: "sfi4", foodId: "f-chicken", qty: 200 }, { id: "sfi5", foodId: "f-rice", qty: 150 }, { id: "sfi6", foodId: "f-salad", qty: 150 }] },
    { id: "sf3", name: "قبل التمرين", items: [{ id: "sfi7", foodId: "f-banana", qty: 1 }, { id: "sfi8", foodId: "f-pb", qty: 15 }] },
    { id: "sf4", name: "العشا", items: [{ id: "sfi9", foodId: "f-tuna", qty: 150 }, { id: "sfi10", foodId: "f-potato", qty: 200 }, { id: "sfi11", foodId: "f-whey", qty: 1 }] },
  ],
});

const weights = [79.2, 78.8, 78.1, 77.9, 77.0, 76.6, 76.1, 75.4, 75.0, 74.6, 74.1, 73.5, 73.0, 72.5];
const measurements: Measurement[] = weights.map((w, i) => ({
  id: `ms${i}`,
  clientId: "c1",
  date: isoDate(-7 * (weights.length - 1 - i)),
  weight: w,
  waist: Math.round((92 - i * 0.6) * 10) / 10,
}));
measurements.push(
  { id: "ms-c2a", clientId: "c2", date: isoDate(-28), weight: 64.0 },
  { id: "ms-c2b", clientId: "c2", date: isoDate(-14), weight: 65.1 },
  { id: "ms-c2c", clientId: "c2", date: isoDate(-1), weight: 66.0 },
);

export function makeSeed(): DB {
  return {
    clients: [
      { id: "c1", name: "أحمد سامي", phone: "+201000000001", password: "ahmed123", goal: "سكيني فات: تنشيف وبناء عضل", packageName: "3+1", subStart: isoDate(-116), subEnd: isoDate(4), trainingPlanId: "tp-ul", nutritionPlanId: "np-recomp", active: true },
      { id: "c2", name: "محمد علي", phone: "+201000000002", password: "mohamed123", goal: "تضخيم", packageName: "6+1", subStart: isoDate(-30), subEnd: isoDate(180), trainingPlanId: "tp-ul", active: true },
      { id: "c3", name: "يوسف حسن", phone: "+201000000003", password: "youssef123", goal: "لياقة عامة", packageName: "1", subStart: isoDate(-3), subEnd: isoDate(27), active: true },
    ],
    measurements,
    exercises,
    trainingPlans,
    logs: [
      {
        id: "log1", clientId: "c1", planId: "tp-ul", dayId: "d1", date: iso(-3),
        sets: {
          pe2: [{ weight: "26", reps: "9", done: true }, { weight: "26", reps: "8", done: true }, { weight: "24", reps: "9", done: true }],
          pe3: [{ weight: "60", reps: "11", done: true }, { weight: "60", reps: "10", done: true }, { weight: "55", reps: "11", done: true }],
        },
      },
    ],
    foods,
    nutritionPlans,
    swaps: [],
    forms: [
      {
        id: "fm-start", title: "استمارة البداية", starter: true,
        questions: [
          { id: "s6", type: "choice", label: "النوع", options: SEX_OPTIONS },
          { id: "s7", type: "number", label: "السن" },
          { id: "s1", type: "number", label: "الطول (سم)" },
          { id: "s2", type: "number", label: "الوزن (كجم)" },
          { id: "s8", type: "choice", label: "مستوى نشاطك", options: ACTIVITY_OPTIONS },
          { id: "s9", type: "choice", label: "هدفك", options: GOAL_OPTIONS },
          { id: "s3", type: "choice", label: "خبرتك في الجيم", options: ["مبتدئ", "متوسط", "متقدم"] },
          { id: "s4", type: "text", label: "إصابات أو أمراض؟" },
          { id: "s5", type: "text", label: "أكلات مش بتحبها" },
        ],
      },
    ],
    assignments: [
      { id: "as2", formId: "fm-start", clientId: "c1", sentAt: iso(-116), status: "submitted", submittedAt: iso(-115), reviewed: true, answers: { s6: "ذكر", s7: "27", s1: "178", s2: "79.5", s8: "تمرين 3-5 أيام", s9: "تنشيف", s3: "متوسط", s4: "مفيش", s5: "الكبدة" } },
      { id: "as3", formId: "fm-start", clientId: "c3", sentAt: iso(-3), status: "pending" },
    ],
    messages: [
      { id: "msg1", clientId: "c1", from: "coach", text: "أهلاً يا أحمد، نزلتلك الخطة الجديدة. ابدأ بيها من بكره وابعتلي أوزانك أول أسبوع.", at: iso(-2), read: true },
      { id: "msg2", clientId: "c1", from: "client", text: "تمام يا كوتش، هل ينفع أبدّل الرز بمكرونة؟", at: iso(-1.9), read: true },
      { id: "msg3", clientId: "c1", from: "coach", text: "أيوه عادي، استخدم زرار «بدّل الأكلة» وهيحسبلك الكمية.", at: iso(-1.8), read: false },
      { id: "msg4", clientId: "c2", from: "client", text: "كوتش الهاك سكوات واجعني في الركبة شوية", at: iso(-0.1), read: false },
    ],
    eaten: [],
  };
}
