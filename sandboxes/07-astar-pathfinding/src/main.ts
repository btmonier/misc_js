import charsUrl from "../../03-sprites/src/assets/chars.png";
import { mountTileEditor } from "./tile-editor";

const GRID_W = 48;
const GRID_H = 36;

const canvas = document.getElementById("stage") as HTMLCanvasElement;
const ctxRaw = canvas.getContext("2d");
if (!ctxRaw) throw new Error("2d context unavailable");
const ctx: CanvasRenderingContext2D = ctxRaw;

const randomBtn = document.getElementById("randomize")!;
const clearBtn = document.getElementById("clear")!;
const pathLenEl = document.getElementById("path-len")!;
const exploredEl = document.getElementById("explored")!;
const statusEl = document.getElementById("status")!;
const tileEditorRoot = document.getElementById("tile-editor")!;

const DPR = Math.min(window.devicePixelRatio || 1, 2);
const FRAME_PX = 16;
const MAX_COL = 7;
const MOVE_SPEED = 140;

type Cell = { readonly x: number; readonly y: number };

type PathResult = {
  path: Cell[];
  closed: Cell[];
};

type AnimSpec = { readonly cols: readonly number[]; flipX: boolean; flipY: boolean };

const TILE_WALKABLE = 0;
const TILE_UNWALKABLE = 1;

const tileEditor = mountTileEditor(tileEditorRoot, {
  walkableValue: TILE_WALKABLE,
  unwalkableValue: TILE_UNWALKABLE,
});

const MAP_CENTER: Cell = { x: Math.floor(GRID_W / 2), y: Math.floor(GRID_H / 2) };

const tiles = new Uint8Array(GRID_W * GRID_H);
let spriteCell: Cell = { ...MAP_CENTER };
let goal: Cell | null = null;

let cellW = 0;
let cellH = 0;
let padX = 0;
let padY = 0;

let path: Cell[] = [];
let explored: Cell[] = [];
let pathIndex = 0;
let spriteX = 0;
let spriteY = 0;
let vx = 0;
let vy = 0;
let lastOct = 2;
let animTime = 0;
let spriteSelected = false;
let selectionPulse = 0;
let editDrag = false;
let editStrokeChanged = false;
let lastEditKey = "";

let sheet: HTMLImageElement | null = null;
let lastFrame = performance.now();

function idx(x: number, y: number): number {
  return y * GRID_W + x;
}

function inBounds(x: number, y: number): boolean {
  return x >= 0 && x < GRID_W && y >= 0 && y < GRID_H;
}

function isBorder(x: number, y: number): boolean {
  return x === 0 || y === 0 || x === GRID_W - 1 || y === GRID_H - 1;
}

function isPlayable(x: number, y: number): boolean {
  return inBounds(x, y) && !isBorder(x, y);
}

function cellCenter(c: Cell): { x: number; y: number } {
  return {
    x: padX + (c.x + 0.5) * cellW,
    y: padY + (c.y + 0.5) * cellH,
  };
}

function heuristic(a: Cell, b: Cell): number {
  return Math.abs(a.x - b.x) + Math.abs(a.y - b.y);
}

function isWalkable(x: number, y: number): boolean {
  if (!inBounds(x, y)) return false;
  return tiles[idx(x, y)] === TILE_WALKABLE;
}

function applyBorder(): void {
  for (let y = 0; y < GRID_H; y++) {
    for (let x = 0; x < GRID_W; x++) {
      if (isBorder(x, y)) tiles[idx(x, y)] = TILE_UNWALKABLE;
    }
  }
}

function clearPathPreview(): void {
  path = [];
  explored = [];
  pathIndex = 0;
  vx = 0;
  vy = 0;
  pathLenEl.textContent = "—";
  exploredEl.textContent = "—";
}

function updateStatus(): void {
  if (spriteSelected && path.length > 0 && pathIndex < path.length) {
    statusEl.textContent = "walking";
    return;
  }
  if (spriteSelected && path.length > 0 && pathIndex >= path.length) {
    statusEl.textContent = "arrived";
    return;
  }
  if (spriteSelected) {
    statusEl.textContent = "selected";
    return;
  }
  statusEl.textContent = "ready";
}

