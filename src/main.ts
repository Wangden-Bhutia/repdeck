

import { generateWorkoutSession } from "./domain/workoutGenerator";


// --- PWA Install Prompt Handling ---
let deferredPrompt: any;
let installAvailable = false;

window.addEventListener("beforeinstallprompt", (e) => {
  e.preventDefault();
  deferredPrompt = e;
  installAvailable = true;

  const btn = document.getElementById("installBtn") as HTMLButtonElement;
  if (btn) btn.style.opacity = "0.9";
});

// Expose manual trigger (can be wired to button later)
(window as any).triggerInstall = async () => {
  if (!deferredPrompt) return;
  deferredPrompt.prompt();
  await deferredPrompt.userChoice;
  deferredPrompt = null;
};

// --- Exercise preview (minimal) ---
const EX_PREVIEW: Record<string, { img: string; cue: string }> = {
  "Push-ups": { img: "/src/assets/exercises/pushups.png", cue: "Body straight, elbows ~45°" },
  "Incline Push-ups": { img: "/src/assets/exercises/incline_pushups.png", cue: "Hands elevated, keep core tight" },
  "Wall Push-ups": { img: "/src/assets/exercises/wall_pushups.png", cue: "Straight line, slow control" },
  "Pike Push-ups": { img: "/src/assets/exercises/pike_pushups.png", cue: "Hips high, head toward floor" },
  "Squats": { img: "/src/assets/exercises/squats.png", cue: "Chest up, hips back" },
  "Reverse Lunges": { img: "/src/assets/exercises/reverse_lunges.png", cue: "Step back, front knee stable" },
  "Split Squats": { img: "/src/assets/exercises/split_squats.png", cue: "Vertical torso, slow down" },
  "Wall Sit": { img: "/src/assets/exercises/wall_sit.png", cue: "Knees 90°, back flat" },
  "Calf Raises": { img: "/src/assets/exercises/calf_raises.png", cue: "Full range, slow" },
  "Plank": { img: "/src/assets/exercises/plank.png", cue: "Brace core, no sag" },
  "Dead Bug": { img: "/src/assets/exercises/dead_bug.png", cue: "Lower back pressed" },
  "Standing Knee Raises": { img: "/src/assets/exercises/standing_knee_raises.png", cue: "Control, don’t sway" },
  "Standing Oblique Crunch": { img: "/src/assets/exercises/standing_oblique_crunch.png", cue: "Elbow to knee, slow" },
  "March Hold": { img: "/src/assets/exercises/march_hold.png", cue: "Balance, core tight" },
  "Jumping Jacks": { img: "/src/assets/exercises/jumping_jacks.png", cue: "Light landings" },
  "Low-Impact High Knees": { img: "/src/assets/exercises/low_impact_high_knees.png", cue: "Quick but quiet" },
  "Shadow Boxing": { img: "/src/assets/exercises/shadow_boxing.png", cue: "Stay light, rotate" },
  "Step-back Burpees": { img: "/src/assets/exercises/step_back_burpees.png", cue: "Step back, no jump" },
  "Superman Hold": { img: "/src/assets/exercises/superman_hold.png", cue: "Lift chest & legs" },
  "Reverse Snow Angels": { img: "/src/assets/exercises/reverse_snow_angels.png", cue: "Thumbs up, squeeze back" },
  "Pull-Apart Hold": { img: "/src/assets/exercises/pull_apart_hold.png", cue: "Squeeze shoulder blades" },
  "Elbow Drive": { img: "/src/assets/exercises/elbow_drive.png", cue: "Drive elbows back" },
  "Row Hold": { img: "/src/assets/exercises/row_hold.png", cue: "Hold squeeze" },
};

const app = document.querySelector<HTMLDivElement>("#app");

let lastDuration: 15 | 25 | 40 = 15;
let lastConstraints = { noFloor: false, lowNoise: false };
let lastSession: ReturnType<typeof generateWorkoutSession> | null = null;

const recoveryMessages = [
  "Not ideal conditions. Still done.",
  "Low energy. Still showed up.",
  "No setup. No problem.",
  "This is how consistency survives.",
  "Fallback used. Mission complete.",
];

