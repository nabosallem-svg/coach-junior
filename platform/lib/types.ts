// Data model shared by the demo store and, later, Supabase (see supabase/schema.sql).

export type ID = string;

export type Client = {
  id: ID;
  name: string;
  phone: string;
  /** demo only: with Supabase the password lives in Supabase Auth (hashed), never in this table */
  password: string;
  goal: string;
  /** package label, e.g. "3+1 months" */
  packageName: string;
  subStart: string; // ISO date
  subEnd: string; // ISO date
  trainingPlanId?: ID;
  nutritionPlanId?: ID;
  active: boolean;
  /** signed up by themselves and waiting for the coach to activate them */
  pending?: boolean;
  signedUpAt?: string;
};

export type Measurement = { id: ID; clientId: ID; date: string; weight: number; waist?: number };

export type Muscle =
  | "chest" | "back" | "shoulders" | "biceps" | "triceps" | "legs" | "glutes" | "abs" | "forearms" | "calves" | "cardio";

export type Exercise = {
  id: ID;
  name: string;
  muscle: Muscle;
  /** coach's cue shown under the title */
  cue?: string;
  /** key of an uploaded file in the media store (demo: IndexedDB, live: Supabase Storage path) */
  videoKey?: string;
  /** external link, e.g. YouTube / Bunny */
  videoUrl?: string;
};

export type SetSpec = { reps: string; rir?: string };
/** rest = seconds between sets */
export type PlanExercise = { id: ID; exerciseId: ID; note?: string; rest?: string; sets: SetSpec[] };
export type TrainingDay = { id: ID; name: string; exercises: PlanExercise[] };
/** ownerId set = a personal copy for one client; unset = a reusable template */
export type TrainingPlan = { id: ID; name: string; days: TrainingDay[]; ownerId?: ID };

export type LoggedSet = { weight: string; reps: string; done: boolean };
export type WorkoutLog = {
  id: ID;
  clientId: ID;
  planId: ID;
  dayId: ID;
  date: string;
  /** keyed by PlanExercise.id */
  sets: Record<ID, LoggedSet[]>;
};

export type FoodGroup = "protein" | "carb" | "fat" | "veg" | "fruit" | "dairy" | "supplement";
export type Food = {
  id: ID;
  nameAr: string;
  nameEn: string;
  group: FoodGroup;
  /** unit label and the amount the macros below refer to, e.g. 100 g or 1 piece */
  unit: "g" | "piece" | "ml" | "scoop";
  per: number;
  kcal: number;
  c: number;
  f: number;
  p: number;
};
export type MealItem = { id: ID; foodId: ID; qty: number };
export type Meal = { id: ID; name: string; note?: string; items: MealItem[] };
export type NutritionPlan = { id: ID; name: string; meals: Meal[]; ownerId?: ID };

/** per-client food swaps: MealItem.id -> replacement */
export type Swap = { clientId: ID; itemId: ID; foodId: ID; qty: number };

export type QuestionType = "text" | "number" | "choice" | "scale";
export type Question = { id: ID; type: QuestionType; label: string; options?: string[] };
/** starter forms are sent automatically to every new sign-up */
export type FormTemplate = { id: ID; title: string; questions: Question[]; starter?: boolean };
export type FormAssignment = {
  id: ID;
  formId: ID;
  clientId: ID;
  sentAt: string;
  status: "pending" | "submitted";
  answers?: Record<ID, string>;
  submittedAt?: string;
  /** coach opened the submitted answers */
  reviewed?: boolean;
};

export type Message = { id: ID; clientId: ID; from: "coach" | "client"; text: string; at: string; read: boolean };

/** progress photo the trainee uploads; image blob stored under `key` */
export type ProgressPhoto = { id: ID; clientId: ID; date: string; pose: "front" | "side" | "back"; key: string };

export type DB = {
  clients: Client[];
  photos?: ProgressPhoto[];
  measurements: Measurement[];
  exercises: Exercise[];
  trainingPlans: TrainingPlan[];
  logs: WorkoutLog[];
  foods: Food[];
  nutritionPlans: NutritionPlan[];
  swaps: Swap[];
  forms: FormTemplate[];
  assignments: FormAssignment[];
  messages: Message[];
  /** meal items the client ticked today: `${date}:${itemId}` */
  eaten: string[];
};
