// Preview overlay with VIDEO support
export function showPreviewOverlay(exercise: any) {
  const overlay = document.createElement("div");
  overlay.className = "overlay";

  overlay.style.position = "fixed";
  overlay.style.top = "0";
  overlay.style.left = "0";
  overlay.style.width = "100vw";
  overlay.style.height = "100dvh";
  overlay.style.background = "rgba(0,0,0,0.85)";
  overlay.style.zIndex = "9999";
  overlay.style.display = "flex";
  overlay.style.alignItems = "center";
  overlay.style.justifyContent = "center";

  const videoSrc = `/assets/exercises/${exercise.id}.mp4`;

  const mediaHTML = `
    <video
      src="${videoSrc}"
      autoplay
      loop
      muted
      playsinline
      controls
      style="width:280px; border-radius:12px; margin-bottom:10px;"
    ></video>
  `;

  overlay.innerHTML = `
    <div class="preview-card" style="text-align:center; color:white;">
      ${mediaHTML}
      <div style="font-size:18px; margin-bottom:12px;">${exercise?.name || "Exercise"}</div>
      <button id="closePreview" style="padding:10px 16px; border:none; border-radius:8px;">Close</button>
    </div>
  `;

  const close = () => overlay.remove();

  overlay.onclick = (e: any) => {
    if (e.target === overlay) close();
  };

  document.body.appendChild(overlay);

  const closeBtn = overlay.querySelector("#closePreview");
  if (closeBtn) closeBtn.addEventListener("click", close);
}

// (optional) About overlay unchanged or minimal
export function showAboutOverlay() {
  const overlay = document.createElement("div");
  overlay.className = "overlay";

  // FIX: full screen overlay styling
  overlay.style.position = "fixed";
  overlay.style.top = "0";
  overlay.style.left = "0";
  overlay.style.width = "100vw";
  overlay.style.height = "100dvh";
  overlay.style.background = "rgba(0,0,0,0.85)";
  overlay.style.zIndex = "9999";
  overlay.style.display = "flex";
  overlay.style.alignItems = "center";
  overlay.style.justifyContent = "center";

  overlay.innerHTML = `
    <div style="
      background: rgba(34, 60, 44, 0.55);
      backdrop-filter: blur(12px);
      -webkit-backdrop-filter: blur(12px);
      border: 1px solid rgba(120, 200, 160, 0.15);
      box-shadow: 0 8px 30px rgba(0,0,0,0.4);
      padding:24px;
      border-radius:12px;
      color:white;
      text-align:center;
      max-width:300px;
      width:90%;
    ">
      <div style="font-size:18px; font-weight:600; margin-bottom:12px;">RepDeck</div>

      <div style="font-size:13px; opacity:0.75; line-height:1.7; margin-bottom:16px;">
        A zero-friction workout system for travel days,<br/>
        low energy states, and unpredictable schedules.
      </div>

      <div style="font-size:13px; opacity:0.75; line-height:1.7; margin-bottom:16px; margin-top:6px;">
        Inspired by workouts born inside 6x8 ft American prison cells —<br/>
        minimal space, no equipment, no excuses.
      </div>

      <div style="font-size:13px; opacity:0.75; line-height:1.7; margin-bottom:16px;">
        No planning. No setup.<br/>
        Just start and move.
      </div>

      <div style="font-size:12px; opacity:0.6; margin-bottom:12px;">
        Don’t skip.
      </div>

      <div style="font-size:11px; opacity:0.4; margin-bottom:16px;">
        A StillMind Labs creation
      </div>

      <button id="closeAbout" style="padding:10px 16px; border:none; border-radius:8px;">Close</button>
    </div>
  `;

  document.body.appendChild(overlay);

  const close = () => overlay.remove();
  overlay.addEventListener("click", (e) => {
    if (e.target === overlay) close();
  });

  const closeBtn = overlay.querySelector("#closeAbout");
  if (closeBtn) (closeBtn as HTMLElement).onclick = close;
}