function clearObstacles(): void {
  for (let y = 1; y < GRID_H - 1; y++) {
    for (let x = 1; x < GRID_W - 1; x++) {
      tiles[idx(x, y)] = TILE_WALKABLE;
    }
  }
  applyBorder();
  if (goal) issueMoveOrder(goal, false);
  else updateStatus();
}

function astar(from: Cell, to: Cell): PathResult | null {
  if (!isWalkable(from.x, from.y) || !isWalkable(to.x, to.y)) return null;

  const open: Array<{ x: number; y: number; f: number }> = [];
  const gScore = new Map<number, number>();
  const cameFrom = new Map<number, Cell>();
  const closedSet = new Set<number>();
  const openSet = new Set<number>();

  const startKey = idx(from.x, from.y);
  gScore.set(startKey, 0);
  open.push({ x: from.x, y: from.y, f: heuristic(from, to) });
  openSet.add(startKey);

  const dirs: readonly Cell[] = [
    { x: 1, y: 0 },
    { x: -1, y: 0 },
    { x: 0, y: 1 },
    { x: 0, y: -1 },
  ];

  while (open.length > 0) {
    let bestIdx = 0;
    for (let i = 1; i < open.length; i++) {
      const candidate = open[i];
      const best = open[bestIdx];
      if (candidate && best && candidate.f < best.f) bestIdx = i;
    }

    const current = open.splice(bestIdx, 1)[0];
    if (!current) break;

    const currentKey = idx(current.x, current.y);
    openSet.delete(currentKey);

    if (current.x === to.x && current.y === to.y) {
      const route: Cell[] = [];
      let cur: Cell | undefined = to;
      while (cur) {
        route.push(cur);
        cur = cameFrom.get(idx(cur.x, cur.y));
      }
      route.reverse();

      const closed: Cell[] = [];
      for (const key of closedSet) {
        closed.push({ x: key % GRID_W, y: Math.floor(key / GRID_W) });
      }
      return { path: route, closed };
    }

    closedSet.add(currentKey);
    const currentG = gScore.get(currentKey) ?? Number.POSITIVE_INFINITY;

    for (const dir of dirs) {
      const nx = current.x + dir.x;
      const ny = current.y + dir.y;
      if (!isWalkable(nx, ny)) continue;

      const neighborKey = idx(nx, ny);
      if (closedSet.has(neighborKey)) continue;

      const tentativeG = currentG + 1;
      const knownG = gScore.get(neighborKey);
      if (knownG !== undefined && tentativeG >= knownG) continue;

      cameFrom.set(neighborKey, { x: current.x, y: current.y });
      gScore.set(neighborKey, tentativeG);
      const f = tentativeG + heuristic({ x: nx, y: ny }, to);

      if (!openSet.has(neighborKey)) {
        open.push({ x: nx, y: ny, f });
        openSet.add(neighborKey);
      } else {
        const existing = open.find((node) => node.x === nx && node.y === ny);
        if (existing) existing.f = f;
      }
    }
  }

  return null;
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error(`failed to load ${src}`));
    img.src = src;
  });
}

function syncSpriteCellFromPixels(): void {
  const gx = Math.floor((spriteX - padX) / cellW);
  const gy = Math.floor((spriteY - padY) / cellH);
  if (isPlayable(gx, gy)) spriteCell = { x: gx, y: gy };
}

function placeSpriteAtCell(cell: Cell): void {
  const center = cellCenter(cell);
  spriteX = center.x;
  spriteY = center.y;
  spriteCell = { x: cell.x, y: cell.y };
}

function beginPath(result: PathResult): void {
  path = result.path;
  explored = result.closed;
  pathLenEl.textContent = String(Math.max(0, path.length - 1));
  exploredEl.textContent = String(explored.length);

  const first = path[0];
  pathIndex =
    first && first.x === spriteCell.x && first.y === spriteCell.y && path.length > 1 ? 1 : 0;
  vx = 0;
  vy = 0;
  updateStatus();
}

function issueMoveOrder(dest: Cell, requireSelection = true): void {
  if (requireSelection && !spriteSelected) return;
  if (!isPlayable(dest.x, dest.y) || !isWalkable(dest.x, dest.y)) return;
  if (dest.x === spriteCell.x && dest.y === spriteCell.y) return;

  syncSpriteCellFromPixels();
  goal = { x: dest.x, y: dest.y };

  const result = astar(spriteCell, goal);
  if (!result) {
    clearPathPreview();
    statusEl.textContent = "no path";
    return;
  }

  beginPath(result);
}

