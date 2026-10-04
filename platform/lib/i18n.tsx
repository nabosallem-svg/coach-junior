"use client";

import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from "react";

export type Lang = "ar" | "en";

const dict = {
  // shell
  brand: ["JUNIOR", "JUNIOR"],
  langToggle: ["EN", "ع"],
  home: ["الرئيسية", "Home"],
  nutrition: ["التغذية", "Nutrition"],
  training: ["التمرين", "Training"],
  forms: ["الفورمز", "Forms"],
  messages: ["الرسائل", "Messages"],
  notifications: ["الإشعارات", "Notifications"],
  noNotifications: ["مفيش إشعارات جديدة", "No new notifications"],
  logout: ["تسجيل خروج", "Log out"],
  save: ["حفظ", "Save"],
  saved: ["اتحفظ", "Saved"],
  cancel: ["إلغاء", "Cancel"],
  delete: ["حذف", "Delete"],
  edit: ["تعديل", "Edit"],
  add: ["إضافة", "Add"],
  back: ["رجوع", "Back"],
  close: ["قفل", "Close"],
  none: ["مفيش", "None"],
  kg: ["كجم", "kg"],
  kcal: ["سعرة", "kcal"],
  days: ["يوم", "days"],

  // entry
  entryTitle: ["منصة كوتش جونيور", "Coach Junior Platform"],
  entrySub: ["خطتك، أكلك، تمرينك والمتابعة مع الكابتن في مكان واحد.", "Your plan, meals, workouts and coach check-ins in one place."],
  enterClient: ["دخول كمشترك", "Sign in as client"],
  enterCoach: ["دخول الكابتن", "Coach sign in"],
  demoNote: ["نسخة تجريبية ببيانات وهمية. أي تعديل بيتحفظ على الجهاز ده بس.", "Demo with sample data. Changes are saved on this device only."],
  resetDemo: ["رجّع البيانات التجريبية", "Reset demo data"],
  chooseClient: ["اختار المشترك", "Choose a client"],

  // client home
  actionNeeded: ["محتاج منك", "Action needed"],
  subExpiring: ["اشتراكك قرب يخلص", "Your subscription is ending soon"],
  subExpiringSub: ["فاضل {n} يوم. جدد عشان المتابعة متقفش.", "{n} days left. Renew to keep your coaching going."],
  subExpired: ["اشتراكك خلص", "Your subscription has ended"],
  subExpiredSub: ["كلم الكابتن عشان تجدد.", "Message your coach to renew."],
  pendingFormsCta: ["عندك {n} فورم مستني ردك", "You have {n} form(s) to fill"],
  unreadCta: ["عندك {n} رسالة جديدة من الكابتن", "{n} new message(s) from your coach"],
  renewWa: ["جدد على واتساب", "Renew on WhatsApp"],
  subscription: ["الاشتراك", "Subscription"],
  package: ["الباقة", "Package"],
  months: ["شهور", "months"],
  endsOn: ["بينتهي", "Ends"],
  progress: ["التقدم", "Progress"],
  measurements: ["القياسات", "Measurements"],
  weight: ["الوزن", "Weight"],
  waist: ["الوسط", "Waist"],
  readings: ["{n} قراءة", "{n} readings"],
  addReading: ["سجّل وزن النهارده", "Log today's weight"],
  all: ["الكل", "All"],
  todayWorkout: ["تمرين النهارده", "Today's workout"],
  todayMeals: ["أكل النهارده", "Today's meals"],
  eatenOf: ["{a} من {b} سعرة", "{a} of {b} kcal"],
  noPlanYet: ["الكابتن لسه بيجهز خطتك", "Your coach is preparing your plan"],
  noPlanYetSub: ["هتظهر هنا أول ما تتبعت.", "It will show up here once it's sent."],

  // nutrition
  carbs: ["كارب", "Carbs"],
  fat: ["دهون", "Fat"],
  protein: ["بروتين", "Protein"],
  meals: ["الوجبات", "Meals"],
  swapFood: ["بدّل الأكلة", "Swap food"],
  swapTitle: ["بدّل بحاجة بنفس السعرات", "Swap for the same calories"],
  undoSwap: ["رجّع الأصلي", "Restore original"],
  swappedFrom: ["بدل {x}", "instead of {x}"],
  shoppingList: ["قايمة المشتريات", "Shopping list"],
  forWeek: ["لمدة أسبوع", "For one week"],
  newFeature: ["جديد", "New"],
  swapHint: ["دوس «بدّل الأكلة» على أي صنف وهنحسبلك البديل بنفس السعرات.", "Tap “Swap food” on any item to replace it with an equivalent."],
  gotIt: ["تمام", "Got it"],

  // training
  exercises: ["التمارين", "Exercises"],
  set: ["سيت", "Set"],
  prev: ["السابق", "Prev"],
  reps: ["عدات", "Reps"],
  tempo: ["تيمبو", "Tempo"],
  rir: ["RIR", "RIR"],
  startDay: ["ابدأ اليوم ده", "Start this day"],
  finishDay: ["خلّصت التمرين", "Finish workout"],
  workoutSaved: ["عاش! التمرين اتسجل", "Nice! Workout saved"],
  noVideo: ["الفيديو لسه منزلش", "Video coming soon"],
  history: ["السجل", "History"],
  noHistory: ["لسه مفيش تمارين متسجلة", "No workouts logged yet"],
  wt: ["وزن", "Wt"],
  watchVideo: ["شوف الفيديو", "Watch video"],
  exitWorkout: ["خروج", "Exit"],

  // forms
  pending: ["مستني ردك", "Pending"],
  submitted: ["اتبعت", "Submitted"],
  noPending: ["مفيش فورمز مستنية", "No pending forms"],
  noPendingSub: ["الكابتن هيبعتلك فورمز تملاها هنا.", "Your coach will send forms for you to fill out."],
  noSubmitted: ["لسه مبعتش فورمز", "No submitted forms yet"],
  sentOn: ["اتبعت {d}", "Sent {d}"],
  submittedOn: ["اترد عليه {d}", "Submitted {d}"],
  submit: ["ابعت", "Submit"],
  required: ["جاوب على كل الأسئلة", "Please answer every question"],

  // messages
  yourCoach: ["الكابتن", "Your coach"],
  chatWithCoach: ["كلم الكابتن", "Chat with your coach"],
  noMessages: ["لسه مفيش رسائل", "No messages yet"],
  noMessagesSub: ["ابعت رسالة للكوتش من تحت.", "Send a message to your coach below."],
  typeMessage: ["اكتب رسالة…", "Type a message…"],
  send: ["ابعت", "Send"],

  // coach shell
  dashboard: ["لوحة التحكم", "Dashboard"],
  clients: ["المشتركين", "Clients"],
  library: ["مكتبة الفيديوهات", "Video library"],
  libraryShort: ["الفيديوهات", "Videos"],
  plans: ["الخطط", "Plans"],
  coachPanel: ["لوحة الكابتن", "Coach panel"],

  // coach dashboard
  activeClients: ["مشتركين فعالين", "Active clients"],
  expiringSoon: ["اشتراكات قربت تخلص", "Ending within 7 days"],
  unreadMessages: ["رسائل مش مقروءة", "Unread messages"],
  formsToReview: ["فورمز جديدة", "New form replies"],
  needsAttention: ["محتاجين متابعة", "Needs attention"],
  allGood: ["كله تمام، مفيش حاجة مستنياك.", "All caught up."],
  recentActivity: ["آخر نشاط", "Recent activity"],
  loggedWorkout: ["سجّل تمرين {x}", "logged {x}"],
  noPlanAssigned: ["من غير خطة", "No plan assigned"],

  // coach clients
  addClient: ["إضافة مشترك", "Add client"],
  addClientNote: ["المشترك بيتضاف بعد ما يدفع. هيدخل برقم موبايله.", "Clients are added after payment and sign in with their phone."],
  name: ["الاسم", "Name"],
  phone: ["الموبايل", "Phone"],
  goal: ["الهدف", "Goal"],
  start: ["البداية", "Start"],
  end: ["النهاية", "End"],
  trainingPlan: ["خطة التمرين", "Training plan"],
  nutritionPlan: ["خطة الأكل", "Nutrition plan"],
  extend: ["مد الاشتراك", "Extend"],
  oneMonth: ["+ شهر", "+1 month"],
  daysLeftN: ["فاضل {n} يوم", "{n} days left"],
  expiredN: ["خلص من {n} يوم", "Ended {n} days ago"],
  sendForm: ["ابعت فورم", "Send form"],
  formSent: ["الفورم اتبعت", "Form sent"],
  openChat: ["افتح الشات", "Open chat"],
  answers: ["الإجابات", "Answers"],
  workouts: ["التمارين المتسجلة", "Logged workouts"],
  searchClients: ["دوّر على مشترك", "Search clients"],
  active: ["فعال", "Active"],
  inactive: ["موقوف", "Paused"],

  // coach library
  uploadVideo: ["ارفع فيديو", "Upload video"],
  newExercise: ["تمرين جديد", "New exercise"],
  exerciseName: ["اسم التمرين", "Exercise name"],
  muscle: ["العضلة", "Muscle"],
  cue: ["ملاحظة الأداء", "Coaching cue"],
  videoFile: ["ملف الفيديو", "Video file"],
  orLink: ["أو لينك (يوتيوب أو غيره)", "or a link (YouTube etc.)"],
  replaceVideo: ["غيّر الفيديو", "Replace video"],
  removeVideo: ["شيل الفيديو", "Remove video"],
  hasVideo: ["فيه فيديو", "Has video"],
  noVideoShort: ["من غير فيديو", "No video"],
  uploading: ["بيترفع…", "Uploading…"],
  usedIn: ["مستخدم في {n} خطة", "Used in {n} plan(s)"],

  // coach plans
  trainingPlans: ["خطط التمرين", "Training plans"],
  nutritionPlans: ["خطط الأكل", "Nutrition plans"],
  formTemplates: ["الفورمز", "Forms"],
  newPlan: ["خطة جديدة", "New plan"],
  newForm: ["فورم جديد", "New form"],
  planName: ["اسم الخطة", "Plan name"],
  addDay: ["ضيف يوم", "Add day"],
  dayName: ["اسم اليوم", "Day name"],
  addExercise: ["ضيف تمرين", "Add exercise"],
  addSet: ["ضيف سيت", "Add set"],
  note: ["ملاحظة", "Note"],
  addMeal: ["ضيف وجبة", "Add meal"],
  mealName: ["اسم الوجبة", "Meal name"],
  addFood: ["ضيف صنف", "Add food"],
  qty: ["الكمية", "Qty"],
  assignedTo: ["متخصصة لـ {n} مشترك", "Assigned to {n}"],
  duplicate: ["نسخة", "Duplicate"],
  formTitle: ["عنوان الفورم", "Form title"],
  addQuestion: ["ضيف سؤال", "Add question"],
  question: ["السؤال", "Question"],
  qText: ["كتابة", "Text"],
  qNumber: ["رقم", "Number"],
  qChoice: ["اختيارات", "Choice"],
  qScale: ["من 1 لـ 10", "1 to 10"],
  optionsComma: ["الاختيارات (افصل بفاصلة)", "Options (comma separated)"],
  pickExercise: ["اختار تمرين", "Pick an exercise"],
  pickFood: ["اختار صنف", "Pick a food"],
  days_: ["الأيام", "Days"],
  confirmDelete: ["متأكد إنك عايز تحذف؟", "Delete this?"],

  // auth
  password: ["كلمة السر", "Password"],
  signIn: ["دخول", "Sign in"],
  wrongLogin: ["رقم الموبايل أو كلمة السر غلط", "Wrong phone or password"],
  accountPaused: ["حسابك موقوف، كلم الكابتن", "Your account is paused, message your coach"],
  coachPassword: ["كلمة سر الكابتن", "Coach password"],
  demoAccounts: ["حسابات التجربة", "Demo accounts"],
  credsTitle: ["بيانات دخول المشترك", "Client login details"],
  credsNote: ["ابعتهم للمشترك. كلمة السر مش هتظهر تاني، ولو نسيها اعمل واحدة جديدة.", "Send these to the client. The password won't be shown again; reset it if they forget."],
  sendWa: ["ابعت على واتساب", "Send on WhatsApp"],
  copy: ["نسخ", "Copy"],
  copied: ["اتنسخ", "Copied"],
  resetPassword: ["كلمة سر جديدة", "New password"],
  changePassword: ["غيّر كلمة السر", "Change password"],
  newPassword: ["كلمة السر الجديدة", "New password"],
  minChars: ["6 حروف على الأقل", "At least 6 characters"],
  waCreds: ["أهلاً {name}، ده حسابك على منصة كوتش جونيور:\nالرابط: {url}\nالموبايل: {phone}\nكلمة السر: {pw}", "Hi {name}, here is your Coach Junior account:\nLink: {url}\nPhone: {phone}\nPassword: {pw}"],
  dropVideos: ["اسحب الفيديوهات هنا أو دوس واختار (ينفع كذا فيديو مرة واحدة)", "Drop videos here or tap to choose (several at once)"],
  bulkDone: ["اترفع {n} فيديو. عدّل الاسم والعضلة لو محتاج.", "{n} videos uploaded. Edit names and muscles if needed."],
  // signup / activation
  signUp: ["حساب جديد", "Sign up"],
  noAccount: ["أول مرة؟ اعمل حساب", "New here? Create an account"],
  haveAccount: ["عندك حساب؟ ادخل", "Have an account? Sign in"],
  confirmPassword: ["أكد كلمة السر", "Confirm password"],
  pwMismatch: ["كلمتين السر مش زي بعض", "Passwords don't match"],
  phoneUsed: ["الرقم ده عنده حساب بالفعل", "This phone already has an account"],
  createAccount: ["اعمل الحساب", "Create account"],
  pendingTitle: ["طلبك وصل للكابتن", "Your request reached the coach"],
  pendingSub: ["أول ما الكابتن يفعّل حسابك هتلاقي خطتك وتمارينك وأكلك هنا. لو دفعت ابعتله على واتساب.", "Once the coach activates your account you'll see your plan here. If you've paid, message him on WhatsApp."],
  pausedTitle: ["حسابك موقوف", "Your account is paused"],
  pausedSub: ["كلم الكابتن عشان يفعّله تاني.", "Message the coach to reactivate it."],
  msgCoachWa: ["كلم الكابتن على واتساب", "Message the coach on WhatsApp"],
  requests: ["طلبات جديدة", "New sign-ups"],
  activate: ["فعّل", "Activate"],
  reject: ["رفض", "Reject"],
  activateTitle: ["تفعيل {name}", "Activate {name}"],
  activated: ["الحساب اتفعل", "Account activated"],
  signedUp: ["سجّل {d}", "Signed up {d}"],
  pause: ["إيقاف", "Pause"],
  resume: ["تفعيل", "Activate"],
  paused: ["موقوف", "Paused"],
  welcome: ["أهلاً {name} 👋", "Welcome {name} 👋"],
  preparingTitle: ["الكابتن بيجهزلك خطتك", "Your coach is preparing your plan"],
  preparingSub: ["املأ استمارة البداية عشان الكابتن يعرف مستواك وهدفك، وتقدر تكلمه من الرسائل. أول ما يفعّل اشتراكك هتلاقي التمرين والأكل هنا.", "Fill in the starting form so the coach knows your level and goal, and chat with him in Messages. Once he activates your subscription your training and meals appear here."],
  fillStartForm: ["املأ استمارة البداية", "Fill the starting form"],
  starterForm: ["تتبعت لكل مشترك جديد تلقائي", "Sent to every new sign-up automatically"],
  // coach messages
  conversations: ["المحادثات", "Conversations"],
  noConversations: ["مفيش محادثات لسه", "No conversations yet"],
} as const;

