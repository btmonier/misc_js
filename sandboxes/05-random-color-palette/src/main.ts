const paletteEl = document.getElementById("palette")!;
const regenerateBtn = document.getElementById("regenerate")!;
const hintEl = document.getElementById("hint")!;

const SWATCH_COUNT = 5;

let hintTimer = 0;

function clamp(n: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, n));
}

function hslToRgb(h: number, s: number, l: number): [number, number, number] {
  let hh = h % 360;
  if (hh < 0) hh += 360;
  const sf = clamp(s, 0, 100) / 100;
  const lf = clamp(l, 0, 100) / 100;
  const c = (1 - Math.abs(2 * lf - 1)) * sf;
  const xp = c * (1 - Math.abs(((hh / 60) % 2) - 1));
  const m = lf - c / 2;
  let r = 0;
  let g = 0;
  let b = 0;
  if (hh < 60) [r, g, b] = [c, xp, 0];
  else if (hh < 120) [r, g, b] = [xp, c, 0];
  else if (hh < 180) [r, g, b] = [0, c, xp];
  else if (hh < 240) [r, g, b] = [0, xp, c];
  else if (hh < 300) [r, g, b] = [xp, 0, c];
  else [r, g, b] = [c, 0, xp];
  return [Math.round((r + m) * 255), Math.round((g + m) * 255), Math.round((b + m) * 255)];
}

function rgbToHex(r: number, g: number, b: number): string {
  return `#${[r, g, b].map((c) => c.toString(16).padStart(2, "0")).join("")}`;
}

/** Relative luminance (sRGB), for picking label color */
function luminance(hex: string): number {
  const n = hex.slice(1);
  const r = Number.parseInt(n.slice(0, 2), 16) / 255;
  const g = Number.parseInt(n.slice(2, 4), 16) / 255;
  const b = Number.parseInt(n.slice(4, 6), 16) / 255;
  const lin = (u: number) => (u <= 0.03928 ? u / 12.92 : ((u + 0.055) / 1.055) ** 2.4);
  return 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b);
}

function rand(min: number, max: number): number {
  return min + Math.random() * (max - min);
}

function jitter(n: number, amount: number): number {
  return n + rand(-amount, amount);
}

type PaletteMode = "wheel" | "mono" | "accent";

function pickMode(): PaletteMode {
  const r = Math.random();
  if (r < 0.42) return "wheel";
  if (r < 0.74) return "mono";
  return "accent";
}

function describeMode(m: PaletteMode): string {
  switch (m) {
    case "wheel":
      return "Evenly spaced hues";
    case "mono":
      return "Single hue ramp";
    case "accent":
      return "Analogous + complement";
    default:
      return "";
  }
}

function generateColors(): { hexes: string[]; modeLabel: PaletteMode } {
  const mode = pickMode();
  const baseHue = rand(0, 360);

  if (mode === "wheel") {
    const step = 360 / SWATCH_COUNT;
    const sat = clamp(jitter(rand(52, 96), 6), 40, 100);
    const light = clamp(jitter(rand(38, 58), 8), 24, 72);
    const hexes = Array.from({ length: SWATCH_COUNT }, (_, i) => {
      const h = jitter(baseHue + i * step, 10);
      const [r, g, b] = hslToRgb(h, sat, light + rand(-6, 6));
      return rgbToHex(r, g, b);
    });
    return { hexes, modeLabel: mode };
  }

  if (mode === "mono") {
    const sat = clamp(jitter(rand(35, 88), 10), 15, 100);
    const hexes = Array.from({ length: SWATCH_COUNT }, (_, i) => {
      const t = i / (SWATCH_COUNT - 1);
      const light = 88 - t * 66 + rand(-4, 4);
      const [r, g, b] = hslToRgb(baseHue + rand(-6, 6), sat + rand(-10, 10), clamp(light, 12, 92));
      return rgbToHex(r, g, b);
    });
    return { hexes, modeLabel: mode };
  }

  // accent — mostly analogous cluster + contrasting complement
  const satMain = clamp(jitter(rand(55, 90), 5), 40, 100);
  const lightMain = clamp(jitter(rand(40, 58), 6), 28, 68);
  const offsets = [-18, -6, 8, 24, 180];
  const hexes = offsets.map((off) => {
    const h = jitter(baseHue + off, off === 180 ? 8 : 5);
    const s =
      Math.abs(off) > 120 ? clamp(jitter(satMain + rand(8, 22), 8), 45, 100) : jitter(satMain, 8);
    const l =
      Math.abs(off) > 120
        ? clamp(jitter(lightMain + rand(-10, 12), 5), 32, 75)
        : jitter(lightMain, 7);
    const [r, g, b] = hslToRgb(h, s, l);
    return rgbToHex(r, g, b);
  });
  return { hexes, modeLabel: mode };
}

function flashHint(text: string): void {
  hintEl.textContent = text;
  window.clearTimeout(hintTimer);
  hintTimer = window.setTimeout(() => {
    hintEl.textContent = "";
  }, 2200);
}

async function copyText(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    try {
      const ta = document.createElement("textarea");
      ta.value = text;
      ta.style.position = "fixed";
      ta.style.left = "-9999px";
      document.body.appendChild(ta);
      ta.select();
      const ok = document.execCommand("copy");
      ta.remove();
      return ok;
    } catch {
      return false;
    }
  }
}

function render(hexes: string[], modeLabel: PaletteMode): void {
  paletteEl.replaceChildren();

  hexes.forEach((hex) => {
    const sw = document.createElement("button");
    sw.type = "button";
    sw.className = "swatch";
    sw.style.backgroundColor = hex;
    sw.dataset.hex = hex;
    sw.setAttribute("aria-label", `Copy ${hex}`);

    const label = luminance(hex) > 0.55 ? "#0a0c10" : "#f4f6f9";
    const code = document.createElement("span");
    code.className = "hex-label";
    code.style.color = label;
    code.textContent = hex;

    sw.append(code);

    sw.addEventListener("click", async () => {
      const ok = await copyText(hex);
      flashHint(ok ? `Copied ${hex}` : `Copy failed — ${hex}`);
    });

    paletteEl.append(sw);
  });

  flashHint(describeMode(modeLabel));
}

function newPalette(): void {
  const { hexes, modeLabel } = generateColors();
  render(hexes, modeLabel);
}

regenerateBtn.addEventListener("click", () => newPalette());

window.addEventListener("keydown", (ev) => {
  if (ev.code !== "Space") return;
  const t = ev.target;
  if (
    t instanceof HTMLButtonElement ||
    t instanceof HTMLInputElement ||
    t instanceof HTMLTextAreaElement
  ) {
    return;
  }
  ev.preventDefault();
  newPalette();
});

newPalette();
console.log("[05-random-color-palette] ready");
