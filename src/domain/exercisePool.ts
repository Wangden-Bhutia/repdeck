import type { Exercise } from "./workoutGenerator";

export const EXERCISE_POOL: Exercise[] = [
  // --- PUSH ---
  {
    id: "pushups",
    name: "Push-Ups",
    category: "push",
    intensity: "medium",
    image: "/assets/exercises/pushups.png",
    requiresFloor: true,
    isNoisy: false,
    requiresJump: false
  },
  {
    id: "incline_pushups",
    name: "Incline Push-Ups",
    category: "push",
    intensity: "low",
    image: "/assets/exercises/incline_pushups.png",
    requiresFloor: false,
    isNoisy: false,
    requiresJump: false
  },
  {
    id: "wall_pushups",
    name: "Wall Push-Ups",
    category: "push",
    intensity: "low",
    image: "/assets/exercises/wall_pushups.png",
    requiresFloor: false,
    isNoisy: false,
    requiresJump: false
  },
  {
    id: "pike_pushups",
    name: "Pike Push-Ups",
    category: "push",
    intensity: "high",
    image: "/assets/exercises/pike_pushups.png",
    requiresFloor: true,
    isNoisy: false,
    requiresJump: false
  },

  // --- PUSH (HARD) ---
  {
    id: "decline_pushups",
    name: "Decline Push-Ups",
    category: "push",
    intensity: "high",
    requiresFloor: true,
    isNoisy: false,
    requiresJump: false,
    isHard: true
  },
  {
    id: "chair_dips",
    name: "Chair Dips",
    category: "push",
    intensity: "high",
    requiresFloor: false,
    isNoisy: false,
    requiresJump: false,
    isHard: true
  },
  {
    id: "diamond_pushups",
    name: "Diamond PushUps",
    category: "push",
    intensity: "high",
    requiresFloor: true,
    isNoisy: false,
    requiresJump: false,
    isHard: true
  },

  // --- LEGS ---
  {
    id: "squats",
    name: "Squats",
    category: "legs",
    intensity: "medium",
    image: "/assets/exercises/squats.png",
    requiresFloor: false,
    isNoisy: false,
    requiresJump: false
  },
  {
    id: "reverse_lunge",
    name: "Reverse Lunges",
    category: "legs",
    intensity: "medium",
    image: "/assets/exercises/reverse_lunges.png",
    requiresFloor: false,
    isNoisy: false,
    requiresJump: false
  },
  {
    id: "wall_sit",
    name: "Wall Sit",
    category: "legs",
    intensity: "low",
    image: "/assets/exercises/wall_sit.png",
    requiresFloor: false,
    isNoisy: false,
    requiresJump: false,
    timeBased: true
  },
  {
    id: "chair_squats",
    name: "Chair Squats",
    category: "legs",
    intensity: "low",
    requiresFloor: false,
    isNoisy: false,
    requiresJump: false
  },

  // --- LEGS (HARD) ---
  {
    id: "bulgarian_split_squat",
    name: "Bulgarian Split Squats",
    category: "legs",
    intensity: "high",
    requiresFloor: false,
    isNoisy: false,
    requiresJump: false,
    isHard: true
  },

  // --- CORE ---
  {
    id: "plank",
    name: "Plank",
    category: "core",
    intensity: "low",
    image: "/assets/exercises/plank.png",
    requiresFloor: true,
    isNoisy: false,
    requiresJump: false,
    timeBased: true
  },
  {
    id: "dead_bug",
    name: "Dead Bug",
    category: "core",
    intensity: "low",
    image: "/assets/exercises/dead_bug.png",
    requiresFloor: true,
    isNoisy: false,
    requiresJump: false
  },
  {
    id: "standing_knee_raise",
    name: "Standing Knee Raises",
    category: "core",
    intensity: "low",
    image: "/assets/exercises/standing_knee_raises.png",
    requiresFloor: false,
    isNoisy: false,
    requiresJump: false
  },

  // --- CONDITIONING ---
  {
    id: "jumping_jacks",
    name: "Jumping Jacks",
    category: "conditioning",
    intensity: "high",
    image: "/assets/exercises/jumping_jacks.png",
    requiresFloor: false,
    isNoisy: true,
    requiresJump: true
  },
  {
    id: "low_impact_high_knees",
    name: "Low-Impact High Knees",
    category: "conditioning",
    intensity: "medium",
    image: "/assets/exercises/low_impact_high_knees.png",
    requiresFloor: false,
    isNoisy: true,
    requiresJump: false
  },
  {
    id: "shadow_boxing",
    name: "Shadow Boxing",
    category: "conditioning",
    intensity: "medium",
    image: "/assets/exercises/shadow_boxing.png",
    requiresFloor: false,
    isNoisy: true,
    requiresJump: false
  },
  {
    id: "step_back_burpee",
    name: "Step-Back Burpees",
    category: "conditioning",
    intensity: "high",
    image: "/assets/exercises/step_back_burpees.png",
    requiresFloor: false,
    isNoisy: true,
    requiresJump: true
  },
  {
    id: "step_touch_flow",
    name: "Step Touch Flow",
    category: "conditioning",
    intensity: "low",
    requiresFloor: false,
    isNoisy: false,
    requiresJump: false
  },

  // --- CONDITIONING (HARD) ---
  {
    id: "full_burpees",
    name: "Full Burpees",
    category: "conditioning",
    intensity: "high",
    requiresFloor: false,
    isNoisy: true,
    requiresJump: true,
    isHard: true
  },

  // --- PULL ---
  {
    id: "superman_hold",
    name: "Superman Hold",
    category: "pull",
    intensity: "low",
    image: "/assets/exercises/superman_hold.png",
    requiresFloor: true,
    isNoisy: false,
    requiresJump: false,
    timeBased: true
  },
  {
    id: "row_hold",
    name: "Row Hold",
    category: "pull",
    intensity: "medium",
    image: "/assets/exercises/row_hold.png",
    requiresFloor: false,
    isNoisy: false,
    requiresJump: false,
    timeBased: true
  },
  {
    id: "wall_posture_slide",
    name: "Wall Posture Slide",
    category: "pull",
    intensity: "low",
    requiresFloor: false,
    isNoisy: false,
    requiresJump: false
  },
];

// Preload all exercise images for instant UI response
EXERCISE_POOL.forEach((ex) => {
  if (ex.image) {
    const img = new Image();
    img.src = ex.image;
  }
});

// --- REP DENSITY / INTENSITY SCALING SYSTEM ---

export type WorkoutMode = 'quick_reset' | 'standard_flow' | 'deep_work';

const BASE_REP_RANGES: Record<string, [number, number]> = {
  low: [8, 12],
  medium: [10, 18],
  high: [15, 25],
};

const MODE_MULTIPLIER: Record<WorkoutMode, number> = {
  quick_reset: 0.8,
  standard_flow: 1,
  deep_work: 1.25,
};

export function getRepRangeForExercise(
  exercise: { intensity: 'low' | 'medium' | 'high' },
  mode: WorkoutMode
): [number, number] {
  const intensity = exercise?.intensity || 'medium';
  const base = BASE_REP_RANGES[intensity] || [10, 15];
  const multiplier = MODE_MULTIPLIER[mode] || 1;
  return [
    Math.round(base[0] * multiplier),
    Math.round(base[1] * multiplier)
  ];
}

// runtime shim for ESM compatibility
export const WorkoutMode = {
  QUICK_RESET: 'quick_reset',
  STANDARD_FLOW: 'standard_flow',
  DEEP_WORK: 'deep_work'
} as const;
