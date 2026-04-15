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

  category: ExerciseCategory;
  intensity: IntensityLevel;

  requiresFloor: boolean;
  isNoisy: boolean;

  jointStress: JointStress;
}

export interface ConstraintProfile {
  noFloor?: boolean;
  lowNoise?: boolean;
}

export interface WorkoutSession {
  exercises: {
    exercise: Exercise;
    workSeconds: number;
  }[];
  rounds: number;
}

// --- Imports ---

import { EXERCISE_POOL } from "./exercisePool";

// --- Constraint Filter ---

const applyConstraints = (
  pool: Exercise[],
  constraints: ConstraintProfile
) => {
  return pool.filter((e) => {
    if (constraints.noFloor && e.requiresFloor) return false;
    if (constraints.lowNoise && e.isNoisy) return false;
    return true;
  });
};

// --- Generator ---

const pick = (arr: Exercise[]) =>
  arr[Math.floor(Math.random() * arr.length)];

const shuffle = <T>(arr: T[]) => [...arr].sort(() => Math.random() - 0.5);

// --- Main Session Generator ---

export function generateWorkoutSession(
  duration: 15 | 25 | 40,
  constraints: ConstraintProfile = {}
): WorkoutSession {
  const filtered = applyConstraints(EXERCISE_POOL, constraints);

  const byCategory = {
    push: filtered.filter((e) => e.category === "push"),
    pull: filtered.filter((e) => e.category === "pull"),
    legs: filtered.filter((e) => e.category === "legs"),
    core: filtered.filter((e) => e.category === "core"),
    conditioning: filtered.filter((e) => e.category === "conditioning"),
  };

  const base: Exercise[] = [];

  if (byCategory.push.length) base.push(pick(byCategory.push));
  if (byCategory.legs.length) base.push(pick(byCategory.legs));
  if (byCategory.core.length) base.push(pick(byCategory.core));
  if (byCategory.conditioning.length)
    base.push(pick(byCategory.conditioning));
  if (byCategory.pull.length) base.push(pick(byCategory.pull));

  // rounds not needed anymore (we control duration via sequence length)
  const rounds = 1;

  // target total seconds
  const targetSeconds = duration * 60;

  const expanded: Exercise[] = [];
  let accumulatedSeconds = 0;

  while (accumulatedSeconds < targetSeconds) {
    const cycle = shuffle(base);

    for (const exercise of cycle) {
      expanded.push(exercise);

      let workSeconds = 30;
      if (exercise.intensity === "low") workSeconds = 40;
      if (exercise.intensity === "high") workSeconds = 20;

      accumulatedSeconds += workSeconds;

      if (accumulatedSeconds >= targetSeconds) break;
    }
  }

  return {
    exercises: expanded.map((exercise) => {
      let workSeconds = 30;
      if (exercise.intensity === "low") workSeconds = 40;
      if (exercise.intensity === "high") workSeconds = 20;

      return {
        exercise,
        workSeconds,
      };
    }),
    rounds,
  };
}