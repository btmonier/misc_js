import { updateHistogramChart, updateScatterChart } from "./charts";
import {
  DEFAULT_GENERATOR_ID,
  generators,
  getGenerator,
  sample,
  sampleFingerprint,
} from "./rng";
import {
  analyzeRandomness,
  formatPValue,
  passesAlpha,
  type RandomnessStats,
} from "./stats";

const generatorSelect = document.getElementById("generator") as HTMLSelectElement;
const sampleSizeInput = document.getElementById("sample-size") as HTMLInputElement;
const seedInput = document.getElementById("seed") as HTMLInputElement;
const seedField = document.getElementById("seed-field")!;
const generateBtn = document.getElementById("generate") as HTMLButtonElement;
const genDesc = document.getElementById("gen-desc")!;
const histCanvas = document.getElementById("histogram") as HTMLCanvasElement;
const scatterCanvas = document.getElementById("scatter") as HTMLCanvasElement;
const statsGrid = document.getElementById("stats-grid")!;
const timingEl = document.getElementById("timing")!;

const ALPHA = 0.05;
const EXPECTED_MEAN = 0.5;
const EXPECTED_VAR = 1 / 12;

function populateGenerators(): void {
  if (generatorSelect.options.length > 0) return;

  for (const gen of generators) {
    const opt = document.createElement("option");
    opt.value = gen.id;
    opt.textContent = gen.name;
    generatorSelect.append(opt);
  }
  generatorSelect.value = DEFAULT_GENERATOR_ID;
  updateSeedVisibility();
}

function updateSeedVisibility(): void {
  const gen = getGenerator(generatorSelect.value);
  genDesc.textContent = gen.description;
  seedField.hidden = !gen.seedable;
}

function parseSampleSize(): number {
  const n = Number.parseInt(sampleSizeInput.value, 10);
  if (!Number.isFinite(n) || n < 100) return 100;
  if (n > 1_000_000) return 1_000_000;
  return n;
}

function parseSeed(): number {
  const raw = seedInput.value.trim();
  if (!raw) return 42;
  const n = Number.parseInt(raw, 10);
  if (!Number.isFinite(n)) return 42;
  return n >>> 0;
}

interface StatCard {
  label: string;
  value: string;
  detail?: string;
  pass?: boolean | null;
}

function meanPass(mu: number, n: number): boolean {
  const se = Math.sqrt(1 / 12 / n);
  return Math.abs(mu - EXPECTED_MEAN) <= 1.96 * se;
}

function variancePass(v: number, n: number): boolean {
  const se = Math.sqrt(2 / (n * 11 * 11));
  return Math.abs(v - EXPECTED_VAR) <= 1.96 * se;
}

function buildStatCards(stats: RandomnessStats): StatCard[] {
  return [
    {
      label: "Sample size",
      value: stats.count.toLocaleString(),
    },
    {
      label: "Mean",
      value: stats.mean.toFixed(6),
      detail: `expected ${EXPECTED_MEAN}`,
      pass: meanPass(stats.mean, stats.count),
    },
    {
      label: "Variance",
      value: stats.variance.toFixed(6),
      detail: `expected ${EXPECTED_VAR.toFixed(6)}`,
      pass: variancePass(stats.variance, stats.count),
    },
    {
      label: "Std dev",
      value: stats.stdDev.toFixed(6),
      detail: `expected ${Math.sqrt(EXPECTED_VAR).toFixed(6)}`,
    },
    {
      label: "Range",
      value: `[${stats.min.toFixed(4)}, ${stats.max.toFixed(4)}]`,
    },
    {
      label: "Chi-squared",
      value: `${stats.chiSquared.statistic.toFixed(2)} (df ${stats.chiSquared.df})`,
      detail: `p = ${formatPValue(stats.chiSquared.pValue)}`,
      pass: passesAlpha(stats.chiSquared.pValue, ALPHA),
    },
    {
      label: "Kolmogorov–Smirnov",
      value: `D = ${stats.ks.statistic.toFixed(4)}`,
      detail: `p = ${formatPValue(stats.ks.pValue)}`,
      pass: passesAlpha(stats.ks.pValue, ALPHA),
    },
    {
      label: "Runs test",
      value: `${stats.runs.runs} runs (z = ${stats.runs.zScore.toFixed(2)})`,
      detail: `p = ${formatPValue(stats.runs.pValue)}`,
      pass: passesAlpha(stats.runs.pValue, ALPHA),
    },
    {
      label: "Monobit frequency",
      value: `${(stats.monobit.ratio * 100).toFixed(2)}% ≥ 0.5`,
      detail: `p = ${formatPValue(stats.monobit.pValue)}`,
      pass: passesAlpha(stats.monobit.pValue, ALPHA),
    },
    {
      label: "Shannon entropy",
      value: `${stats.entropy.toFixed(4)} bits`,
      detail: `max ${stats.maxEntropy.toFixed(4)} (${((stats.entropy / stats.maxEntropy) * 100).toFixed(1)}%)`,
      pass: stats.entropy / stats.maxEntropy > 0.98,
    },
    {
      label: "Lag-1 autocorrelation",
      value: stats.autocorrelation.toFixed(6),
      detail: "≈ 0 for i.i.d. uniform",
      pass: Math.abs(stats.autocorrelation) < 2 / Math.sqrt(stats.count),
    },
  ];
}

function renderStats(stats: RandomnessStats): void {
  statsGrid.replaceChildren();
  for (const card of buildStatCards(stats)) {
    const el = document.createElement("article");
    el.className = "stat-card";
    if (card.pass === true) el.classList.add("pass");
    if (card.pass === false) el.classList.add("fail");

    const label = document.createElement("h3");
    label.className = "stat-label";
    label.textContent = card.label;

    const value = document.createElement("p");
    value.className = "stat-value";
    value.textContent = card.value;

    el.append(label, value);

    if (card.detail) {
      const detail = document.createElement("p");
      detail.className = "stat-detail";
      detail.textContent = card.detail;
      el.append(detail);
    }

    if (card.pass !== undefined && card.pass !== null) {
      const badge = document.createElement("span");
      badge.className = "stat-badge";
      badge.textContent = card.pass ? "pass" : "fail";
      el.append(badge);
    }

    statsGrid.append(el);
  }
}

function generate(): void {
  const gen = getGenerator(generatorSelect.value);
  const n = parseSampleSize();

  const t0 = performance.now();
  let rng;
  let seed: number | null = null;
  if (gen.seedable) {
    seed = parseSeed();
    rng = gen.create(seed);
  } else {
    rng = gen.create();
  }
  const sampleValues = sample(rng, n);
  const stats = analyzeRandomness(sampleValues);
  const elapsed = performance.now() - t0;

  updateHistogramChart(histCanvas, stats);
  updateScatterChart(scatterCanvas, sampleValues);
  renderStats(stats);

  const fingerprint = sampleFingerprint(sampleValues);
  const seedLine = gen.seedable
    ? `seed ${seed} | fingerprint ${fingerprint} (same seed -> same fingerprint)`
    : "not seedable - output changes every run";
  timingEl.textContent = `Generated ${n.toLocaleString()} values in ${elapsed.toFixed(1)} ms | ${seedLine}`;
}

generatorSelect.addEventListener("change", updateSeedVisibility);
generateBtn.addEventListener("click", generate);

populateGenerators();
generate();
console.log("[11-rng-testing] ready");
