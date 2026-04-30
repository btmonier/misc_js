import charsUrl from "./assets/chars.png";

interface Sprite {
  x: number;
  y: number;
  vx: number;
  vy: number;
  /** Last movement octant (0=E … 7=NE); used when nearly still. */
  lastOct: number;
  animTime: number;
}

/** Source tile size in the sheet (first row, columns 0–7). */
const FRAME_PX = 16;
/** Source columns are limited to 0–7 (first row, first eight cells). */
const MAX_COL = 7;

const canvas = document.getElementById("stage") as HTMLCanvasElement;
const ctx = canvas.getContext("2d");
if (!ctx) throw new Error("2d context unavailable");

const countEl = document.getElementById("count")!;
const fpsEl = document.getElementById("fps")!;
const addBtn = document.getElementById("add")!;
const resetBtn = document.getElementById("reset")!;

const sprites: Sprite[] = [];
const DPR = Math.min(window.devicePixelRatio || 1, 2);
/** CSS pixels per source pixel when drawing each 16×16 frame. */
const DRAW_SCALE = 2;

let sheet: HTMLImageElement | null = null;
const halfDraw = (FRAME_PX * DRAW_SCALE) / 2;

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error(`failed to load ${src}`));
    img.src = src;
  });
}

function resize() {
  const w = window.innerWidth;
  const h = window.innerHeight;
  canvas.width = Math.floor(w * DPR);
  canvas.height = Math.floor(h * DPR);
  canvas.style.width = `${w}px`;
  canvas.style.height = `${h}px`;
  ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
  // Setting canvas.width/height resets the entire context state, so this must
  // be re-applied here. Nearest-neighbor keeps the 16×16 art crisp when scaled.
  ctx.imageSmoothingEnabled = false;
}

function spawn(n: number) {
  const w = window.innerWidth;
  const h = window.innerHeight;
  for (let i = 0; i < n; i++) {
    sprites.push({
      x: halfDraw + Math.random() * (w - 2 * halfDraw),
      y: halfDraw + Math.random() * (h - 2 * halfDraw),
      vx: (Math.random() - 0.5) * 280,
      vy: (Math.random() - 0.5) * 280,
      lastOct: 2,
      animTime: Math.random() * 10,
    });
  }
  countEl.textContent = String(sprites.length);
}

/** Movement octant from velocity: E, SE, S, SW, W, NW, N, NE. */
function octantFromVelocity(vx: number, vy: number): number | null {
  const speed = Math.hypot(vx, vy);
  if (speed < 12) return null;
  const a = Math.atan2(vy, vx);
  const t = ((a % (Math.PI * 2)) + Math.PI * 2) % (Math.PI * 2);
  return Math.floor((t + Math.PI / 8) / (Math.PI / 4)) % 8;
}

type AnimSpec = { readonly cols: readonly number[]; flipX: boolean; flipY: boolean };

// The sheet's first 8 columns only contain SOUTH-facing frames (cols 0–6) and a
// WEST idle (col 7). There is no north-facing art, so we never flip vertically —
// flipY makes the character literally upside down. For up/diagonal-up movement we
// just keep the south-facing pose ("faces camera"), and mirror horizontally to get
// the east side from the west idle.
//
// Pure E/W have no walk cycle in the first 8 columns (only the col-7 idle), so
// using them moving would show a single frozen frame. The SW walk strip (cols
// 5–6) doubles as the walking-leftward animation; we reuse it for W, and mirror
// it horizontally for E, accepting a slight south-lean when moving horizontally.
function animSpecForOctant(o: number): AnimSpec {
  switch (o) {
    case 0:
      return { cols: [5, 6], flipX: true, flipY: false };
    case 1:
      return { cols: [0, 1, 2], flipX: false, flipY: false };
    case 2:
      return { cols: [3, 4], flipX: false, flipY: false };
    case 3:
      return { cols: [5, 6], flipX: false, flipY: false };
    case 4:
      return { cols: [5, 6], flipX: false, flipY: false };
    case 5:
      return { cols: [5, 6], flipX: false, flipY: false };
    case 6:
      return { cols: [3, 4], flipX: false, flipY: false };
    case 7:
      return { cols: [0, 1, 2], flipX: false, flipY: false };
    default:
      return { cols: [3, 4], flipX: false, flipY: false };
  }
}

function pickColumn(spec: AnimSpec, moving: boolean, animTime: number): number {
  const cols = spec.cols;
  if (!moving || cols.length === 1) return cols[0] ?? 0;
  const step = Math.floor(animTime * 9) % cols.length;
  const c = cols[step];
  if (c === undefined || c > MAX_COL) return cols[0] ?? 0;
  return c;
}

function drawSprite(
  img: HTMLImageElement,
  col: number,
  destX: number,
  destY: number,
  flipX: boolean,
  flipY: boolean,
) {
  const sx = col * FRAME_PX;
  const sy = 0;
  const dw = FRAME_PX * DRAW_SCALE;
  const dh = FRAME_PX * DRAW_SCALE;
  ctx.save();
  ctx.translate(destX, destY);
  ctx.scale(flipX ? -1 : 1, flipY ? -1 : 1);
  ctx.drawImage(img, sx, sy, FRAME_PX, FRAME_PX, -dw / 2, -dh / 2, dw, dh);
  ctx.restore();
}

function step(dt: number) {
  const w = window.innerWidth;
  const h = window.innerHeight;
  for (const s of sprites) {
    s.x += s.vx * dt;
    s.y += s.vy * dt;
    if (s.x - halfDraw < 0) {
      s.x = halfDraw;
      s.vx *= -1;
    }
    if (s.x + halfDraw > w) {
      s.x = w - halfDraw;
      s.vx *= -1;
    }
    if (s.y - halfDraw < 0) {
      s.y = halfDraw;
      s.vy *= -1;
    }
    if (s.y + halfDraw > h) {
      s.y = h - halfDraw;
      s.vy *= -1;
    }
    const oct = octantFromVelocity(s.vx, s.vy);
    if (oct !== null) s.lastOct = oct;
    s.animTime += dt;
  }
}

function draw() {
  const w = window.innerWidth;
  const h = window.innerHeight;
  ctx.clearRect(0, 0, w, h);
  const img = sheet;
  if (!img) return;
  for (const s of sprites) {
    const oct = octantFromVelocity(s.vx, s.vy);
    const useOct = oct ?? s.lastOct;
    const spec = animSpecForOctant(useOct);
    const moving = oct !== null;
    const col = pickColumn(spec, moving, s.animTime);
    drawSprite(img, col, s.x, s.y, spec.flipX, spec.flipY);
  }
}

let last = performance.now();
let fpsAcc = 0;
let fpsFrames = 0;
let fpsClock = last;

function loop(now: number) {
  const dt = Math.min((now - last) / 1000, 0.05);
  last = now;
  fpsFrames++;
  fpsAcc += dt;
  if (now - fpsClock >= 500) {
    fpsEl.textContent = String(Math.round(fpsFrames / fpsAcc));
    fpsAcc = 0;
    fpsFrames = 0;
    fpsClock = now;
  }
  step(dt);
  draw();
  requestAnimationFrame(loop);
}

addBtn.addEventListener("click", () => spawn(10));
resetBtn.addEventListener("click", () => {
  sprites.length = 0;
  countEl.textContent = "0";
});

window.addEventListener("resize", resize);

void (async () => {
  sheet = await loadImage(charsUrl);
  resize();
  spawn(25);
  requestAnimationFrame(loop);
})();
