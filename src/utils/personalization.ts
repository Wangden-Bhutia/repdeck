import type { WorkoutMode } from "../domain/exercisePool";
import type {
  ConstraintProfile,
  WorkoutSession,
} from "../domain/workoutGenerator";

export type FeedbackRating = "easy" | "good" | "hard";
export type WorkoutStyleProfile = "anywhere" | "quiet" | "joint_friendly";

export type StoredConstraintPreferences = Required<
  Pick<
    ConstraintProfile,
    "noFloor" | "lowNoise" | "avoidKnee" | "avoidShoulder"
  >
>;

export interface WorkoutHistoryEntry {
  completedAt: string;
  duration: 15 | 25 | 40;
  style: WorkoutStyleProfile;
  mode: WorkoutMode;
  constraints: StoredConstraintPreferences;
  feedback: FeedbackRating;
  exerciseIds: string[];
}

export interface PersonalizationProfile {
  constraints: StoredConstraintPreferences;
  difficultyBias: number;
  completedSessions: number;
  lastFeedback: FeedbackRating | null;
}

export interface PersonalizationState {
  profile: PersonalizationProfile;
  history: WorkoutHistoryEntry[];
}

const STORAGE_KEY = "repdeck.personalization.v1";
const HISTORY_LIMIT = 12;
const ROLLING_WINDOW = 4;

const DEFAULT_CONSTRAINTS: StoredConstraintPreferences = {
  noFloor: false,
  lowNoise: false,
  avoidKnee: false,
  avoidShoulder: false,
};

const DEFAULT_STATE: PersonalizationState = {
  profile: {
    constraints: DEFAULT_CONSTRAINTS,
    difficultyBias: 0,
    completedSessions: 0,
    lastFeedback: null,
  },
  history: [],
};

const clamp = (value: number, min: number, max: number) =>
  Math.min(max, Math.max(min, value));

const normalizeConstraints = (
  constraints?: Partial<StoredConstraintPreferences>
): StoredConstraintPreferences => ({
  noFloor: Boolean(constraints?.noFloor),
  lowNoise: Boolean(constraints?.lowNoise),
  avoidKnee: Boolean(constraints?.avoidKnee),
  avoidShoulder: Boolean(constraints?.avoidShoulder),
});

const inferStyleFromConstraints = (
  constraints: StoredConstraintPreferences
): WorkoutStyleProfile => {
  if (constraints.avoidKnee || constraints.avoidShoulder) {
    return "joint_friendly";
  }

  if (constraints.noFloor || constraints.lowNoise) {
    return "quiet";
  }

  return "anywhere";
};

const sanitizeState = (raw: unknown): PersonalizationState => {
  if (!raw || typeof raw !== "object") {
    return DEFAULT_STATE;
  }

  const candidate = raw as Partial<PersonalizationState>;
  const profile = candidate.profile ?? {};
  const history = Array.isArray(candidate.history) ? candidate.history : [];

  return {
    profile: {
      constraints: normalizeConstraints(
        (profile as Partial<PersonalizationProfile>).constraints
      ),
      difficultyBias: clamp(
        Number((profile as Partial<PersonalizationProfile>).difficultyBias) || 0,
        -3,
        3
      ),
      completedSessions: Math.max(
        0,
        Number((profile as Partial<PersonalizationProfile>).completedSessions) ||
          0
      ),
      lastFeedback:
        (profile as Partial<PersonalizationProfile>).lastFeedback === "easy" ||
        (profile as Partial<PersonalizationProfile>).lastFeedback === "good" ||
        (profile as Partial<PersonalizationProfile>).lastFeedback === "hard"
          ? (profile as Partial<PersonalizationProfile>).lastFeedback!
          : null,
    },
    history: history
      .filter((entry) => {
        if (!entry || typeof entry !== "object") {
          return false;
        }

        const feedback = (entry as WorkoutHistoryEntry).feedback;
        const duration = (entry as WorkoutHistoryEntry).duration;
        return (
          (feedback === "easy" || feedback === "good" || feedback === "hard") &&
          (duration === 15 || duration === 25 || duration === 40)
        );
      })
      .map((entry) => {
        const normalizedEntry = entry as Partial<WorkoutHistoryEntry>;
        const constraints = normalizeConstraints(normalizedEntry.constraints);
        const style =
          normalizedEntry.style === "anywhere" ||
          normalizedEntry.style === "quiet" ||
          normalizedEntry.style === "joint_friendly"
            ? normalizedEntry.style
            : inferStyleFromConstraints(constraints);

        return {
          completedAt: normalizedEntry.completedAt || new Date().toISOString(),
          duration: normalizedEntry.duration as 15 | 25 | 40,
          style,
          mode:
            normalizedEntry.mode === "quick_reset" ||
            normalizedEntry.mode === "standard_flow" ||
            normalizedEntry.mode === "deep_work"
              ? normalizedEntry.mode
              : "standard_flow",
          constraints,
          feedback: normalizedEntry.feedback as FeedbackRating,
          exerciseIds: Array.isArray(normalizedEntry.exerciseIds)
            ? normalizedEntry.exerciseIds
            : [],
        };
      })
      .slice(0, HISTORY_LIMIT),
  };
};


