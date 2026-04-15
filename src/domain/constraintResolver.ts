import type { Exercise } from "./workoutGenerator";

// --- Constraint Profile ---

export interface ConstraintProfile {
  noFloor?: boolean;
  lowNoise?: boolean;

  avoidKnee?: boolean;
  avoidShoulder?: boolean;
}

// --- Resolver Function ---

export function applyConstraints(
  exercises: Exercise[],
  constraints: ConstraintProfile
): Exercise[] {
  return exercises.filter((exercise) => {
    // Floor constraint
    if (constraints.noFloor && exercise.requiresFloor) {
      return false;
    }

    // Noise constraint
    if (constraints.lowNoise && exercise.isNoisy) {
      return false;
    }

    // Knee constraint
    if (constraints.avoidKnee && exercise.jointStress.knee) {
      return false;
    }

    // Shoulder constraint
    if (constraints.avoidShoulder && exercise.jointStress.shoulder) {
      return false;
    }

    return true;
  });
}