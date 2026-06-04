const GRID = 5;
const HALF_COLS = 3;

/** SHA-1 digest of a string (GitHub seeds identicons from username hashes). */
export async function sha1(text: string): Promise<Uint8Array> {
  const buf = await crypto.subtle.digest("SHA-1", new TextEncoder().encode(text));
  return new Uint8Array(buf);
}

export function randomBytes(length = 20): Uint8Array {
  const bytes = new Uint8Array(length);
  crypto.getRandomValues(bytes);
  return bytes;
}

function hueFromBytes(bytes: Uint8Array): number {
  let sum = 0;
  for (let i = 0; i < 5; i++) sum += bytes[i] ?? 0;
  return sum % 360;
}

/** Pastel background + darker blocks, similar to GitHub default avatars. */
export function colorsFromBytes(bytes: Uint8Array): { background: string; foreground: string } {
  const hue = hueFromBytes(bytes);
  return {
    background: `hsl(${hue} 38% 82%)`,
    foreground: `hsl(${hue} 42% 38%)`,
  };
}

/** 5×5 symmetric pattern: 15 bits from the hash, mirrored on the right. */
export function patternFromBytes(bytes: Uint8Array): boolean[][] {
  const grid: boolean[][] = Array.from({ length: GRID }, () => Array<boolean>(GRID).fill(false));
  let bit = 0;
  for (let row = 0; row < GRID; row++) {
    for (let col = 0; col < HALF_COLS; col++) {
      const byte = bytes[Math.floor(bit / 8)] ?? 0;
      const on = ((byte >> (bit % 8)) & 1) === 1;
      grid[row]![col] = on;
      grid[row]![GRID - 1 - col] = on;
      bit++;
    }
  }
  return grid;
}

export function drawIdenticon(
  ctx: CanvasRenderingContext2D,
  bytes: Uint8Array,
  pixelSize: number,
): void {
  const { background, foreground } = colorsFromBytes(bytes);
  const pattern = patternFromBytes(bytes);
  const cell = pixelSize / GRID;

  ctx.clearRect(0, 0, pixelSize, pixelSize);
  ctx.fillStyle = background;
  ctx.fillRect(0, 0, pixelSize, pixelSize);

  ctx.fillStyle = foreground;
  for (let row = 0; row < GRID; row++) {
    for (let col = 0; col < GRID; col++) {
      if (!pattern[row]![col]) continue;
      ctx.fillRect(col * cell, row * cell, cell, cell);
    }
  }
}

export function createIdenticonCanvas(bytes: Uint8Array, pixelSize: number): HTMLCanvasElement {
  const canvas = document.createElement("canvas");
  canvas.width = pixelSize;
  canvas.height = pixelSize;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("2D canvas not available");
  drawIdenticon(ctx, bytes, pixelSize);
  return canvas;
}

export async function bytesForSeed(seed: string): Promise<Uint8Array> {
  const trimmed = seed.trim();
  return trimmed ? sha1(trimmed) : randomBytes();
}