function shuffleCells(cells: Cell[]): void {
  for (let i = cells.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    const tmp = cells[i]!;
    cells[i] = cells[j]!;
    cells[j] = tmp;
  }
}

function randomizeWalls(): void {
  clearObstacles();

  const candidates: Cell[] = [];
  for (let y = 1; y < GRID_H - 1; y++) {
    for (let x = 1; x < GRID_W - 1; x++) {
      if (x === spriteCell.x && y === spriteCell.y) continue;
      if (goal && x === goal.x && y === goal.y) continue;
      candidates.push({ x, y });
    }
  }

  shuffleCells(candidates);

  const playableCells = (GRID_W - 2) * (GRID_H - 2);
  const minTiles = Math.floor(playableCells * 0.02);
  const maxTiles = Math.floor(playableCells * 0.06);
  const tileCount = minTiles + Math.floor(Math.random() * Math.max(1, maxTiles - minTiles + 1));
  const placed = Math.min(tileCount, candidates.length);

  for (let i = 0; i < placed; i++) {
    const cell = candidates[i];
    if (!cell) continue;
    tiles[idx(cell.x, cell.y)] = TILE_UNWALKABLE;
  }

  applyBorder();
  if (goal) issueMoveOrder(goal, false);
  else updateStatus();
}

function resize(): void {
  const w = window.innerWidth;
  const h = window.innerHeight;
  canvas.width = Math.floor(w * DPR);
  canvas.height = Math.floor(h * DPR);
  canvas.style.width = `${w}px`;
  canvas.style.height = `${h}px`;
  ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
  ctx.imageSmoothingEnabled = false;

  cellW = w / GRID_W;
  cellH = h / GRID_H;
  const uniform = Math.min(cellW, cellH);
  cellW = uniform;
  cellH = uniform;
  padX = (w - GRID_W * cellW) / 2;
  padY = (h - GRID_H * cellH) / 2;
  placeSpriteAtCell(spriteCell);
}

function cellFromClient(clientX: number, clientY: number): Cell | null {
  const rect = canvas.getBoundingClientRect();
  const x = clientX - rect.left;
  const y = clientY - rect.top;
  const gx = Math.floor((x - padX) / cellW);
  const gy = Math.floor((y - padY) / cellH);
  if (!inBounds(gx, gy)) return null;
  return { x: gx, y: gy };
}

function hitTestSprite(clientX: number, clientY: number): boolean {
  const rect = canvas.getBoundingClientRect();
  const x = clientX - rect.left;
  const y = clientY - rect.top;
  const halfW = cellW / 2;
  const halfH = cellH / 2;
  return Math.abs(x - spriteX) <= halfW && Math.abs(y - spriteY) <= halfH;
}

function deselectUnit(): void {
  spriteSelected = false;
  updateStatus();
}

function canEditCell(x: number, y: number): boolean {
  if (!isPlayable(x, y)) return false;
  if (x === spriteCell.x && y === spriteCell.y) return false;
  return true;
}

function paintTile(cell: Cell, tileValue: number): boolean {
  if (!canEditCell(cell.x, cell.y)) return false;
  const i = idx(cell.x, cell.y);
  if (tiles[i] === tileValue) return false;
  tiles[i] = tileValue;
  return true;
}

function finishEditStroke(): void {
  if (!editStrokeChanged) return;
  editStrokeChanged = false;
  applyBorder();
  if (goal) issueMoveOrder(goal, false);
  else updateStatus();
}

function syncEditorUi(active: boolean): void {
  canvas.classList.toggle("edit-mode", active);
  if (active) deselectUnit();
}

function onPointerDown(ev: PointerEvent): void {
  if (ev.button === 2) {
    deselectUnit();
    return;
  }
  if (ev.button !== 0) return;

  if (tileEditor.isActive()) {
    const cell = cellFromClient(ev.clientX, ev.clientY);
    if (!cell) return;
    canvas.setPointerCapture(ev.pointerId);
    editDrag = true;
    editStrokeChanged = false;
    if (paintTile(cell, tileEditor.getBrushValue())) editStrokeChanged = true;
    lastEditKey = `${cell.x},${cell.y}`;
    return;
  }

  if (hitTestSprite(ev.clientX, ev.clientY)) {
    spriteSelected = true;
    updateStatus();
    return;
  }

  if (!spriteSelected) return;

  const cell = cellFromClient(ev.clientX, ev.clientY);
  if (!cell || !isPlayable(cell.x, cell.y)) return;
  issueMoveOrder(cell);
}

