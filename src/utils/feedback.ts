

// Feedback utilities: sound + haptics

let audioCtx: AudioContext | null = null;

const getAudioCtx = () => {
  if (!audioCtx) {
    audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
  }
  return audioCtx;
};

export const playBeep = (type: "start" | "end" | "normal" = "normal") => {
  const ctx = getAudioCtx();

  const oscillator = ctx.createOscillator();
  const gain = ctx.createGain();

  oscillator.connect(gain);
  gain.connect(ctx.destination);

  // Different tones
  if (type === "start") {
    oscillator.frequency.value = 880;
  } else if (type === "end") {
    oscillator.frequency.value = 440;
  } else {
    oscillator.frequency.value = 660;
  }

  gain.gain.value = 0.1;

  oscillator.start();
  oscillator.stop(ctx.currentTime + 0.1);
};

export const playCompletionSignal = () => {
  // double beep
  setTimeout(() => playBeep("normal"), 100);
  setTimeout(() => playBeep("normal"), 300);

  // haptic
  if (navigator.vibrate) {
    navigator.vibrate([40, 60, 40]);
  }
};

export const triggerHaptic = (pattern: number | number[] = 30) => {
  if (navigator.vibrate) {
    navigator.vibrate(pattern);
  }
};