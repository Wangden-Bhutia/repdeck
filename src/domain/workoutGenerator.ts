// --- Types ---

export type ExerciseCategory =
  | "push"
  | "pull"
  | "legs"
  | "core"
  | "conditioning";

export type IntensityLevel = "low" | "medium" | "high";

export type JointStress = {
  knee?: boolean;
  shoulder?: boolean;
};

export interface Exercise {
  id: string;
  name: string;
  image?: string;

  category: ExerciseCategory;
  intensity: IntensityLevel;

  requiresFloor: boolean;
  isNoisy: boolean;
  timeBased?: boolean; // holds, wall sits, planks (time instead of reps)

  jointStress: JointStress;

  requiresJump?: boolean;
  isHard?: boolean;
}

export interface ConstraintProfile {
  noFloor?: boolean;
  lowNoise?: boolean;
  noJump?: boolean;
  avoidKnee?: boolean;
  avoidShoulder?: boolean;
}

export interface WorkoutSession {
  exercises: {
    exercise: Exercise;
    reps?: number;
    duration?: number; // seconds for time-based exercises
  }[];
  rounds: number;
}

export interface GenerationPreferences {
  difficultyBias?: number;
  recentExerciseIds?: string[];
  exerciseFatigue?: Record<string, number>;
}

// --- Imports ---

import { EXERCISE_POOL } from "./exercisePool";
import { getRepRangeForExercise } from "./exercisePool";

// --- Constraint Filter ---

const applyConstraints = (
  pool: Exercise[],
  constraints: ConstraintProfile
) => {
  return pool.filter((e: any) => {
    if (constraints.noFloor && e.requiresFloor) return false;
    if (constraints.lowNoise && e.isNoisy) return false;
    if (constraints.noJump && e.requiresJump) return false;
    if (constraints.avoidKnee && e.jointStress?.knee) return false;
    if (constraints.avoidShoulder && e.jointStress?.shoulder) return false;
    return true;
  });
};

// --- Generator ---

const shuffle = <T>(arr: T[]) => [...arr].sort(() => Math.random() - 0.5);

const clamp = (value: number, min: number, max: number) =>
  Math.min(max, Math.max(min, value));

const TRANSITION_SECONDS = 15;

const REP_SECONDS_BY_CATEGORY: Record<ExerciseCategory, number> = {
  push: 4.5,
  pull: 4.5,
  legs: 4,
  core: 4,
  conditioning: 3.5,
};

const SLOT_COUNT: Record<15 | 25 | 40, number> = {
  15: 14,
  25: 20,
  40: 32,
};

const TARGET_SLOT_SECONDS = 45;

const getBaseTimeDuration = (
  exercise: Exercise,
  difficultyBias: number
) => {
  let duration = TARGET_SLOT_SECONDS;

  if (exercise.intensity === "low") duration += 5;
  if (exercise.intensity === "high") duration -= 5;

  duration += difficultyBias * 4;

  return clamp(duration, 20, 60);
};

const getBaseReps = (exercise: Exercise, difficultyBias: number) => {
  const secondsPerRep = REP_SECONDS_BY_CATEGORY[exercise.category];

  // target effort ~45 sec per slot
  const targetReps = Math.round(TARGET_SLOT_SECONDS / secondsPerRep);

  let adjusted = targetReps;

  if (exercise.intensity === "low") adjusted += 2;
  if (exercise.intensity === "high") adjusted -= 2;

  adjusted += difficultyBias * 2;

  return clamp(adjusted, 8, 30);
};

const getTimeBasedDuration = (
  exercise: Exercise,
  difficultyBias: number,
  index: number,
  total: number
) => {
  const base = getBaseTimeDuration(exercise, difficultyBias);

  // simple wave: middle harder, ends easier
  const wave = Math.sin((index / total) * Math.PI); // 0 → 1 → 0
  const adjustment = Math.round(wave * 8); // max +8 sec

  return clamp(base + adjustment - 4, 20, 60);
};

const getRepCount = (
  exercise: Exercise,
  difficultyBias: number,
  index: number,
  total: number
) => {
  const base = getBaseReps(exercise, difficultyBias);

  const wave = Math.sin((index / total) * Math.PI);
  const adjustment = Math.round(wave * 4); // max +4 reps

  return clamp(base + adjustment - 2, 8, 30);
};

const pickExercise = (
  pool: Exercise[],
  fatigue: Record<string, number>,
  recent: Set<string>,
  selected: Set<string>
): Exercise | null => {
  if (!pool.length) return null;

  const filteredPool = pool.filter((e) => !selected.has(e.id));

  const basePool = filteredPool.length ? filteredPool : pool;

  const scored = basePool
    .map((e) => {
      const f = fatigue[e.id] || 0;
      const recentPenalty = recent.has(e.id) ? 2 : 0;
      const score = f + recentPenalty + Math.random();
      return { e, score };
    })
    .sort((a, b) => a.score - b.score);

  return scored[0]?.e || null;
};

// --- Main Session Generator ---

