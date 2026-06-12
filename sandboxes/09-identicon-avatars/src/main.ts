import { bytesForSeed, createIdenticonCanvas } from "./identicon";

const seedInput = document.getElementById("seed") as HTMLInputElement;
const previewEl = document.getElementById("preview")!;
const galleryEl = document.getElementById("gallery")!;
const regenerateBtn = document.getElementById("regenerate")!;
const randomizeBtn = document.getElementById("randomize")!;

const GALLERY_COUNT = 24;
const PREVIEW_PX = 160;
const THUMB_PX = 80;

const ADJECTIVES = [
  "amber",
  "brisk",
  "calm",
  "daring",
  "eager",
  "frosty",
  "gentle",
  "hollow",
  "ivory",
  "jolly",
  "keen",
  "lunar",
  "misty",
  "noble",
  "quiet",
  "rapid",
  "silver",
  "timid",
  "vivid",
  "witty",
];

const NOUNS = [
  "badger",
  "comet",
  "falcon",
  "harbor",
  "kernel",
  "meadow",
  "nebula",
  "otter",
  "pixel",
  "quartz",
  "river",
  "sparrow",
  "tundra",
  "vertex",
  "willow",
  "yarrow",
  "zephyr",
];

let previewCanvas: HTMLCanvasElement | null = null;
let debounceTimer = 0;

function randomUsername(): string {
  const adj = ADJECTIVES[Math.floor(Math.random() * ADJECTIVES.length)]!;
  const noun = NOUNS[Math.floor(Math.random() * NOUNS.length)]!;
  const n = Math.floor(Math.random() * 9000) + 100;
  return `${adj}-${noun}-${n}`;
}

function mountPreview(canvas: HTMLCanvasElement): void {
  canvas.className = "avatar-canvas avatar-canvas--hero";
  canvas.setAttribute("role", "img");
  if (previewCanvas) previewCanvas.replaceWith(canvas);
  else previewEl.append(canvas);
  previewCanvas = canvas;
}

async function updatePreview(): Promise<void> {
  const bytes = await bytesForSeed(seedInput.value);
  const label = seedInput.value.trim() || "random";
  const canvas = createIdenticonCanvas(bytes, PREVIEW_PX);
  canvas.setAttribute("aria-label", `Identicon for ${label}`);
  mountPreview(canvas);
}

function makeThumb(bytes: Uint8Array, label: string): HTMLElement {
  const wrap = document.createElement("figure");
  wrap.className = "avatar-card";

  const canvas = createIdenticonCanvas(bytes, THUMB_PX);
  canvas.className = "avatar-canvas";
  canvas.setAttribute("aria-label", `Identicon for ${label}`);

  const caption = document.createElement("figcaption");
  caption.className = "avatar-label";
  caption.textContent = label;

  wrap.append(canvas, caption);
  return wrap;
}

async function fillGallery(seeds?: string[]): Promise<void> {
  galleryEl.replaceChildren();
  const list = seeds ?? Array.from({ length: GALLERY_COUNT }, () => randomUsername());

  for (const seed of list) {
    const bytes = await bytesForSeed(seed);
    galleryEl.append(makeThumb(bytes, seed));
  }
}

async function regenerateAll(): Promise<void> {
  await updatePreview();
  await fillGallery();
}

seedInput.addEventListener("input", () => {
  window.clearTimeout(debounceTimer);
  debounceTimer = window.setTimeout(() => {
    void updatePreview();
  }, 120);
});

randomizeBtn.addEventListener("click", () => {
  seedInput.value = randomUsername();
  void updatePreview();
});

regenerateBtn.addEventListener("click", () => {
  void regenerateAll();
});

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
  void regenerateAll();
});

seedInput.value = randomUsername();
void regenerateAll();

console.log("[09-identicon-avatars] ready");