const saveState = (state: PersonalizationState) => {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
};

export const savePersonalizationState = (state: PersonalizationState) => {
  saveState(state);
};

export const loadPersonalizationState = (): PersonalizationState => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);

    if (raw) {
      return sanitizeState(JSON.parse(raw));
    }

    // 🔁 fallback to legacy key (from earlier buggy saves)
    const legacy = localStorage.getItem("personalization");
    if (legacy) {
      const parsed = sanitizeState(JSON.parse(legacy));

      // migrate to correct key
      localStorage.setItem(STORAGE_KEY, JSON.stringify(parsed));
      localStorage.removeItem("personalization");

      return parsed;
    }

    return DEFAULT_STATE;
  } catch {
    return DEFAULT_STATE;
  }
};

export const saveConstraintPreferences = (
  constraints: Partial<StoredConstraintPreferences>
) => {
  const state = loadPersonalizationState();
  const nextState: PersonalizationState = {
    ...state,
    profile: {
      ...state.profile,
      constraints: normalizeConstraints(constraints),
    },
  };

  saveState(nextState);
  return nextState;
};

const feedbackToBiasDelta = (feedback: FeedbackRating) => {
  if (feedback === "easy") return 1;
  if (feedback === "hard") return -1;
  return 0;
};

export const recordWorkoutFeedback = (
  state: PersonalizationState,
  {
    duration,
    style,
    mode,
    constraints,
    feedback,
    session,
  }: {
    duration: 15 | 25 | 40;
    style: WorkoutStyleProfile;
    mode: WorkoutMode;
    constraints: Partial<StoredConstraintPreferences>;
    feedback: FeedbackRating;
    session: WorkoutSession;
  }
) => {
  const normalizedConstraints = normalizeConstraints(constraints);

  const entry: WorkoutHistoryEntry = {
    completedAt: new Date().toISOString(),
    duration,
    style,
    mode,
    constraints: normalizedConstraints,
    feedback,
    exerciseIds: session.exercises.map(({ exercise }) => exercise.id),
  };

  const nextState: PersonalizationState = {
    profile: {
      constraints: normalizedConstraints,
      completedSessions: state.profile.completedSessions + 1,
      lastFeedback: feedback,
      difficultyBias: clamp(
        state.profile.difficultyBias + feedbackToBiasDelta(feedback),
        -3,
        3
      ),
    },
    history: [entry, ...state.history].slice(0, HISTORY_LIMIT),
  };

  saveState(nextState);
  return nextState;
};

const feedbackToScore = (feedback: FeedbackRating) => {
  if (feedback === "easy") return 1;
  if (feedback === "hard") return -1;
  return 0;
};

const getScopedEntries = (
  state: PersonalizationState,
  style: WorkoutStyleProfile,
  duration: 15 | 25 | 40
) =>
  state.history.filter(
    (entry) => entry.style === style && entry.duration === duration
  );

const getRollingDifficultyBias = (
  entries: WorkoutHistoryEntry[]
) => {
  if (!entries.length) return 0;

  const recentEntries = entries.slice(0, ROLLING_WINDOW);
  const averageScore =
    recentEntries.reduce((sum, entry) => sum + feedbackToScore(entry.feedback), 0) /
    recentEntries.length;

  return clamp(Math.round(averageScore * 2), -3, 3);
};

export const buildGenerationPreferences = (
  state: PersonalizationState,
  context: {
    style: WorkoutStyleProfile;
    duration: 15 | 25 | 40;
  }
) => {
  const scopedEntries = getScopedEntries(state, context.style, context.duration);
  const recentExerciseIds = state.history
    .slice(0, 4)
    .flatMap((entry) => entry.exerciseIds)
    .slice(0, 18);

  const exerciseFatigue = state.history.slice(0, 6).reduce<Record<string, number>>(
    (acc, entry, index) => {
      const weight = Math.max(1, 6 - index);
      entry.exerciseIds.forEach((id) => {
        acc[id] = (acc[id] || 0) + weight;
      });
      return acc;
    },
    {}
  );

  return {
    difficultyBias: getRollingDifficultyBias(scopedEntries),
    recentExerciseIds,
    exerciseFatigue,
  };
};
