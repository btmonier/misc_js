export type RngFn = () => number;

type GeneratorBase = {
  id: string;
  name: string;
  description: string;
};

export type GeneratorDef =
  | (GeneratorBase & { seedable: true; create: (seed: number) => RngFn })
  | (GeneratorBase & { seedable: false; create: () => RngFn });

/** Map any 32-bit seed to non-zero state (several PRNGs stall on state 0). */
export function normalizeSeed(seed: number): number {
  const s = seed >>> 0;
  return s === 0 ? 1 : s;
}

/** Park–Miller minimal standard LCG (glibc-style constants). */
function lcg(seed: number): RngFn {
  let state = normalizeSeed(seed);
  return () => {
    state = (state * 48271) % 2147483647;
    return (state - 1) / 2147483646;
  };
}

function xorshift32(seed: number): RngFn {
  let state = normalizeSeed(seed);
  return () => {
    state ^= state << 13;
    state ^= state >>> 17;
    state ^= state << 5;
    state >>>= 0;
    return state / 4294967296;
  };
}

function mulberry32(seed: number): RngFn {
  let state = normalizeSeed(seed);
  return () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** 32-bit PCG variant (O'Neill, JS-friendly state). */
function pcg32(seed: number): RngFn {
  let state = normalizeSeed(seed);
  return () => {
    state = (Math.imul(state, 747796405) + 2891336453) >>> 0;
    const word = Math.imul((state >>> ((state >>> 28) + 4)) ^ state, 277803737);
    return ((word >>> 22) ^ word) / 4294967296;
  };
}

function cryptoRng(): RngFn {
  const buf = new Uint32Array(256);
  let index = buf.length;
  return () => {
    if (index >= buf.length) {
      crypto.getRandomValues(buf);
      index = 0;
    }
    return (buf[index++] ?? 0) / 4294967296;
  };
}

export const generators: GeneratorDef[] = [
  {
    id: "mulberry32",
    name: "mulberry32",
    description: "Compact 32-bit PRNG popular in JS game dev. Seedable - same seed yields the same sequence.",
    seedable: true,
    create: (seed) => mulberry32(seed),
  },
  {
    id: "lcg",
    name: "LCG (Park–Miller)",
    description: "Classic linear congruential generator - fast but poor spectral properties. Seedable.",
    seedable: true,
    create: (seed) => lcg(seed),
  },
  {
    id: "xorshift32",
    name: "xorshift32",
    description: "Marsaglia xorshift - lightweight and decent for simulations. Seedable.",
    seedable: true,
    create: (seed) => xorshift32(seed),
  },
  {
    id: "pcg32",
    name: "PCG32",
    description: "Permuted congruential generator - strong statistical quality for a small state. Seedable.",
    seedable: true,
    create: (seed) => pcg32(seed),
  },
  {
    id: "crypto",
    name: "crypto.getRandomValues",
    description: "OS-backed CSPRNG - not seedable; each run draws fresh entropy.",
    seedable: false,
    create: () => cryptoRng(),
  },
  {
    id: "math-random",
    name: "Math.random",
    description: "Browser built-in PRNG - not seedable; output varies between runs.",
    seedable: false,
    create: () => Math.random,
  },
];

export const DEFAULT_GENERATOR_ID = "mulberry32";

export function getGenerator(id: string): GeneratorDef {
  const gen = generators.find((g) => g.id === id);
  if (!gen) throw new Error(`Unknown generator: ${id}`);
  return gen;
}

export function sample(rng: RngFn, count: number): Float64Array {
  const out = new Float64Array(count);
  for (let i = 0; i < count; i++) out[i] = rng();
  return out;
}

/** Short checksum so identical seeds are easy to verify at a glance. */
export function sampleFingerprint(values: Float64Array, take = 8): string {
  let hash = 2166136261;
  const n = Math.min(take, values.length);
  for (let i = 0; i < n; i++) {
    const bits = new Float64Array([values[i] ?? 0]);
    const view = new DataView(bits.buffer);
    const lo = view.getUint32(0, true);
    const hi = view.getUint32(4, true);
    hash ^= lo;
    hash = Math.imul(hash, 16777619);
    hash ^= hi;
    hash = Math.imul(hash, 16777619);
  }
  return (hash >>> 0).toString(16).padStart(8, "0");
}