const getRecoveryMessage = () => {
  return recoveryMessages[Math.floor(Math.random() * recoveryMessages.length)];
};

const showPreview = (name: string) => {
  const data = EX_PREVIEW[name];
  if (!data) return;

  const overlay = document.createElement("div");
  overlay.className = "preview-overlay";
  overlay.innerHTML = `
    <div class="preview-card">
      <img src="${data.img}" alt="${name}" />
      <div class="preview-title">${name}</div>
      <div class="preview-cue">${data.cue}</div>
      <button id="closePreview">Close</button>
    </div>
  `;

  document.body.appendChild(overlay);

  const close = () => overlay.remove();
  overlay.addEventListener("click", (e) => {
    if (e.target === overlay) close();
  });
  (overlay.querySelector("#closePreview") as HTMLButtonElement).onclick = close;
};

const bindCompletionActions = () => {
  const restartBtn = document.getElementById("restartBtn") as HTMLButtonElement;
  const newBtn = document.getElementById("newBtn") as HTMLButtonElement;

  restartBtn?.addEventListener("click", () => {
    if (!lastSession) return;

    currentSession = lastSession;
    currentIndex = 0;
    currentRound = 1;
    isResting = false;

    if (timerId) {
      clearInterval(timerId);
      timerId = undefined;
    }

    renderCurrent();
  });

  newBtn?.addEventListener("click", () => {
    // reset UI completely for a fresh start
    window.location.reload();
  });
};

