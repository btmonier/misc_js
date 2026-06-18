export interface Histogram {
  bins: number;
  counts: Uint32Array;
  expected: number;
}

export interface ChiSquaredResult {
  statistic: number;
  df: number;
  pValue: number;
}

export interface RunsResult {
  runs: number;
  nAbove: number;
  nBelow: number;
  zScore: number;
  pValue: number;
}

export interface KsResult {
  statistic: number;
  pValue: number;
}

export interface MonobitResult {
  ones: number;
  ratio: number;
  zScore: number;
  pValue: number;
}

export interface RandomnessStats {
  count: number;
  mean: number;
  variance: number;
  stdDev: number;
  min: number;
  max: number;
  histogram: Histogram;
  chiSquared: ChiSquaredResult;
  runs: RunsResult;
  entropy: number;
  maxEntropy: number;
  autocorrelation: number;
  ks: KsResult;
  monobit: MonobitResult;
}

function mean(values: Float64Array): number {
  let sum = 0;
  for (let i = 0; i < values.length; i++) sum += values[i] ?? 0;
  return sum / values.length;
}

function variance(values: Float64Array, mu: number): number {
  let sum = 0;
  for (let i = 0; i < values.length; i++) {
    const d = (values[i] ?? 0) - mu;
    sum += d * d;
  }
  return sum / values.length;
}

export function buildHistogram(values: Float64Array, bins: number): Histogram {
  const counts = new Uint32Array(bins);
  for (let i = 0; i < values.length; i++) {
    const v = values[i] ?? 0;
    const idx = Math.min(bins - 1, Math.max(0, Math.floor(v * bins)));
    counts[idx] = (counts[idx] ?? 0) + 1;
  }
  return { bins, counts, expected: values.length / bins };
}

/** Regularized upper incomplete gamma Q(s, x) via series for chi-squared p-values. */
function gammaQ(s: number, x: number): number {
  if (x <= 0) return 1;
  if (x < s + 1) {
    let sum = 1;
    let term = 1;
    for (let n = 1; n < 200; n++) {
      term *= x / (s + n - 1);
      sum += term;
      if (term < 1e-12 * sum) break;
    }
    return 1 - (x ** s * Math.exp(-x) * sum) / gamma(s);
  }
  let f = x + 1 - s;
  let c = 1 / 1e-30;
  let d = 1 / f;
  let h = d;
  for (let i = 1; i <= 200; i++) {
    const an = -i * (i - s);
    const b = f + 2 * i;
    d = an * d + b;
    if (Math.abs(d) < 1e-30) d = 1e-30;
    c = b + an / c;
    if (Math.abs(c) < 1e-30) c = 1e-30;
    d = 1 / d;
    const delta = d * c;
    h *= delta;
    if (Math.abs(delta - 1) < 1e-12) break;
  }
  return Math.exp(-x + s * Math.log(x) - lnGamma(s)) * h;
}

function lnGamma(z: number): number {
  const g = 7;
  const c = [
    0.99999999999980993, 676.5203681218851, -1259.1392167224028, 771.32342877765313,
    -176.61502916214059, 12.507343278686905, -0.13857109526572012, 9.9843695780195716e-6,
    1.5056327351493116e-7,
  ];
  if (z < 0.5) return Math.log(Math.PI / Math.sin(Math.PI * z)) - lnGamma(1 - z);
  z -= 1;
  let x = c[0] ?? 1;
  for (let i = 1; i < g + 2; i++) x += (c[i] ?? 0) / (z + i);
  const t = z + g + 0.5;
  return 0.5 * Math.log(2 * Math.PI) + (z + 0.5) * Math.log(t) - t + Math.log(x);
}

function gamma(z: number): number {
  return Math.exp(lnGamma(z));
}

export function chiSquaredTest(hist: Histogram): ChiSquaredResult {
  let chi2 = 0;
  for (let i = 0; i < hist.bins; i++) {
    const diff = (hist.counts[i] ?? 0) - hist.expected;
    chi2 += (diff * diff) / hist.expected;
  }
  const df = hist.bins - 1;
  const pValue = gammaQ(df / 2, chi2 / 2);
  return { statistic: chi2, df, pValue };
}

