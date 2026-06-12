const GRID_W = 64;
const GRID_H = 48;
const STEPS_PER_SEC = 8;

const canvas = document.getElementById("stage") as HTMLCanvasElement;
const ctxRaw = canvas.getContext("2d");
if (!ctxRaw) throw new Error("2d context unavailable");
const ctx: CanvasRenderingContext2D = ctxRaw;

const playPauseBtn = document.getElementById("play-pause")!;
const stepBtn = document.getElementById("step")!;
const randomBtn = document.getElementById("randomize")!;
const clearBtn = document.getElementById("clear")!;
const genEl = document.getElementById("gen")!;

const DPR = Math.min(window.devicePixelRatio || 1, 2);

let cellW = 0;
let cellH = 0;
let padX = 0;
let padY = 0;

const a = new Uint8Array(GRID_W * GRID_H);
const b = new Uint8Array(GRID_W * GRID_H);
let cur = a;
let next = b;

let generation = 0;
let playing = false;
let stepAccumMs = 0;
let lastFrame = performance.now();

const CANVAS_BG = "#f8f9fa";
const GRID_LINE = "#dadce0";
const ALIVE = "#1a73e8";

function idx(x: number, y: number): number {
  return y * GRID_W + x;
}

function countNeighbors(x: number, y: number): number {
  let n = 0;
  for (let dy = -1; dy <= 1; dy++) {
    const yy = y + dy;
    if (yy < 0 || yy >= GRID_H) continue;
    for (let dx = -1; dx <= 1; dx++) {
      if (dx === 0 && dy === 0) continue;
      const xx = x + dx;
      if (xx < 0 || xx >= GRID_W) continue;
      n += cur[idx(xx, yy)] ?? 0;
    }
  }
  return n;
}

function evolve(): void {
  for (let y = 0; y < GRID_H; y++) {
    for (let x = 0; x < GRID_W; x++) {
      const i = idx(x, y);
      const n = countNeighbors(x, y);
      const alive = cur[i] !== 0;
      if (alive) {
        next[i] = n === 2 || n === 3 ? 1 : 0;
      } else {
        next[i] = n === 3 ? 1 : 0;
      }
    }
  }
  const tmp = cur;
  cur = next;
  next = tmp;
  generation++;
  genEl.textContent = String(generation);
}

function randomize(density = 0.28): void {
  for (let i = 0; i < cur.length; i++) {
    cur[i] = Math.random() < density ? 1 : 0;
  }
  next.fill(0);
  generation = 0;
  genEl.textContent = "0";
}

function clearGrid(): void {
  cur.fill(0);
  next.fill(0);
  generation = 0;
  genEl.textContent = "0";
}

function resize(): void {
  const w = window.innerWidth;
  const h = window.innerHeight;
  canvas.width = Math.floor(w * DPR);
  canvas.height = Math.floor(h * DPR);
  canvas.style.width = `${w}px`;
  canvas.style.height = `${h}px`;
  ctx.setTransform(DPR, 0, 0, DPR, 0, 0);

  cellW = w / GRID_W;
  cellH = h / GRID_H;
  const uniform = Math.min(cellW, cellH);
  cellW = uniform;
  cellH = uniform;
  padX = (w - GRID_W * cellW) / 2;
  padY = (h - GRID_H * cellH) / 2;
}

function cellFromClient(clientX: number, clientY: number): { x: number; y: number } | null {
  const r = canvas.getBoundingClientRect();
  const x = clientX - r.left;
  const y = clientY - r.top;
  const gx = Math.floor((x - padX) / cellW);
  const gy = Math.floor((y - padY) / cellH);
  if (gx < 0 || gx >= GRID_W || gy < 0 || gy >= GRID_H) return null;
  return { x: gx, y: gy };
}

let dragMode: "paint" | "erase" | null = null;
let lastPaintKey = "";

function paintCell(gx: number, gy: number, mode: "paint" | "erase"): void {
  const i = idx(gx, gy);
  cur[i] = mode === "paint" ? 1 : 0;
}

function onPointerDown(ev: PointerEvent): void {
  const c = cellFromClient(ev.clientX, ev.clientY);
  if (!c) {
    dragMode = null;
    return;
  }
  canvas.setPointerCapture(ev.pointerId);
  const i = idx(c.x, c.y);
  const wasAlive = cur[i] !== 0;
  dragMode = wasAlive ? "erase" : "paint";
  paintCell(c.x, c.y, dragMode);
  lastPaintKey = `${c.x},${c.y}`;
}

function onPointerMove(ev: PointerEvent): void {
  if (dragMode === null) return;
  const c = cellFromClient(ev.clientX, ev.clientY);
  if (!c) return;
  const key = `${c.x},${c.y}`;
  if (key === lastPaintKey) return;
  lastPaintKey = key;
  paintCell(c.x, c.y, dragMode);
}

function onPointerUp(ev: PointerEvent): void {
  if (canvas.hasPointerCapture(ev.pointerId)) {
    canvas.releasePointerCapture(ev.pointerId);
  }
  dragMode = null;
  lastPaintKey = "";
}

function draw(): void {
  const w = window.innerWidth;
  const h = window.innerHeight;
  ctx.fillStyle = CANVAS_BG;
  ctx.fillRect(0, 0, w, h);

  ctx.strokeStyle = GRID_LINE;
  ctx.lineWidth = 1;
  ctx.beginPath();
  for (let x = 0; x <= GRID_W; x++) {
    const px = padX + x * cellW;
    ctx.moveTo(px + 0.5, padY);
    ctx.lineTo(px + 0.5, padY + GRID_H * cellH);
  }
  for (let y = 0; y <= GRID_H; y++) {
    const py = padY + y * cellH;
    ctx.moveTo(padX, py + 0.5);
    ctx.lineTo(padX + GRID_W * cellW, py + 0.5);
  }
  ctx.stroke();

  ctx.fillStyle = ALIVE;
  for (let y = 0; y < GRID_H; y++) {
    for (let x = 0; x < GRID_W; x++) {
      if (cur[idx(x, y)]) {
        ctx.fillRect(padX + x * cellW + 0.5, padY + y * cellH + 0.5, cellW - 1, cellH - 1);
      }
    }
  }
}

function setPlaying(value: boolean): void {
  playing = value;
  playPauseBtn.textContent = playing ? "Pause" : "Play";
  stepBtn.toggleAttribute("disabled", playing);
  stepAccumMs = 0;
  lastFrame = performance.now();
}

function loop(now: number): void {
  const dt = now - lastFrame;
  lastFrame = now;

  if (playing) {
    stepAccumMs += dt;
    const stepMs = 1000 / STEPS_PER_SEC;
    while (stepAccumMs >= stepMs) {
      stepAccumMs -= stepMs;
      evolve();
    }
  }

  draw();
  requestAnimationFrame(loop);
}

playPauseBtn.addEventListener("click", () => setPlaying(!playing));
stepBtn.addEventListener("click", () => evolve());
randomBtn.addEventListener("click", () => randomize());
clearBtn.addEventListener("click", () => clearGrid());

canvas.addEventListener("pointerdown", onPointerDown);
canvas.addEventListener("pointermove", onPointerMove);
canvas.addEventListener("pointerup", onPointerUp);
canvas.addEventListener("pointercancel", onPointerUp);

window.addEventListener("keydown", (ev) => {
  if (ev.code === "Space" && !(ev.target instanceof HTMLButtonElement)) {
    ev.preventDefault();
    setPlaying(!playing);
  }
});

window.addEventListener("resize", resize);
resize();
randomize();
setPlaying(false);
requestAnimationFrame(loop);
