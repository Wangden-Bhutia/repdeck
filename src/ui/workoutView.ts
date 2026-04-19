export function renderWorkout(params: any) {
  const { output, item, currentExerciseIndex = 0, totalExercises = 1, remainingSeconds, sessionRemaining, sessionProgress, currentRound } = params;
  if (!output || !item) return;

  const name = item?.exercise?.name || "Exercise";
  const progress = Math.round(((currentExerciseIndex + 1) / totalExercises) * 100);

  if (!output.dataset.initialized) {
    output.innerHTML = `
      <div class="workout-container" style="display:flex; justify-content:center; align-items:center; width:100%;">
        <div class="workout-card" style="width:100%; max-width:380px; margin:auto; color:white; text-align:center;">

          <!-- SESSION PROGRESS (drains) -->
          <div style="width:100%; height:4px; background:rgba(255,255,255,0.08); border-radius:2px; overflow:hidden; margin-bottom:6px;">
            <div class="session-progress-inner" style="width:${100 - (sessionProgress || 0)}%; height:100%; background:#4caf50;"></div>
          </div>

          <div class="session-timer" style="font-size:12px; opacity:0.7; margin-bottom:4px;"></div>
          <div class="round-indicator" style="font-size:11px; opacity:0.5; margin-bottom:10px;"></div>

          <!-- EXERCISE PROGRESS (fills) -->
          <div style="width:100%; height:4px; background:rgba(255,255,255,0.1); border-radius:2px; overflow:hidden; margin-bottom:12px;">
            <div class="progress-bar-inner" style="width:${progress}%; height:100%; background:#ff3b30;"></div>
          </div>

          <div class="timer-value" style="font-size:24px; margin-bottom:10px;"></div>

          <div class="exercise-name" style="cursor:pointer; display:flex; flex-direction:column; align-items:center; gap:10px;">
            <div style="width:120px; height:120px; border-radius:12px; overflow:hidden;">
              <video 
                src="/assets/exercises/${item.exercise.id}.mp4" 
                autoplay 
                loop 
                muted 
                playsinline 
                preload="auto"
                style="width:100%; height:100%; object-fit:cover; display:block;">
              </video>
            </div>
            <div class="exercise-title" style="font-size:20px;">${name}</div>
            <div class="exercise-meta" style="font-size:14px; opacity:0.8;"></div>
            <div class="exercise-count" style="font-size:11px; opacity:0.35; letter-spacing:0.3px;">${currentExerciseIndex + 1} / ${totalExercises}</div>
          </div>

          <button id="nextBtn" style="margin-top:16px; max-width:220px; padding:10px; font-size:14px; border:none; border-radius:10px; background:#fff; color:#000; display:block; margin-left:auto; margin-right:auto;">Done</button>

        </div>
      </div>
    `;
    output.dataset.initialized = "true";
  }

  // update exercise progress
  const progressBar = output.querySelector(".progress-bar-inner") as HTMLElement;
  if (progressBar) progressBar.style.width = progress + "%";

  // update timer (exercise)
  const timerEl = output.querySelector(".timer-value");
  if (timerEl && typeof remainingSeconds === "number") {
    timerEl.textContent = remainingSeconds + "s";
  }

  // update name
  const nameEl = output.querySelector(".exercise-title");
  if (nameEl) nameEl.textContent = name;

  // update reps / time
  const metaEl = output.querySelector(".exercise-meta");
  if (metaEl) {
    if (typeof item.duration === "number" && item.duration > 0) {
      metaEl.textContent = `${item.duration}s`;
    } else if (typeof item.reps === "number" && item.reps > 0) {
      metaEl.textContent = `${item.reps} reps`;
    } else if (typeof item.exercise?.reps === "number" && item.exercise.reps > 0) {
      // fallback if reps not propagated correctly
      metaEl.textContent = `${item.exercise.reps} reps`;
    } else {
      metaEl.textContent = "";
    }
  }

  // update count
  const countEl = output.querySelector(".exercise-count");
  if (countEl) countEl.textContent = `${currentExerciseIndex + 1} / ${totalExercises}`;

  // update video
  const videoEl = output.querySelector("video") as HTMLVideoElement;
  const newSrc = `/assets/exercises/${item.exercise.id}.mp4`;
  if (videoEl) {
    videoEl.src = newSrc;
    videoEl.load();
  }

  const exerciseContainer = output.querySelector(".exercise-name") as HTMLElement;
  if (exerciseContainer && !(exerciseContainer as any)._boundClick) {
    exerciseContainer.addEventListener("click", async () => {
      const video = output.querySelector("video") as HTMLVideoElement;
      if (!video) return;

      // create overlay
      const overlay = document.createElement("div");
      overlay.className = "video-overlay";
      overlay.style.position = "fixed";
      overlay.style.top = "0";
      overlay.style.left = "0";
      overlay.style.width = "100%";
      overlay.style.height = "100%";
      overlay.style.display = "flex";
      overlay.style.flexDirection = "column";
      overlay.style.justifyContent = "center";
      overlay.style.alignItems = "center";
      overlay.style.background = "rgba(0,0,0,0.6)";

      const videoWrapper = document.createElement("div");
      videoWrapper.className = "video-overlay-inner";

      const clone = video.cloneNode(true) as HTMLVideoElement;
      clone.muted = true;
      clone.autoplay = true;
      clone.loop = true;
      clone.controls = false;

      videoWrapper.appendChild(clone);

      overlay.appendChild(videoWrapper);
      document.body.appendChild(overlay);

      // play video
      try {
        await clone.play();
      } catch (e) {}

      // optional: still allow outside tap to close
      overlay.addEventListener("click", () => {
        overlay.remove();
      });
    });
    (exerciseContainer as any)._boundClick = true;
  }

  // update session timer (mm:ss)
  if (typeof sessionRemaining === "number") {
    const mins = Math.floor(sessionRemaining / 60);
    const secs = sessionRemaining % 60;
    const formatted = `${mins}:${secs.toString().padStart(2, "0")}`;
    const sessionTimerEl = output.querySelector(".session-timer");
    if (sessionTimerEl) sessionTimerEl.textContent = formatted;
    // update round indicator
    const roundEl = output.querySelector(".round-indicator");
    if (roundEl && typeof currentRound === "number") {
      roundEl.textContent = `Round ${currentRound}`;
    }
  }

  // round transition feedback
  if (currentExerciseIndex === 0 && currentRound > 1) {
    const existing = document.querySelector(".round-transition");
    if (!existing) {
      const transition = document.createElement("div");
      transition.className = "round-transition";

      transition.style.position = "fixed";
      transition.style.top = "0";
      transition.style.left = "0";
      transition.style.width = "100%";
      transition.style.height = "100%";
      transition.style.background = "rgba(0,0,0,0.7)";
      transition.style.display = "flex";
      transition.style.flexDirection = "column";
      transition.style.justifyContent = "center";
      transition.style.alignItems = "center";
      transition.style.zIndex = "1000";
      transition.style.color = "#fff";

      transition.innerHTML = `
        <div style="font-size:22px; font-weight:600; margin-bottom:8px;">Round ${currentRound - 1} Complete</div>
        <div style="font-size:14px; opacity:0.7;">Starting Round ${currentRound}</div>
      `;

      document.body.appendChild(transition);

      setTimeout(() => {
        transition.remove();
      }, 1500);
    }
  }

  // update session bar (drain)
  if (typeof sessionProgress === "number") {
    const sessionBar = output.querySelector(".session-progress-inner") as HTMLElement;
    if (sessionBar) sessionBar.style.width = (100 - sessionProgress) + "%";
  }

  // bind button once
  const btn = output.querySelector("#nextBtn");
  if (btn && !(btn as any)._bound) {
    btn.addEventListener("click", () => {
      window.dispatchEvent(new CustomEvent("workout:skip"));
    });
    (btn as any)._bound = true;
  }
}

export function renderWorkoutComplete(output: HTMLElement) {
  output.innerHTML = `
    <div class="completion-container">
      <div class="workout-card" style="display:flex;flex-direction:column;align-items:center;text-align:center;gap:16px;">
        <div style="font-size:28px;font-weight:700;">Session Complete</div>
        <div style="opacity:0.8;">You didn’t skip today</div>
        <button id="homeBtn" class="secondary-btn">Home</button>
      </div>
    </div>
  `;
}