export function generateWorkoutSession(
  duration: 15 | 25 | 40,
  constraints: ConstraintProfile = {},
  preferences: GenerationPreferences = {}
): WorkoutSession {
  const filtered = applyConstraints(EXERCISE_POOL, constraints);
  let feedbackAdjustment = 0;

if ((preferences as any).feedback === "easy") feedbackAdjustment = 1;
if ((preferences as any).feedback === "hard") feedbackAdjustment = -1;

const difficultyBias = clamp(
  (preferences.difficultyBias || 0) + feedbackAdjustment,
  -3,
  3
);
  const recentExerciseIds = new Set(preferences.recentExerciseIds || []);
  const exerciseFatigue = preferences.exerciseFatigue || {};

  const usablePool = filtered.length ? filtered : EXERCISE_POOL;

  if (!usablePool.length) {
    return { exercises: [], rounds: 1 };
  }

  const byCategory = {
    push: usablePool.filter((e) => e.category === "push"),
    pull: usablePool.filter((e) => e.category === "pull"),
    legs: usablePool.filter((e) => e.category === "legs"),
    core: usablePool.filter((e) => e.category === "core"),
    conditioning: usablePool.filter((e) => e.category === "conditioning"),
  };

  // normalize duration to supported values
  const normalizedDuration: 15 | 25 | 40 =
    duration <= 15 ? 15 : duration <= 25 ? 25 : 40;

  const slots = SLOT_COUNT[normalizedDuration];
  const rounds = 1;

  // build balanced category pool
  const categories: ExerciseCategory[] = [
    "push",
    "pull",
    "legs",
    "core",
    "conditioning",
  ];

  const perCategory = Math.floor(slots / categories.length);
  const remainder = slots % categories.length;

  const categoryPool: ExerciseCategory[] = [];

  categories.forEach((cat) => {
    for (let i = 0; i < perCategory; i++) categoryPool.push(cat);
  });

  for (let i = 0; i < remainder; i++) {
    categoryPool.push(categories[i % categories.length]);
  }

  const shuffledCategories = shuffle(categoryPool);

  const sequence: Exercise[] = [];
  let hardUsed = 0;

  const selectedIds = new Set<string>();

  let i = 0;

  let lastCategory: ExerciseCategory | null = null;

  while (sequence.length < slots) {
    let category = shuffledCategories[sequence.length];

    // avoid repeating same category consecutively
    if (lastCategory && category === lastCategory) {
      const alt = categories.find((c) => c !== lastCategory && byCategory[c].length);
      if (alt) category = alt;
    }

    const pool = byCategory[category];

    if (pool.length) {
      // Split base vs hard
      const basePool = pool.filter((e) => !e.isHard);
      const hardPool = pool.filter((e) => e.isHard);

      // --- Round-based hard logic (use actual round) ---
      const currentRound = (constraints as any).currentRound || 1;

      let hardLimit = 0;
      if (currentRound === 2) hardLimit = 1;
      else if (currentRound >= 3) hardLimit = 2;

      let candidatePool: Exercise[] = basePool;

      if (hardLimit > 0 && hardUsed < hardLimit && hardPool.length > 0) {
        const remainingSlots = slots - sequence.length;
        const remainingHard = hardLimit - hardUsed;

        const forceHard = remainingSlots <= remainingHard;
        const useHard = forceHard || Math.random() < 0.3;

        if (useHard) {
          candidatePool = hardPool;
          hardUsed++;
        }
      }

      const choice = pickExercise(
        candidatePool.length ? candidatePool : pool,
        exerciseFatigue,
        recentExerciseIds,
        selectedIds
      );

      if (choice) {
        sequence.push(choice);
        selectedIds.add(choice.id);
        lastCategory = category;
      }
    }

    i++;

    if (i > slots * 10) {
      // fallback: fill remaining slots with UNIQUE exercises only
      const remaining = slots - sequence.length;
      const fallbackPool = usablePool;

      for (let j = 0; j < remaining; j++) {
        const fallback = fallbackPool.find(e => !selectedIds.has(e.id));
        if (fallback) {
          sequence.push(fallback);
          selectedIds.add(fallback.id);
        } else {
          break; // no more unique exercises available
        }
      }
      break;
    }
  }

  const finalSequence: Exercise[] = shuffle(sequence);

  return {
    exercises: finalSequence.map((exercise, index) => {
      if (exercise.timeBased) {
        let duration = getTimeBasedDuration(
          exercise,
          difficultyBias,
          index,
          finalSequence.length
        );

        if (exercise.isHard) {
          duration = Math.round(duration * 1.2);
        }

        duration = clamp(duration, 20, 60);

        return {
          exercise,
          duration,
          reps: undefined,
        };
      }

      let reps = getRepCount(
        exercise,
        difficultyBias,
        index,
        finalSequence.length
      );

      if (exercise.isHard) {
        reps = Math.round(reps * 1.25);
      }

      reps = clamp(reps, 8, 40);

      return {
        exercise,
        reps,
        duration: undefined,
      };
    }),
    rounds,
  };
}
