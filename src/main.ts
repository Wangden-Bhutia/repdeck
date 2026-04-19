import "./styles/start.css";
import type { WorkoutMode } from "./domain/exercisePool";
import type {
  ConstraintProfile,
  GenerationPreferences,
  WorkoutSession,
} from "./domain/workoutGenerator";
import { generateWorkoutSession } from "./domain/workoutGenerator";
import { createWorkoutController } from "./controllers/workoutControllers";
import { renderStartView } from "./ui/startView";
import { showAboutOverlay, showPreviewOverlay } from "./ui/overlays";
import { renderWorkout } from "./ui/workoutView";
import { playBeep, playCompletionSignal, triggerHaptic } from "./utils/feedback";
import {
  buildGenerationPreferences,
  loadPersonalizationState,
  recordWorkoutFeedback,
  saveConstraintPreferences,
  savePersonalizationState,
  type FeedbackRating,
  type StoredConstraintPreferences,
  type WorkoutStyleProfile,
} from "./utils/personalization";

declare global {
  interface Window {
    nextExercise?: () => void;
    triggerInstall?: () => Promise<void>;
  }
}

type WorkoutDuration = 15 | 25 | 40;
type WorkoutStyle = WorkoutStyleProfile | "custom";

type SessionRunConfig = StoredConstraintPreferences & {
  duration: WorkoutDuration;
  mode: WorkoutMode;
  style: WorkoutStyleProfile;
  personalization: GenerationPreferences;
};

const CURRENT_VERSION = "0.2.1";
const app = document.querySelector<HTMLElement>("#app");
let selectedDuration: WorkoutDuration | null = null;

let lastSessionContext: {
  session: WorkoutSession;
  duration: WorkoutDuration;
  mode: WorkoutMode;
  constraints: StoredConstraintPreferences;
} | null = null;

const storedVersion = localStorage.getItem("app_version");

if (storedVersion && storedVersion !== CURRENT_VERSION) {
  localStorage.setItem("app_version", CURRENT_VERSION);
  location.reload();
} else {
  localStorage.setItem("app_version", CURRENT_VERSION);
}

let deferredPrompt: {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
} | null = null;
let installAvailable = false;

const EX_PREVIEW = {
  "Push-ups": { img: "/assets/exercises/pushups.png", cue: "Body straight, elbows ~45°" },
  "Incline Push-ups": { img: "/assets/exercises/incline_pushups.png", cue: "Hands elevated, keep core tight" },
  "Wall Push-ups": { img: "/assets/exercises/wall_pushups.png", cue: "Straight line, slow control" },
  "Pike Push-ups": { img: "/assets/exercises/pike_pushups.png", cue: "Hips high, head toward floor" },
  "Squats": { img: "/assets/exercises/squats.png", cue: "Chest up, hips back" },
  "Reverse Lunges": { img: "/assets/exercises/reverse_lunges.png", cue: "Step back, front knee stable" },
  "Split Squats": { img: "/assets/exercises/split_squats.png", cue: "Vertical torso, slow down" },
  "Wall Sit": { img: "/assets/exercises/wall_sit.png", cue: "Knees 90°, back flat" },
  "Calf Raises": { img: "/assets/exercises/calf_raises.png", cue: "Full range, slow" },
  Plank: { img: "/assets/exercises/plank.png", cue: "Brace core, no sag" },
  "Dead Bug": { img: "/assets/exercises/dead_bug.png", cue: "Lower back pressed" },
  "Standing Knee Raises": { img: "/assets/exercises/standing_knee_raises.png", cue: "Control, don’t sway" },
  "Standing Oblique Crunch": { img: "/assets/exercises/standing_oblique_crunch.png", cue: "Elbow to knee, slow" },
  "March Hold": { img: "/assets/exercises/march_hold.png", cue: "Balance, core tight" },
  "Jumping Jacks": { img: "/assets/exercises/jumping_jacks.png", cue: "Light landings" },
  "Low-Impact High Knees": { img: "/assets/exercises/low_impact_high_knees.png", cue: "Quick but quiet" },
  "Shadow Boxing": { img: "/assets/exercises/shadow_boxing.png", cue: "Stay light, rotate" },
  "Step-back Burpees": { img: "/assets/exercises/step_back_burpees.png", cue: "Step back, no jump" },
  "Superman Hold": { img: "/assets/exercises/superman_hold.png", cue: "Lift chest & legs" },
  "Reverse Snow Angels": { img: "/assets/exercises/reverse_snow_angels.png", cue: "Thumbs up, squeeze back" },
  "Pull-Apart Hold": { img: "/assets/exercises/pull_apart_hold.png", cue: "Squeeze shoulder blades" },
  "Elbow Drive": { img: "/assets/exercises/elbow_drive.png", cue: "Drive elbows back" },
  "Row Hold": { img: "/assets/exercises/row_hold.png", cue: "Hold squeeze" },
};