function onPointerMove(ev: PointerEvent): void {
  if (!editDrag || !tileEditor.isActive()) return;
  const cell = cellFromClient(ev.clientX, ev.clientY);
  if (!cell) return;
  const key = `${cell.x},${cell.y}`;
  if (key === lastEditKey) return;
  lastEditKey = key;
  if (paintTile(cell, tileEditor.getBrushValue())) editStrokeChanged = true;
}

function onPointerUp(ev: PointerEvent): void {
  if (!editDrag) return;
  if (canvas.hasPointerCapture(ev.pointerId)) {
    canvas.releasePointerCapture(ev.pointerId);
  }
  editDrag = false;
  lastEditKey = "";
  finishEditStroke();
}

function octantFromVelocity(svx: number, svy: number): number | null {
  const speed = Math.hypot(svx, svy);
  if (speed < 8) return null;
  const angle = Math.atan2(svy, svx);
  const wrapped = ((angle % (Math.PI * 2)) + Math.PI * 2) % (Math.PI * 2);
  return Math.floor((wrapped + Math.PI / 8) / (Math.PI / 4)) % 8;
}

function animSpecForOctant(o: number): AnimSpec {
  o = (o + 6) % 8;

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
      return { cols: [4, 3], flipX: false, flipY: false };
    case 7:
      return { cols: [0, 1, 2], flipX: false, flipY: false };
    default:
      return { cols: [3, 4], flipX: false, flipY: false };
  }
}

function pickColumn(spec: AnimSpec, moving: boolean, time: number): number {
  const cols = spec.cols;
  if (!moving || cols.length === 1) return cols[0] ?? 0;
  const step = Math.floor(time * 9) % cols.length;
  const col = cols[step];
  if (col === undefined || col > MAX_COL) return cols[0] ?? 0;
  return col;
}

function drawSprite(
  img: HTMLImageElement,
  col: number,
  destX: number,
  destY: number,
  flipX: boolean,
  flipY: boolean,
): void {
  const sx = col * FRAME_PX;
  const sy = 0;
  const dw = cellW;
  const dh = cellH;
  ctx.save();
  ctx.translate(destX, destY);
  ctx.scale(flipX ? -1 : 1, flipY ? -1 : 1);
  ctx.drawImage(img, sx, sy, FRAME_PX, FRAME_PX, -dw / 2, -dh / 2, dw, dh);
  ctx.restore();
}

function drawSelection(): void {
  if (!spriteSelected) return;

  const inset = 3;
  const half = cellH / 2 - inset;
  const leg = Math.max(3, half * 0.22);
  const pulse = 0.75 + Math.sin(selectionPulse * 6) * 0.25;

  ctx.strokeStyle = `rgba(74, 222, 128, ${pulse})`;
  ctx.lineWidth = 1.5;
  ctx.lineCap = "square";

  const x0 = spriteX - half;
  const y0 = spriteY - half;
  const x1 = spriteX + half;
  const y1 = spriteY + half;

  ctx.beginPath();
  ctx.moveTo(x0, y0 + leg);
  ctx.lineTo(x0, y0);
  ctx.lineTo(x0 + leg, y0);
  ctx.moveTo(x1 - leg, y0);
  ctx.lineTo(x1, y0);
  ctx.lineTo(x1, y0 + leg);
  ctx.moveTo(x1, y1 - leg);
  ctx.lineTo(x1, y1);
  ctx.lineTo(x1 - leg, y1);
  ctx.moveTo(x0 + leg, y1);
  ctx.lineTo(x0, y1);
  ctx.lineTo(x0, y1 - leg);
  ctx.stroke();
}

