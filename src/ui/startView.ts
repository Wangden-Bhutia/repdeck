interface StartViewOptions {
  noFloor?: boolean;
  lowNoise?: boolean;
  avoidKnee?: boolean;
  avoidShoulder?: boolean;
  selectedDuration?: 15 | 25 | 40 | null;
  completedSessions?: number;
  lastFeedback?: string | null;
}

export function renderStartView(options: StartViewOptions = {}): string {
  const {
    selectedDuration = null,
    completedSessions = 0,
    lastFeedback = null,
  } = options;

  const memoryText =
    completedSessions > 0
      ? `Adaptive • ${completedSessions} Session${
          completedSessions === 1 ? "" : "s"
        }${lastFeedback ? ` • Felt ${lastFeedback}` : ""}`
      : "Adapts intensity quietly after each workout";

  return `
<div class="app">
  <div class="main-card">

    <div class="top" style="display:flex; flex-direction:column; align-items:center; gap:14px;">

      <div class="header" style="position:relative; width:100%;">
        <h2 class="title" style="text-align:center; width:100%;">RepDeck</h2>
        <div id="aboutTrigger" class="about" style="position:absolute; right:0; top:58%; transform:translateY(-50%); font-size:10px; opacity:0.5;">About</div>
      </div>

      <div class="style-block">
        <div class="style-options" id="styleOptions">
          <button class="style-chip" data-style="low_noise">
            <div style="display:flex; justify-content:center; align-items:center; gap:0; width:100%;">
              <span>Low Noise</span>
            </div>
            <div style="font-size:8px; opacity:0.6; text-align:center; width:100%; margin-top:4px;">No jumps</div>
          </button>
          <button class="style-chip" data-style="no_floor">
            <div style="display:flex; justify-content:center; align-items:center; gap:0; width:100%;">
              <span>No Floor</span>
            </div>
            <div style="font-size:8px; opacity:0.6; text-align:center; width:100%; margin-top:4px;">Standing only</div>
          </button>
        </div>
      </div>

    </div>

    <div class="flex-spacer"></div>

    <div class="center">
      <button id="start15" class="emergency-btn">
        <div class="primary" style="font-size:20px; letter-spacing:1px;">START</div>
        <div class="secondary">${selectedDuration ? `${selectedDuration} min` : ""}</div>
      </button>
    </div>

    <div class="flex-spacer"></div>

    <div class="bottom" style="gap:6px;">
      <div class="duration-block">
        <div class="duration-options">
          <button class="duration-chip ${selectedDuration === 15 ? "active" : ""}" data-duration="15">15m</button>
          <button class="duration-chip ${selectedDuration === 25 ? "active" : ""}" data-duration="25">25m</button>
          <button class="duration-chip ${selectedDuration === 40 ? "active" : ""}" data-duration="40">40m</button>
        </div>
      </div>

      <div class="profile-note" style="font-size:11px; opacity:0.65; text-align:center; max-width:240px;">${memoryText}</div>

      <button id="installBtn" class="install-btn">
        Install App
      </button>
    </div>

    <div id="output"></div>

  </div>
</div>
`;
}