const preloadExerciseImages = () => {
  Object.values(EX_PREVIEW).forEach(({ img }) => {
    const image = new Image();
    image.src = img;
  });
};

const getModeForDuration = (duration: WorkoutDuration): WorkoutMode => {
  if (duration === 15) return "quick_reset";
  if (duration === 40) return "deep_work";
  return "standard_flow";
};

const getConstraintSnapshot = (
  source?: Partial<StoredConstraintPreferences>
): StoredConstraintPreferences => {
  if (source) {
    return {
      noFloor: Boolean(source.noFloor),
      lowNoise: Boolean(source.lowNoise),
      avoidKnee: Boolean(source.avoidKnee),
      avoidShoulder: Boolean(source.avoidShoulder),
      noJump: Boolean(source.noJump),
    };
  }

  const inputValue = (id: string) => {
    const input = document.getElementById(id);
    return input instanceof HTMLInputElement ? input.checked : false;
  };

  const fallbackConstraints = {
    noFloor: inputValue("noFloor"),
    lowNoise: inputValue("lowNoise"),
    avoidKnee: inputValue("avoidKnee"),
    avoidShoulder: inputValue("avoidShoulder"),
    noJump: inputValue("noJump"),
  };

  if (
    fallbackConstraints.noFloor ||
    fallbackConstraints.lowNoise ||
    fallbackConstraints.noJump ||
    fallbackConstraints.avoidKnee ||
    fallbackConstraints.avoidShoulder
  ) {
    return fallbackConstraints;
  }

  const activeStyles = Array.from(
  document.querySelectorAll<HTMLButtonElement>("[data-style].active")
).map(btn => btn.dataset.style);

return {
  noFloor: activeStyles.includes("no_floor"),
  lowNoise: activeStyles.includes("low_noise"),
  noJump: activeStyles.includes("low_noise"), // tie jumping to noise
  avoidKnee: false,
  avoidShoulder: false,
};

  return STYLE_PRESETS.anywhere;
};

const STYLE_PRESETS: Record<
  Exclude<WorkoutStyle, "custom">,
  StoredConstraintPreferences
> = {
  anywhere: {
    noFloor: false,
    lowNoise: false,
    noJump: false,
    avoidKnee: false,
    avoidShoulder: false,
  },
  quiet: {
    noFloor: false,
    lowNoise: true,
    noJump: true,
    avoidKnee: false,
    avoidShoulder: false,
  },
  joint_friendly: {
    noFloor: true,
    lowNoise: true,
    noJump: true,
    avoidKnee: false,
    avoidShoulder: false,
  },
};

const constraintsEqual = (
  a: StoredConstraintPreferences,
  b: StoredConstraintPreferences
) =>
  a.noFloor === b.noFloor &&
  a.lowNoise === b.lowNoise &&
  a.noJump === b.noJump &&
  a.avoidKnee === b.avoidKnee &&
  a.avoidShoulder === b.avoidShoulder;

const inferWorkoutStyle = (
  constraints: StoredConstraintPreferences
): WorkoutStyle => {
  if (constraintsEqual(constraints, STYLE_PRESETS.anywhere)) return "anywhere";
  if (constraintsEqual(constraints, STYLE_PRESETS.quiet)) return "quiet";
  if (constraintsEqual(constraints, STYLE_PRESETS.joint_friendly)) {
    return "joint_friendly";
  }
  return "custom";
};

const resolveWorkoutStyle = (
  constraints: StoredConstraintPreferences
): WorkoutStyleProfile => {
  const inferred = inferWorkoutStyle(constraints);
  return inferred === "custom" ? "anywhere" : inferred;
};

const resolveOutput = (output: HTMLElement | string) =>
  output instanceof HTMLElement
    ? output
    : document.querySelector<HTMLElement>(output);

const formatConstraintSummary = (constraints: StoredConstraintPreferences) => {
  const labels = [
    constraints.noFloor ? "standing only" : "",
    constraints.lowNoise ? "quiet" : "",
    constraints.avoidKnee ? "knee-aware" : "",
    constraints.avoidShoulder ? "shoulder-aware" : "",
  ].filter(Boolean);

  return labels.length ? labels.join(" • ") : "full-body mix";
};