function drawDestinationMarker(): void {
  if (!goal) return;

  const pos = cellCenter(goal);
  const r = Math.max(4, cellW * 0.16);
  ctx.strokeStyle = "rgba(250, 204, 21, 0.85)";
  ctx.fillStyle = "rgba(250, 204, 21, 0.2)";
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.arc(pos.x, pos.y, r, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();
}

function stepMovement(dt: number): void {
  if (path.length === 0) {
    vx = 0;
    vy = 0;
    return;
  }

  if (pathIndex >= path.length) {
    vx = 0;
    vy = 0;
    updateStatus();
    return;
  }

  const targetCell = path[pathIndex];
  if (!targetCell) return;
  const target = cellCenter(targetCell);
  const dx = target.x - spriteX;
  const dy = target.y - spriteY;
  const dist = Math.hypot(dx, dy);

  if (dist < 2) {
    spriteX = target.x;
    spriteY = target.y;
    spriteCell = { x: targetCell.x, y: targetCell.y };
    pathIndex++;
    if (pathIndex >= path.length) {
      vx = 0;
      vy = 0;
    }
    updateStatus();
    return;
  }

  const step = MOVE_SPEED * dt;
  const ratio = Math.min(1, step / dist);
  vx = (dx / dist) * MOVE_SPEED;
  vy = (dy / dist) * MOVE_SPEED;
  spriteX += dx * ratio;
  spriteY += dy * ratio;

  const oct = octantFromVelocity(vx, vy);
  if (oct !== null) lastOct = oct;
  animTime += dt;
}

function drawGrid(): void {
  const w = window.innerWidth;
  const h = window.innerHeight;
  ctx.fillStyle = "#0b0d12";
  ctx.fillRect(0, 0, w, h);

  for (const cell of explored) {
    ctx.fillStyle = "rgba(56, 189, 248, 0.12)";
    ctx.fillRect(padX + cell.x * cellW + 0.5, padY + cell.y * cellH + 0.5, cellW - 1, cellH - 1);
  }

  if (path.length > 1) {
    ctx.strokeStyle = "rgba(74, 222, 128, 0.55)";
    ctx.lineWidth = Math.max(2, cellW * 0.18);
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.beginPath();
    const first = path[0];
    if (first) {
      const p0 = cellCenter(first);
      ctx.moveTo(p0.x, p0.y);
      for (let i = 1; i < path.length; i++) {
        const cell = path[i];
        if (!cell) continue;
        const p = cellCenter(cell);
        ctx.lineTo(p.x, p.y);
      }
    }
    ctx.stroke();
  }

  ctx.fillStyle = "#334155";
  for (let y = 0; y < GRID_H; y++) {
    for (let x = 0; x < GRID_W; x++) {
      if (tiles[idx(x, y)] === TILE_UNWALKABLE) {
        ctx.fillRect(padX + x * cellW + 0.5, padY + y * cellH + 0.5, cellW - 1, cellH - 1);
      }
    }
  }

  ctx.strokeStyle = "rgba(255,255,255,0.06)";
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

  drawDestinationMarker();
}

function draw(): void {
  drawGrid();
  const img = sheet;
  if (!img) return;

  const oct = octantFromVelocity(vx, vy);
  const useOct = oct ?? lastOct;
  const spec = animSpecForOctant(useOct);
  const moving = oct !== null;
  const col = pickColumn(spec, moving, animTime);
  drawSprite(img, col, spriteX, spriteY, spec.flipX, spec.flipY);
  drawSelection();
}

function loop(now: number): void {
  const dt = Math.min((now - lastFrame) / 1000, 0.05);
  lastFrame = now;
  selectionPulse += dt;
  stepMovement(dt);
  draw();
  requestAnimationFrame(loop);
}

randomBtn.addEventListener("click", () => randomizeWalls());
clearBtn.addEventListener("click", () => clearObstacles());
tileEditor.onActiveChange(syncEditorUi);
canvas.addEventListener("pointerdown", onPointerDown);
canvas.addEventListener("pointermove", onPointerMove);
canvas.addEventListener("pointerup", onPointerUp);
canvas.addEventListener("pointercancel", onPointerUp);
canvas.addEventListener("contextmenu", (ev) => ev.preventDefault());
window.addEventListener("resize", resize);

void (async () => {
  sheet = await loadImage(charsUrl);
  placeSpriteAtCell(MAP_CENTER);
  spriteSelected = false;
  clearPathPreview();
  updateStatus();
  resize();
  randomizeWalls();
  requestAnimationFrame(loop);
})();
