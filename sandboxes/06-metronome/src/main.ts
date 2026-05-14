const toggleBtn = document.getElementById("toggle")!;
const bpmRange = document.getElementById("bpm-range") as HTMLInputElement;
const bpmInput = document.getElementById("bpm-input") as HTMLInputElement;
const bpmLabel = document.getElementById("bpm-label")!;
const beatsSelect = document.getElementById("beats") as HTMLSelectElement;
const accentCheckbox = document.getElementById("accent") as HTMLInputElement;
const beatDisplay = document.getElementById("beat-display")!;
const pendulum = document.getElementById("pendulum")!;
const statusEl = document.getElementById("status")!;

const BPM_MIN = 30;
const BPM_MAX = 400;
const LOOKAHEAD_SEC = 0.12;
const SCHEDULER_MS = 25;

let audioCtx: AudioContext | null = null;

let isRunning = false;
let beatIndex = 0;
let nextBeatTime = 0;
let schedulerTimer = 0;

function clamp(n: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, n));
}

function getBpm(): number {
  const n = Number.parseInt(bpmInput.value, 10);
  if (Number.isNaN(n)) return 120;
  return clamp(n, BPM_MIN, BPM_MAX);
}

function setBpm(n: number): void {
  const v = Math.round(clamp(n, BPM_MIN, BPM_MAX));
  bpmInput.value = String(v);
  bpmRange.value = String(v);
  bpmLabel.textContent = String(v);
}

function ensureContext(): AudioContext {
  if (!audioCtx) audioCtx = new AudioContext();
  return audioCtx;
}

function playClick(when: number, accent: boolean): void {
  const ctx = ensureContext();
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.connect(gain);
  gain.connect(ctx.destination);

  osc.type = "sine";
  const f0 = accent ? 1560 : 920;
  osc.frequency.setValueAtTime(f0, when);
  const peak = accent ? 0.38 : 0.22;
  const g0 = 0.0001;
  gain.gain.setValueAtTime(g0, when);
  gain.gain.linearRampToValueAtTime(peak, when + 0.002);
  gain.gain.exponentialRampToValueAtTime(g0, when + 0.055);

  osc.start(when);
  osc.stop(when + 0.06);
}

function scheduleFlash(when: number, displayBeat: number, perBar: number): void {
  const ctx = ensureContext();
  const delayMs = (when - ctx.currentTime) * 1000;
  window.setTimeout(
    () => {
      beatDisplay.textContent = `Beat ${displayBeat} of ${perBar}`;
      pendulum.classList.add("is-flash");
      window.setTimeout(() => pendulum.classList.remove("is-flash"), 70);
    },
    Math.max(0, delayMs),
  );
}

function scheduleAhead(): void {
  if (!isRunning || !audioCtx) return;

  const bpm = getBpm();
  const secPerBeat = 60 / bpm;
  const perBar = clamp(Number.parseInt(beatsSelect.value, 10) || 4, 2, 8);
  const useAccent = accentCheckbox.checked;

  while (nextBeatTime < audioCtx.currentTime + LOOKAHEAD_SEC) {
    const inBar = beatIndex % perBar;
    const isDownbeat = inBar === 0;
    const accent = useAccent && isDownbeat;
    playClick(nextBeatTime, accent);
    scheduleFlash(nextBeatTime, inBar + 1, perBar);
    nextBeatTime += secPerBeat;
    beatIndex += 1;
  }

  schedulerTimer = window.setTimeout(scheduleAhead, SCHEDULER_MS);
}

function start(): void {
  if (isRunning) return;
  const ctx = ensureContext();
  void ctx.resume().catch(() => {
    statusEl.textContent = "Could not start audio — check browser permissions.";
  });

  isRunning = true;
  const now = ctx.currentTime;
  nextBeatTime = now + 0.05;
  beatIndex = 0;
  scheduleAhead();

  toggleBtn.textContent = "Stop";
  toggleBtn.setAttribute("aria-pressed", "true");
  statusEl.textContent = "";
}

function stop(): void {
  if (!isRunning) return;
  isRunning = false;
  window.clearTimeout(schedulerTimer);
  schedulerTimer = 0;
  beatDisplay.textContent = "—";
  pendulum.classList.remove("is-flash");

  toggleBtn.textContent = "Start";
  toggleBtn.setAttribute("aria-pressed", "false");

  void audioCtx?.suspend();
}

function syncRangeFromInput(): void {
  setBpm(getBpm());
}

/** Let Space do its native job in text fields, selects, and checkboxes. */
function shouldPassThroughSpace(target: EventTarget | null): boolean {
  if (!(target instanceof Element)) return false;
  if (target.closest("[contenteditable='true']")) return true;
  if (target instanceof HTMLTextAreaElement) return true;
  if (target instanceof HTMLSelectElement) return true;
  if (target instanceof HTMLInputElement) {
    const type = target.type.toLowerCase();
    if (type === "checkbox" || type === "radio") return true;
    return (
      type === "text" ||
      type === "search" ||
      type === "url" ||
      type === "email" ||
      type === "password" ||
      type === "tel"
    );
  }
  return false;
}

bpmRange.addEventListener("input", () => {
  setBpm(Number.parseInt(bpmRange.value, 10));
});

bpmInput.addEventListener("input", syncRangeFromInput);
bpmInput.addEventListener("change", syncRangeFromInput);

toggleBtn.addEventListener("click", () => {
  if (isRunning) stop();
  else start();
});

window.addEventListener("keydown", (ev) => {
  if (ev.code !== "Space") return;
  if (shouldPassThroughSpace(ev.target)) return;
  ev.preventDefault();
  if (isRunning) stop();
  else start();
});

setBpm(120);
console.log("[06-metronome] ready");