export type Key = keyof typeof dict;

const muscles: Record<string, [string, string]> = {
  chest: ["صدر", "Chest"], back: ["ضهر", "Back"], shoulders: ["أكتاف", "Shoulders"], biceps: ["باي", "Biceps"],
  triceps: ["تراي", "Triceps"], legs: ["رجل", "Legs"], glutes: ["جلوتس", "Glutes"], abs: ["بطن", "Abs"],
  forearms: ["سواعد", "Forearms"], calves: ["سمانة", "Calves"], cardio: ["كارديو", "Cardio"],
};

type Ctx = { lang: Lang; dir: "rtl" | "ltr"; toggle: () => void; t: (k: Key, vars?: Record<string, string | number>) => string; muscle: (m: string) => string };
const I18nCtx = createContext<Ctx | null>(null);
const LANG_KEY = "cj-lang";

export function I18nProvider({ children }: { children: ReactNode }) {
  const [lang, setLang] = useState<Lang>("ar");

  useEffect(() => {
    try {
      const l = localStorage.getItem(LANG_KEY);
      if (l === "en" || l === "ar") setLang(l);
    } catch {}
  }, []);

  useEffect(() => {
    document.documentElement.lang = lang;
    document.documentElement.dir = lang === "ar" ? "rtl" : "ltr";
  }, [lang]);

  const toggle = useCallback(() => {
    setLang((l) => {
      const n = l === "ar" ? "en" : "ar";
      try { localStorage.setItem(LANG_KEY, n); } catch {}
      return n;
    });
  }, []);

  const t = useCallback(
    (k: Key, vars?: Record<string, string | number>) => {
      let s: string = dict[k][lang === "ar" ? 0 : 1];
      if (vars) for (const [v, val] of Object.entries(vars)) s = s.replace(`{${v}}`, String(val));
      return s;
    },
    [lang],
  );
  const muscle = useCallback((m: string) => (muscles[m] ?? [m, m])[lang === "ar" ? 0 : 1], [lang]);

  return <I18nCtx.Provider value={{ lang, dir: lang === "ar" ? "rtl" : "ltr", toggle, t, muscle }}>{children}</I18nCtx.Provider>;
}

export function useI18n() {
  const ctx = useContext(I18nCtx);
  if (!ctx) throw new Error("useI18n outside I18nProvider");
  return ctx;
}

export const MUSCLES = Object.keys(muscles);