/** Wald–Wolfowitz runs test using the sample median as cutoff. */
export function runsTest(values: Float64Array): RunsResult {
  const sorted = Float64Array.from(values).sort();
  const mid = sorted.length >> 1;
  const lo = sorted[mid - 1] ?? 0;
  const hi = sorted[mid] ?? lo;
  const median = sorted.length % 2 === 0 ? (lo + hi) / 2 : hi;

  let nAbove = 0;
  let nBelow = 0;
  let runs = 1;
  let prevAbove: boolean | null = null;

  for (let i = 0; i < values.length; i++) {
    const above = (values[i] ?? 0) >= median;
    if (above) nAbove++;
    else nBelow++;
    if (prevAbove !== null && above !== prevAbove) runs++;
    prevAbove = above;
  }

  const n = nAbove + nBelow;
  const expected = (2 * nAbove * nBelow) / n + 1;
  const denom = (n - 1) * (n - 1) * (n - 2);
  const varRuns =
    denom === 0
      ? 0
      : (2 * nAbove * nBelow * (2 * nAbove * nBelow - n)) / denom;
  const zScore = varRuns > 0 ? (runs - expected) / Math.sqrt(varRuns) : 0;
  return { runs, nAbove, nBelow, zScore, pValue: 2 * (1 - normalCdf(Math.abs(zScore))) };
}

function normalCdf(x: number): number {
  const t = 1 / (1 + 0.2316419 * Math.abs(x));
  const d = 0.3989423 * Math.exp((-x * x) / 2);
  const p =
    d *
    t *
    (0.3193815 + t * (-0.3565638 + t * (1.781478 + t * (-1.821256 + t * 1.330274))));
  return x > 0 ? 1 - p : p;
}

export function shannonEntropy(hist: Histogram): { entropy: number; maxEntropy: number } {
  const n = hist.counts.reduce((a, b) => a + b, 0);
  let h = 0;
  for (let i = 0; i < hist.bins; i++) {
    const p = (hist.counts[i] ?? 0) / n;
    if (p > 0) h -= p * Math.log2(p);
  }
  return { entropy: h, maxEntropy: Math.log2(hist.bins) };
}

/** Lag-1 autocorrelation; ideal uniform i.i.d. noise ≈ 0. */
export function lag1Autocorrelation(values: Float64Array, mu: number): number {
  if (values.length < 2) return 0;
  let num = 0;
  let den = 0;
  for (let i = 0; i < values.length; i++) {
    const d = (values[i] ?? 0) - mu;
    den += d * d;
  }
  for (let i = 1; i < values.length; i++) {
    num += ((values[i] ?? 0) - mu) * ((values[i - 1] ?? 0) - mu);
  }
  return den === 0 ? 0 : num / den;
}

/** Kolmogorov–Smirnov test against Uniform(0, 1). */
export function ksTestUniform(values: Float64Array): KsResult {
  const sorted = Float64Array.from(values).sort();
  const n = sorted.length;
  let d = 0;
  for (let i = 0; i < n; i++) {
    const sample = sorted[i] ?? 0;
    const empirical = (i + 1) / n;
    const below = i / n;
    d = Math.max(d, Math.abs(sample - empirical), Math.abs(sample - below));
  }
  const sqrtN = Math.sqrt(n);
  const pValue = ksPValue(d * sqrtN);
  return { statistic: d, pValue };
}

function ksPValue(lambda: number): number {
  if (lambda <= 0) return 1;
  let sum = 0;
  for (let k = 1; k <= 100; k++) {
    const term = 2 * (-1) ** (k - 1) * Math.exp(-2 * k * k * lambda * lambda);
    sum += term;
    if (Math.abs(term) < 1e-12) break;
  }
  return Math.max(0, Math.min(1, sum));
}

/** Monobit frequency test: proportion of draws above 0.5. */
export function monobitTest(values: Float64Array): MonobitResult {
  let ones = 0;
  for (let i = 0; i < values.length; i++) {
    if ((values[i] ?? 0) >= 0.5) ones++;
  }
  const n = values.length;
  const ratio = ones / n;
  const zScore = (ones - n / 2) / Math.sqrt(n / 4);
  return { ones, ratio, zScore, pValue: 2 * (1 - normalCdf(Math.abs(zScore))) };
}

export function analyzeRandomness(values: Float64Array, bins = 20): RandomnessStats {
  const mu = mean(values);
  const var_ = variance(values, mu);
  let min = Infinity;
  let max = -Infinity;
  for (let i = 0; i < values.length; i++) {
    const v = values[i] ?? 0;
    if (v < min) min = v;
    if (v > max) max = v;
  }

  const histogram = buildHistogram(values, bins);
  const { entropy, maxEntropy } = shannonEntropy(histogram);

  return {
    count: values.length,
    mean: mu,
    variance: var_,
    stdDev: Math.sqrt(var_),
    min,
    max,
    histogram,
    chiSquared: chiSquaredTest(histogram),
    runs: runsTest(values),
    entropy,
    maxEntropy,
    autocorrelation: lag1Autocorrelation(values, mu),
    ks: ksTestUniform(values),
    monobit: monobitTest(values),
  };
}

export function formatPValue(p: number): string {
  if (p < 0.0001) return "< 0.0001";
  return p.toFixed(4);
}

export function passesAlpha(pValue: number, alpha = 0.05): boolean {
  return pValue >= alpha;
}
