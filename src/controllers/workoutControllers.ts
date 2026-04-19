export function createWorkoutController(deps: any) {
  const {
    generateWorkoutSession,
    renderWorkout,
    playCompletionSignal,
    onSessionComplete
  } = deps;

  let currentSession: any = null;
  let sessionState: any = null;
  let lastOutput: any = null;
  let timerId: any = null;
  let baseDuration: number = 25;

  function runSession(config: any, output: HTMLElement) {
    const duration = config?.duration || 25;
    baseDuration = duration;

    const session = generateWorkoutSession(
      duration,
      { ...config, currentRound: 1 },
      config?.personalization
    );

    if (!session || !session.exercises?.length) {
      console.error("Invalid session");
      return;
    }

    currentSession = session;

    const totalSeconds = Number(config?.durationSeconds || duration * 60);

    sessionState = {
      index: 0,
      total: session.exercises.length,
      completed: false,
      elapsedSeconds: 0,
      currentRound: 1,
      totalSeconds // NEW
    };

    lastOutput = output;

    // clear previous timer
    if (timerId) {
      clearInterval(timerId);
    }

    // NEW: session timer loop
    timerId = setInterval(() => {
      if (!sessionState?.completed) {
        sessionState.elapsedSeconds += 1;

        // NEW: update only timer + progress (no full re-render)
        const totalSeconds = sessionState.totalSeconds;
        const elapsed = sessionState.elapsedSeconds || 0;
        const remaining = Math.max(0, totalSeconds - elapsed);
        const progress = Math.min(100, (elapsed / totalSeconds) * 100);

        const timerEl = lastOutput?.querySelector(".session-timer");
        if (timerEl) {
          const mins = Math.floor(remaining / 60);
          const secs = remaining % 60;
          const formatted = `${mins}:${secs.toString().padStart(2, "0")}`;
          timerEl.textContent = formatted;
        }

        const barEl = lastOutput?.querySelector(".session-progress-inner");
        if (barEl) (barEl as HTMLElement).style.width = (100 - progress) + "%";
      }
    }, 1000);

    renderCurrent();
  }

  function renderCurrent() {
    if (!currentSession || !sessionState || !lastOutput) return;

    const item = currentSession.exercises[sessionState.index];

    const totalSeconds = sessionState.totalSeconds;

    const elapsed = sessionState.elapsedSeconds || 0;
    const remaining = Math.max(0, totalSeconds - elapsed);
    const progress = Math.min(100, (elapsed / totalSeconds) * 100);

    renderWorkout({
      sessionRemaining: Math.floor(remaining),
      sessionProgress: progress,
      output: lastOutput,
      item,
      remainingSeconds: undefined,
      currentExerciseIndex: sessionState.index,
      exercisesPerRound: sessionState.total,
      totalExercises: sessionState.total,
      totalRounds: 1,
      isResting: false,
      isPaused: false,
      isCompleted: false,
      currentRound: sessionState.currentRound,
    });

    const timerEl = lastOutput?.querySelector(".session-timer");
    if (timerEl) {
      const mins = Math.floor(remaining / 60);
      const secs = remaining % 60;
      const formatted = `${mins}:${secs.toString().padStart(2, "0")}`;
      timerEl.textContent = formatted;
    }

    const barEl = lastOutput?.querySelector(".session-progress-inner");
    if (barEl) (barEl as HTMLElement).style.width = (100 - progress) + "%";
  }

  function nextExercise() {
    if (!currentSession || !sessionState) return;

    const totalSeconds = sessionState.totalSeconds;

    if (sessionState.elapsedSeconds >= totalSeconds) {
      playCompletionSignal?.();
      sessionState.completed = true;

      onSessionComplete?.({
        output: lastOutput,
        session: currentSession,
        duration: currentSession?.duration || 25,
        mode: currentSession?.mode || "",
        constraints: currentSession?.constraints || {}
      });

      return;
    }

    if (sessionState.index >= sessionState.total - 1) {
      // start next round
      sessionState.currentRound += 1;

      const newSession = generateWorkoutSession(
        baseDuration,
        { ...currentSession.constraints, currentRound: sessionState.currentRound },
        currentSession.personalization
      );

      if (newSession && newSession.exercises?.length) {
        currentSession = newSession;
        sessionState.total = newSession.exercises.length;
      }

      sessionState.index = 0;
      renderCurrent();
      return;
    }

    sessionState.index++;
    renderCurrent();
  }

  // ensure only one listener exists
  if ((window as any)._skipHandler) {
    window.removeEventListener("workout:skip", (window as any)._skipHandler);
  }

  (window as any)._skipHandler = () => nextExercise();
  window.addEventListener("workout:skip", (window as any)._skipHandler);

  return { runSession, nextExercise };
}