if (app) {

  const renderStartScreen = () => {
    const personalization = loadPersonalizationState();

    app.innerHTML = renderStartView({
      ...personalization.profile.constraints,
      selectedDuration,
      completedSessions: personalization.profile.completedSessions,
      lastFeedback: personalization.profile.lastFeedback,
    });

    bindStartViewEvents();
    syncInstallButton();
  };

  const startSession = (
    duration: WorkoutDuration,
    overrideConstraints?: Partial<StoredConstraintPreferences>
  ) => {
    console.log("START SESSION CALLED", duration);
    selectedDuration = duration;
    const constraints = getConstraintSnapshot(overrideConstraints);
    saveConstraintPreferences(constraints);
    const style = resolveWorkoutStyle(constraints);

    const personalization = loadPersonalizationState();
    const workoutConfig: SessionRunConfig = {
      ...constraints,
      duration,
      durationSeconds: duration * 60,
      mode: getModeForDuration(duration),
      style,
      personalization: buildGenerationPreferences(personalization, {
        style,
        duration,
      }),
    };

    triggerHaptic(30);
    app.innerHTML = `<div id="output"></div>`;

    const workoutRoot = document.getElementById("output");
    if (!workoutRoot) {
      return;
    }
    console.log("RUNNING SESSION", workoutConfig);
    // Create controller here
    const controller = createWorkoutController({
      generateWorkoutSession,
      renderWorkout,
      playBeep,
      playCompletionSignal,
      onSessionComplete: ({
        output,
        session,
        duration,
        mode,
        constraints,
      }: {
        output: HTMLElement | string;
        session: WorkoutSession;
        duration: WorkoutDuration;
        mode: WorkoutMode;
        constraints: ConstraintProfile;
      }) => {
        const root = resolveOutput(output);
        if (!root) return;

        const snapshot = getConstraintSnapshot(constraints);

        lastSessionContext = {
          session,
          duration,
          mode,
          constraints: snapshot,
        };

        renderCompletionScreen(root, session, duration, mode, snapshot);
      },
    });
    // update global nextExercise reference
    window.nextExercise = controller.nextExercise;
    try {
      controller.runSession(workoutConfig, workoutRoot);
    } catch (err) {
      console.error("RUN SESSION ERROR", err);
    }
  };

  const renderCompletionScreen = (
    output: HTMLElement,
    session: WorkoutSession,
    duration: WorkoutDuration,
    mode: WorkoutMode,
    constraints: StoredConstraintPreferences
  ) => {
    const summary = formatConstraintSummary(constraints);

    output.innerHTML = `
    <div class="completion-container">
      <div class="workout-card" style="display:flex;flex-direction:column;align-items:center;text-align:center;gap:16px;">
        <div style="font-size:28px;font-weight:700;">Session Complete</div>
        <div style="opacity:0.8;">You didn’t skip today</div>
        <div style="opacity:0.7;">That’s enough.</div>

        <div id="feedback" style="font-size:13px;opacity:0.6;cursor:pointer;margin-bottom:18px;">
          <span data-value="easy">Too Easy</span> • 
          <span data-value="good">Good</span> • 
          <span data-value="hard">Too Hard</span>
        </div>

        <button id="repeatBtn" type="button" class="secondary-btn">Go Again</button>
        <button id="homeBtn" type="button" class="secondary-btn">Home</button>
      </div>
    </div>
`;

    const feedback = document.getElementById("feedback");
    feedback?.addEventListener("click", (e: any) => {
      const value = e.target?.dataset?.value;
      if (!value) return;

      // visual feedback (highlight selection)
      const spans = feedback.querySelectorAll("span");
      spans.forEach((s: any) => {
        s.style.opacity = "0.25"; // more faded
        s.style.color = "rgba(255,255,255,0.4)";
      });

      const target = e.target as HTMLElement;
      target.style.opacity = "1";
      target.style.color = "#4ADE80"; // brighter green

      // confirmation text
      let confirm = document.getElementById("feedbackConfirm");
      if (!confirm) {
        confirm = document.createElement("div");
        confirm.id = "feedbackConfirm";
        confirm.style.marginTop = "6px";
        confirm.style.fontSize = "12px";
        confirm.style.opacity = "0.7";
        confirm.textContent = "Saved";
        feedback.parentElement?.appendChild(confirm);
      }

      window.dispatchEvent(new CustomEvent("workout:feedback", {
        detail: { value }
      }));

    });

   output.addEventListener("click", (e: any) => {
  const id = e.target?.id;

  if (id === "repeatBtn") {
    const restartDuration = selectedDuration || duration;
    console.log("GO AGAIN CLICKED", restartDuration);
    startSession(restartDuration as WorkoutDuration);
    return;
  }

  if (id === "homeBtn") {
    renderStartScreen();
    return;
  }
});
};

  const bindStartViewEvents = () => {
    const styleButtons = Array.from(
      document.querySelectorAll<HTMLButtonElement>("[data-style]")
    );

    const paintStyleState = (clickedButton: HTMLButtonElement) => {
      const isActive = clickedButton.classList.contains("active");
      clickedButton.classList.toggle("active", !isActive);
      clickedButton.setAttribute("aria-pressed", String(!isActive));
    };

    const paintDurationState = (duration: WorkoutDuration | null) => {
      selectedDuration = duration;

      document
        .querySelectorAll<HTMLButtonElement>("[data-duration]")
        .forEach((button) => {
          const isActive = Number(button.dataset.duration) === duration;
          button.classList.toggle("active", isActive);
          button.setAttribute("aria-pressed", String(isActive));
        });

      // Update CTA secondary label directly
      const ctaLabel = document.querySelector(".emergency-btn .secondary") as HTMLElement | null;
      if (ctaLabel) {
        ctaLabel.textContent = duration ? `${duration} min` : "";
      }
    };

    styleButtons.forEach((button) => {
      button.addEventListener("click", () => {
        paintStyleState(button);
      });
    });
    paintDurationState(selectedDuration);

    document
      .querySelectorAll<HTMLButtonElement>("[data-duration]")
      .forEach((button) => {
        const duration = Number(button.dataset.duration) as WorkoutDuration;
        button.addEventListener("click", () => {
          if (duration === 15 || duration === 25 || duration === 40) {
            paintDurationState(duration);
          }
        });
      });

    document
      .getElementById("start15")
      ?.addEventListener("click", () => {
        const durationToUse = selectedDuration || 15;

        // default to anywhere style if nothing selected
        const constraints = getConstraintSnapshot();

        startSession(durationToUse as WorkoutDuration, constraints);
});

    document.getElementById("aboutTrigger")?.addEventListener("click", (event) => {
      event.preventDefault();
      showAboutOverlay();
    });

    document.getElementById("installBtn")?.addEventListener("click", () => {
      if (installAvailable) {
        void window.triggerInstall?.();
      }
    });
  };

  const syncInstallButton = () => {
    setTimeout(() => {
      const btn = document.getElementById("installBtn");
      if (!btn) return;

      btn.style.display = "inline-block";
      btn.style.opacity = installAvailable ? "0.9" : "0.55";

      const standalone =
        window.matchMedia("(display-mode: standalone)").matches ||
        Boolean(
          (window.navigator as Navigator & { standalone?: boolean }).standalone
        );

      if (standalone) {
        btn.remove();
      }
    }, 0);
  };

  window.addEventListener("exercise:preview", (event) => {
    const previewEvent = event as CustomEvent<{ exercise: unknown }>;
    showPreviewOverlay(previewEvent.detail.exercise);
  });

  renderStartScreen();

  window.addEventListener("workout:feedback", (e: any) => {
    const value = e?.detail?.value as FeedbackRating | undefined;
    if (!value) return;

    const personalization = loadPersonalizationState();

    // persist via existing helper (also updates bias, fatigue, etc.)
    if (!lastSessionContext) return;

    const updated = recordWorkoutFeedback(personalization, {
      feedback: value,
      duration: lastSessionContext.duration,
      mode: lastSessionContext.mode,
      style: resolveWorkoutStyle(lastSessionContext.constraints),
      constraints: lastSessionContext.constraints,
      session: lastSessionContext.session,
    });
    savePersonalizationState(updated);

    // do not navigate away; keep user on completion screen

  });
}

window.addEventListener("DOMContentLoaded", () => {
  setTimeout(() => {
    const btn = document.getElementById("installBtn");
    const standalone =
      window.matchMedia("(display-mode: standalone)").matches ||
      Boolean((window.navigator as Navigator & { standalone?: boolean }).standalone);

    if (btn && standalone) {
      btn.remove();
    }
  }, 100);
});

window.addEventListener("beforeinstallprompt", (event) => {
  event.preventDefault();
  deferredPrompt = event as unknown as NonNullable<typeof deferredPrompt>;
  installAvailable = true;

  const btn = document.getElementById("installBtn");
  if (btn) {
    btn.style.opacity = "0.9";
    btn.style.display = "inline-block";
  }
});

window.triggerInstall = async () => {
  if (!deferredPrompt) return;

  await deferredPrompt.prompt();
  const choice = await deferredPrompt.userChoice;
  deferredPrompt = null;

  if (choice.outcome === "accepted") {
    setTimeout(() => {
      document.getElementById("installBtn")?.remove();
    }, 100);
  }
};

window.addEventListener("appinstalled", () => {
  setTimeout(() => {
    document.getElementById("installBtn")?.remove();
  }, 100);
});

preloadExerciseImages();