if (app) {
  app.innerHTML = `
  <div class="app" style="display:flex;flex-direction:column;justify-content:space-between;height:80vh;">
<style>
@keyframes pulse {
  0% { transform: scale(1); box-shadow: 0 0 0 rgba(229,57,53,0.15); }
  50% { transform: scale(1.005); box-shadow: 0 0 6px rgba(229,57,53,0.2); }
  100% { transform: scale(1); box-shadow: 0 0 0 rgba(229,57,53,0.15); }
}
.fade-in {
  opacity: 0;
  transform: translateY(6px);
  transition: all 0.3s ease;
}
.fade-in.show {
  opacity: 1;
  transform: translateY(0);
}
.preview-overlay {
  position: fixed; inset: 0; background: rgba(0,0,0,0.6);
  display: flex; align-items: center; justify-content: center; z-index: 9999;
}
.preview-card {
  background: #111; border-radius: 12px; padding: 12px; width: 280px; text-align: center;
  box-shadow: 0 10px 30px rgba(0,0,0,0.5);
}
.preview-card img { width: 100%; border-radius: 8px; }
.preview-title { margin-top: 8px; font-weight: 600; }
.preview-cue { font-size: 12px; opacity: 0.7; margin: 6px 0 10px; }
.preview-card button { padding: 6px 10px; }

.about-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0,0,0,0.4);
  backdrop-filter: blur(8px);
  -webkit-backdrop-filter: blur(8px);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 9999;
}

.about-card {
  background: rgba(255,255,255,0.08);
  border-radius: 14px;
  padding: 18px;
  width: 280px;
  text-align: center;
  box-shadow: 0 10px 30px rgba(0,0,0,0.5);
  backdrop-filter: blur(12px);
  -webkit-backdrop-filter: blur(12px);
  border: 1px solid rgba(255,255,255,0.12);
}

.about-card button {
  margin-top: 12px;
  padding: 6px 10px;
}

.emergency-btn {
  background: #b71c1c; /* deeper red */
  color: #fff;
  border: none;
  box-shadow: none; /* remove glow */
}
/* --- End screen polish --- */
.complete {
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  height: 60vh;
  transform: scale(0.98);
  opacity: 0;
  transition: all 0.3s ease;
}

.complete.show {
  transform: scale(1);
  opacity: 1;
}

.complete-title {
  font-size: 22px;
  font-weight: 600;
}

  .complete-sub {
    margin-top: 6px;
    opacity: 0;
  }

  .complete.show .complete-sub {
    opacity: 0.8;
    transition: opacity 0.3s ease 0.15s;
  }

.secondary {
  margin-top: 16px;
  display: flex;
  gap: 12px;
}

#newBtn {
  background: #e53935;
  color: white;
}

#restartBtn {
  background: transparent;
  border: 1px solid rgba(255,255,255,0.2);
  color: #aaa;
}
  #restartBtn {
  background: transparent;
  border: 1px solid rgba(255,255,255,0.2);
  color: #aaa;
}

@media (max-width: 480px) {
  #emergency {
    width: 140px;
    height: 140px;
    font-size: 13px;
  }
}

#emergency {
  border-radius: 50%;
  overflow: hidden;
  will-change: transform;
}

#emergency:active {
  transform: scale(0.94);
}
</style>

    <div>
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:12px;">
        <h2>RepDeck</h2>
        <div id="aboutTrigger" class="meta" style="cursor:pointer;">Fallback Mode</div>
      </div>

      <div class="controls" style="justify-content:flex-start;margin-bottom:16px;flex-direction:column;gap:4px;opacity:0.85;">
        <label style="display:flex;flex-direction:column;align-items:flex-start;">
          <span>
            <input type="checkbox" id="noFloor" /> Stay Standing
          </span>
          <span style="font-size:10px;opacity:0.3;margin-left:0;">no floor exercises</span>
        </label>
        <label style="display:flex;flex-direction:column;align-items:flex-start;">
          <span>
            <input type="checkbox" id="lowNoise" /> No Noise
          </span>
          <span style="font-size:10px;opacity:0.3;margin-left:0;">no jumping</span>
        </label>
      </div>
    </div>

    <div style="display:flex;flex-direction:column;justify-content:center;align-items:center;flex:1;gap:8px;">
     <button 
       id="emergency" 
       class="emergency-btn" 
       style="
         width:160px;
         height:160px; /* force exact height */
         border-radius:50%;
         font-size:14px;
         display:flex;
         align-items:center;
         justify-content:center;
         text-align:center;
         flex:0 0 auto; /* prevent flex stretching */
       "
     >
       START<br/>15M
     </button>
      <div id="startHint" style="font-size:11px;opacity:0.4;text-align:center;margin-top:-18px;margin-bottom:12px;">
        No setup. Just start.
      </div>
      <button id="installBtn" style="
        margin-top:6px;
        font-size:11px;
        opacity:0.5;
        background:none;
        border:none;
        color:#aaa;
      ">
        Install App
      </button>
    </div>

    <div>
      <div class="buttons">
        <button id="start25">25 min</button>
        <button id="start40">40 min</button>
      </div>

      <div id="output" style="margin-top:16px;"></div>
    </div>


  </div>
`;

  const emergencyBtn = document.getElementById("emergency") as HTMLButtonElement;
  const btn25 = document.getElementById("start25") as HTMLButtonElement;
  const btn40 = document.getElementById("start40") as HTMLButtonElement;
  const output = document.getElementById("output") as HTMLDivElement;
  const noFloor = document.getElementById("noFloor") as HTMLInputElement;
  const lowNoise = document.getElementById("lowNoise") as HTMLInputElement;

  const aboutTrigger = document.getElementById("aboutTrigger");
  aboutTrigger?.addEventListener("click", () => showAbout());

let currentSession: ReturnType<typeof generateWorkoutSession> | null = null;
let currentIndex = 0;
let currentRound = 1;
const restSecondsDefault = 15;
let isResting = false;
  let timerId: number | undefined;
  let remainingSeconds = 0;
  let isPaused = false;
  let difficultyOffset = 0; // +/- seconds adjustment
  let skipsCount = 0;
  let totalSessionSeconds = 0;
  let remainingSessionSeconds = 0;

  const playBeep = (type: "normal" | "rest" | "start" = "normal") => {
    try {
      const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = "sine";
      let duration = 200;

      if (type === "start") {
        osc.frequency.value = 1000; // higher pitch
        duration = 120; // shorter, lighter
      } else if (type === "rest") {
        osc.frequency.value = 500; // low tone
        duration = 200;
      } else {
        osc.frequency.value = 700; // mid tone (end beep)
        duration = 220; // slightly longer
      }

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start();

      // vibration feedback (mobile)
      if (navigator.vibrate) {
        navigator.vibrate(50);
      }

      gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.2);

      setTimeout(() => {
        osc.stop();
        ctx.close();
      }, duration);
    } catch (e) {}
  };

  // --- Completion signal (soft double beep + vibration) ---
  const playCompletionSignal = () => {
    // soft double beep + vibration pattern
    setTimeout(() => playBeep("normal"), 100);
    setTimeout(() => playBeep("normal"), 300);

    if (navigator.vibrate) {
      navigator.vibrate([40, 60, 40]);
    }
  };

  const runSession = (duration: 15 | 25 | 40) => {
    const appContainer = document.querySelector(".app");
    appContainer?.classList.add("in-workout");
    lastDuration = duration;
    lastConstraints = {
      noFloor: noFloor.checked,
      lowNoise: lowNoise.checked,
    };

    const session = generateWorkoutSession(duration, lastConstraints);
    // compute total session seconds (work only)
    totalSessionSeconds = session.exercises.reduce((sum, e) => sum + e.workSeconds, 0) * session.rounds;
    remainingSessionSeconds = totalSessionSeconds;

    lastSession = session;

    currentSession = session;
    currentIndex = 0;
    currentRound = 1;
    skipsCount = 0;
    isResting = false;
    if (timerId) {
      clearInterval(timerId);
      timerId = undefined;
    }
    const hint = document.getElementById("startHint");
    hint?.remove();
    renderCurrent();
  };

  function renderCurrent() {
    if (!currentSession) return;

    isPaused = false;

    // overall workout progress
    const totalSteps = currentSession.exercises.length * currentSession.rounds;
    const currentStep =
      (currentRound - 1) * currentSession.exercises.length + currentIndex;
    const overallPercent = (currentStep / totalSteps) * 100;

    if (isResting) {
      remainingSeconds = restSecondsDefault;

      output.innerHTML = `
        <div class="rest">
          <div class="meta">Rest • Round ${currentRound} / ${currentSession.rounds}</div>
          <div id="sessionTimer" style="font-size:12px;opacity:0.5;text-align:center;margin-bottom:6px;"></div>
          <div id="timer" class="timer">${remainingSeconds}</div>
        </div>
      `;
      output.classList.remove("show");
      output.classList.add("fade-in");
      setTimeout(() => output.classList.add("show"), 10);

      const timerEl = document.getElementById("timer") as HTMLDivElement;

      if (timerId) {
        clearInterval(timerId);
        timerId = undefined;
      }

      timerId = window.setInterval(() => {
        remainingSessionSeconds--;
        remainingSeconds--;

        // last 3 sec countdown effect
        if (remainingSeconds <= 3 && remainingSeconds > 0) {
          playBeep("rest");
          timerEl.style.color = "#e53935";
          timerEl.style.transform = "scale(1.15)";
          timerEl.style.textShadow = "0 0 10px rgba(229,57,53,0.6)";
        } else {
          timerEl.style.color = "#cccccc";
          timerEl.style.transform = "scale(1.02)";
          timerEl.style.textShadow = "none";
          setTimeout(() => {
            timerEl.style.transform = "scale(1)";
          }, 120);
        }

        timerEl.textContent = `${Math.max(remainingSeconds, 0)}s`;
        timerEl.style.transition = "all 0.3s cubic-bezier(0.4, 0, 0.2, 1)";

        const sessionEl = document.getElementById("sessionTimer") as HTMLDivElement;
        if (sessionEl) {
          const mins = Math.floor(remainingSessionSeconds / 60);
          const secs = remainingSessionSeconds % 60;
          sessionEl.textContent = `${mins}:${secs.toString().padStart(2, "0")} remaining`;
        }

        if (remainingSeconds <= 0) {
          playBeep("rest");
          clearInterval(timerId!);
          timerId = undefined;
          isResting = false;
          renderCurrent();
        }
      }, 1000);

      return;
    }

    const item = currentSession.exercises[currentIndex];
    playBeep("start");

    const adjusted = item.workSeconds + difficultyOffset;
    remainingSeconds = Math.max(15, adjusted);

    output.innerHTML = `
      <div class="overall-progress-bar">
        <div id="overallProgress" class="overall-progress"></div>
      </div>

      <div id="timer" class="timer">${remainingSeconds}</div>

      <div id="exerciseName" class="exercise-name" style="cursor:pointer;">
        ${item.exercise.name}
      </div>

      <div class="meta">
        Round ${currentRound} • ${currentIndex + 1}/${currentSession.exercises.length}
      </div>

      <div id="sessionTimer" style="font-size:12px;opacity:0.5;text-align:center;margin-bottom:6px;"></div>

      <div class="progress-bar">
        <div id="progress" class="progress"></div>
      </div>

      <div class="buttons">
        <button id="pauseBtn">Pause</button>
        <button id="nextBtn">Skip</button>
      </div>
    `;
    output.classList.remove("show");
    output.classList.add("fade-in");
    setTimeout(() => output.classList.add("show"), 10);

    const overallEl = document.getElementById("overallProgress") as HTMLDivElement;
    if (overallEl) overallEl.style.width = `${overallPercent}%`;
    const nextBtn = document.getElementById("nextBtn") as HTMLButtonElement;
    const pauseBtn = document.getElementById("pauseBtn") as HTMLButtonElement;
    const timerEl = document.getElementById("timer") as HTMLDivElement;
    const progressEl = document.getElementById("progress") as HTMLDivElement;
    const totalSeconds = item.workSeconds;
    const nameEl = document.getElementById("exerciseName") as HTMLDivElement;
    nameEl?.addEventListener("click", () => showPreview(item.exercise.name));

    // shared timer tick logic
    const tick = () => {
      remainingSessionSeconds--;
      remainingSeconds--;

      const safeSeconds = Math.max(remainingSeconds, 0);
      const progressPercent = (safeSeconds / totalSeconds) * 100;
      if (progressEl) progressEl.style.width = `${progressPercent}%`;

      // last 3 sec countdown effect
      if (remainingSeconds <= 3 && remainingSeconds > 0) {
        playBeep();
        timerEl.style.color = "#e53935";
        timerEl.style.transform = "scale(1.15)";
        timerEl.style.textShadow = "0 0 10px rgba(229,57,53,0.6)";
      } else {
        timerEl.style.color = "#cccccc";
        timerEl.style.transform = "scale(1.02)";
        timerEl.style.textShadow = "none";
        setTimeout(() => {
          timerEl.style.transform = "scale(1)";
        }, 120);
      }

      timerEl.textContent = `${Math.max(remainingSeconds, 0)}s`;
      timerEl.style.transition = "all 0.3s cubic-bezier(0.4, 0, 0.2, 1)";

      const sessionEl = document.getElementById("sessionTimer") as HTMLDivElement;
      if (sessionEl) {
        const mins = Math.floor(remainingSessionSeconds / 60);
        const secs = remainingSessionSeconds % 60;
        sessionEl.textContent = `${mins}:${secs.toString().padStart(2, "0")} remaining`;
      }

      if (remainingSeconds <= 0) {
        playBeep();
        clearInterval(timerId!);
        timerId = undefined;

        currentIndex++;

        if (currentIndex >= currentSession!.exercises.length) {
          if (currentRound >= currentSession!.rounds) {
            if (skipsCount === 0) {
              difficultyOffset = Math.max(difficultyOffset - 2, -10);
            } else {
              difficultyOffset = Math.min(difficultyOffset + 2, 10);
            }

            playCompletionSignal();

            setTimeout(() => {
              output.innerHTML = `
                <div class="complete">
                  <div class="complete-title">Session Complete</div>
                  <div class="complete-sub">You showed up.</div>
                  <div class="secondary">
                    <button id="restartBtn">Restart</button>
                    <button id="newBtn">New Workout</button>
                  </div>
                </div>
              `;
              output.classList.remove("show");
              output.classList.add("fade-in");
              setTimeout(() => output.classList.add("show"), 10);

              bindCompletionActions();
              const completeEl = document.querySelector(".complete");
              completeEl?.classList.add("show");
            }, 300);
            return;
          }

          currentRound++;
          currentIndex = 0;
          isResting = true;
          renderCurrent();
          return;
        }

        renderCurrent();
      }
    };

    // auto-start timer
    if (timerId) {
      clearInterval(timerId);
      timerId = undefined;
    }

    timerId = window.setInterval(tick, 1000);

    pauseBtn.addEventListener("click", () => {
      pauseBtn.disabled = true;
      setTimeout(() => (pauseBtn.disabled = false), 300);

      if (!isPaused && !timerId) return;

      const appContainer = document.querySelector(".app");

      if (!isPaused) {
        clearInterval(timerId);
        timerId = undefined;
        isPaused = true;
        pauseBtn.textContent = "Resume";
        appContainer?.classList.add("paused");
      } else {
        isPaused = false;
        pauseBtn.textContent = "Pause";
        appContainer?.classList.remove("paused");

        // immediate tick
        tick();

        // start interval
        timerId = window.setInterval(tick, 1000);
      }
    });

    nextBtn.addEventListener("click", () => {
      nextBtn.disabled = true;
      setTimeout(() => (nextBtn.disabled = false), 300);

      skipsCount++;
      if (timerId) {
        clearInterval(timerId);
        timerId = undefined;
      }
      currentIndex++;

      if (currentIndex >= currentSession!.exercises.length) {
        if (currentRound >= currentSession!.rounds) {
          // adaptive difficulty update
          if (skipsCount === 0) {
            difficultyOffset = Math.max(difficultyOffset - 2, -10);
          } else {
            difficultyOffset = Math.min(difficultyOffset + 2, 10);
          }

          playCompletionSignal();

          setTimeout(() => {
            output.innerHTML = `
              <div class="complete">
                <div class="complete-title">Session Complete</div>
                <div class="complete-sub">You showed up.</div>
                <div class="secondary">
                  <button id="restartBtn">Restart</button>
                  <button id="newBtn">New Workout</button>
                </div>
              </div>
            `;
            output.classList.remove("show");
            output.classList.add("fade-in");
            setTimeout(() => output.classList.add("show"), 10);

            bindCompletionActions();
            const completeEl = document.querySelector(".complete");
            completeEl?.classList.add("show");
          }, 300);
          return;
        }

        currentRound++;
        currentIndex = 0;
        isResting = true;
        renderCurrent();
        return;
      }

      renderCurrent();
    });
  };

  emergencyBtn.addEventListener("click", () => {
    if (navigator.vibrate) {
      navigator.vibrate(30);
    }
    runSession(15);
  });
  btn25.addEventListener("click", () => runSession(25));
  btn40.addEventListener("click", () => runSession(40));

  const installBtn = document.getElementById("installBtn") as HTMLButtonElement;

  installBtn?.addEventListener("click", () => {
    if (!installAvailable) return;
    (window as any).triggerInstall?.();
  });
}

console.log("RepDeck UI ready");
// About screen renderer
const showAbout = () => {
  const output = document.getElementById("output") as HTMLDivElement;
  if (!output) return;

  const overlay = document.createElement("div");
  overlay.className = "about-overlay";

  overlay.innerHTML = `
    <div class="about-card">
      <div class="exercise-name">About</div>
      <div class="meta">
        RepDeck is built for the moments when routine breaks.<br/><br/>
        No setup. No thinking.<br/>
        Just show up and move.<br/><br/>
        — A StillMind Labs creation
      </div>
      <button id="closeAbout">Close</button>
    </div>
  `;

  document.body.appendChild(overlay);

  const close = () => overlay.remove();
  overlay.addEventListener("click", (e) => {
    if (e.target === overlay) close();
  });
  (overlay.querySelector("#closeAbout") as HTMLButtonElement).onclick = close;
};