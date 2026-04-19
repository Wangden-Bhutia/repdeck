
export type Constraints = {
  lowNoise?: boolean;
  noFloor?: boolean;
  noJump?: boolean;
};

function applyConstraints(exercises, constraints: Constraints) {
  return exercises.filter(ex => {
    if (constraints?.lowNoise && ex.isNoisy) return false;
    if (constraints?.noFloor && ex.requiresFloor) return false;
    if (constraints?.noJump && ex.requiresJump) return false;
    return true;
  });
}

// Session Engine: handles workout progression, timing, transitions

export const createSessionState = (session) => {
  const initial = {
    session,
    currentIndex: 0,
    currentRound: 1,
    isResting: false,
    remainingSeconds: 0,
    isRepMode: false,
    repsRemaining: 0,

    // NEW: time-bound session control
    totalSessionSeconds: (session?.durationSeconds || 900), // default 15 min
    elapsedSeconds: 0,
  };

  if (session?.exercises?.length) {
    const first = session.exercises[0];
    initial.remainingSeconds = Math.max(15, first.workSeconds || 30);
    if (first?.reps) {
      initial.isRepMode = true;
      initial.repsRemaining = first.reps;
    }
  }

  return initial;
};

export const startWorkInterval = (state, difficultyOffset) => {
  const item = state.session.exercises[state.currentIndex];

  if (item?.reps) {
    state.isRepMode = true;
    state.repsRemaining = Math.max(1, item.reps + (difficultyOffset || 0));
    state.isResting = false;
    return state;
  }

  const adjusted = (item.workSeconds || 30) + difficultyOffset;
  state.remainingSeconds = Math.max(15, adjusted);
  state.isResting = false;
  state.isRepMode = false;

  return state;
};

export const startRestInterval = (state, restSeconds) => {
  state.remainingSeconds = restSeconds;
  state.isResting = true;

  return state;
};

export const tick = (state) => {
  if (!state.isRepMode) {
    state.remainingSeconds -= 1;
    state.elapsedSeconds += 1; // track session time
  }
  return state;
};

export const isIntervalComplete = (state) => {
  if (state.isRepMode) {
    return state.repsRemaining <= 0;
  }
  return state.remainingSeconds <= 0;
};

export const completeRep = (state) => {
  if (state.isRepMode && state.repsRemaining > 0) {
    state.repsRemaining -= 1;
  }
  return state;
};

export const moveToNext = (state) => {
  // NEW: end session if time exceeded
  if (state.elapsedSeconds >= state.totalSessionSeconds) {
    return { state, done: true };
  }

  if (state.isResting) {
    state.isResting = false;
    state.currentIndex++;

    if (state.currentIndex >= state.session.exercises.length) {
      state.currentIndex = 0;
      state.currentRound++;

      if (state.currentRound > state.session.rounds) {
        return { state, done: true };
      }
    }

    return { state, done: false };
  }

  // finished work → go to rest
  state.isResting = true;
  return { state, done: false };
};


export function getFilteredShuffledExercises(EXERCISE_POOL, constraints: Constraints, currentRound = 1) {
  // Step 1: apply constraints
  const filtered = applyConstraints(EXERCISE_POOL, constraints);
  const pool = filtered.length > 0 ? filtered : EXERCISE_POOL;

  // Step 2: separate base vs hard
  const baseExercises = pool.filter(ex => !ex.isHard);
  const hardExercises = pool.filter(ex => ex.isHard);

  let workingPool = [...baseExercises];

  // Step 3: allow hard exercises only after round 2
  if (currentRound >= 3 && hardExercises.length > 0) {
    // inject max 1 hard exercise
    const randomHard = hardExercises[Math.floor(Math.random() * hardExercises.length)];
    workingPool.push(randomHard);
  }

  // Step 4: shuffle final pool
  return workingPool
    .map(x => ({ x, sort: Math.random() }))
    .sort((a, b) => a.sort - b.sort)
    .map(({ x }) => {
      // ensure reps exist for non-time exercises
      if (!x.workSeconds) {
        return {
          ...x,
          reps: x.reps || 12 // default reps
        };
      }
      return x;
    });
}