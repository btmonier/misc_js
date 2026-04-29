interface Ball {
  x: number;
  y: number;
  vx: number;
  vy: number;
  r: number;
  hue: number;
}

const canvas = document.getElementById("stage") as HTMLCanvasElement;
const ctx = canvas.getContext("2d");
if (!ctx) throw new Error("2d context unavailable");

const countEl = document.getElementById("count")!;
const fpsEl = document.getElementById("fps")!;
const addBtn = document.getElementById("add")!;
const resetBtn = document.getElementById("reset")!;

const balls: Ball[] = [];
const DPR = Math.min(window.devicePixelRatio || 1, 2);

function resize() {
  const w = window.innerWidth;
  const h = window.innerHeight;
  canvas.width = Math.floor(w * DPR);
  canvas.height = Math.floor(h * DPR);
  canvas.style.width = `${w}px`;
  canvas.style.height = `${h}px`;
  ctx!.setTransform(DPR, 0, 0, DPR, 0, 0);
}

function spawn(n: number) {
  const w = window.innerWidth;
  const h = window.innerHeight;
  for (let i = 0; i < n; i++) {
    const r = 6 + Math.random() * 18;
    balls.push({
      x: r + Math.random() * (w - 2 * r),
      y: r + Math.random() * (h - 2 * r),
      vx: (Math.random() - 0.5) * 360,
      vy: (Math.random() - 0.5) * 360,
      r,
      hue: Math.floor(Math.random() * 360),
    });
  }
  countEl.textContent = String(balls.length);
}

function step(dt: number) {
  const w = window.innerWidth;
  const h = window.innerHeight;
  for (const b of balls) {
    b.x += b.vx * dt;
    b.y += b.vy * dt;
    if (b.x - b.r < 0) {
      b.x = b.r;
      b.vx *= -1;
    }
    if (b.x + b.r > w) {
      b.x = w - b.r;
      b.vx *= -1;
    }
    if (b.y - b.r < 0) {
      b.y = b.r;
      b.vy *= -1;
    }
    if (b.y + b.r > h) {
      b.y = h - b.r;
      b.vy *= -1;
    }
  }
}

function draw() {
  const w = window.innerWidth;
  const h = window.innerHeight;
  ctx!.clearRect(0, 0, w, h);
  for (const b of balls) {
    ctx!.beginPath();
    ctx!.arc(b.x, b.y, b.r, 0, Math.PI * 2);
    ctx!.fillStyle = `hsl(${b.hue} 80% 60% / 0.85)`;
    ctx!.fill();
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
  balls.length = 0;
  countEl.textContent = "0";
});

window.addEventListener("resize", resize);
resize();
spawn(25);
requestAnimationFrame(loop);
