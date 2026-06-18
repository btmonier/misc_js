# RNG testing lab

Compare random number generators and run statistical tests for uniform i.i.d. output.

## Generators

- `crypto.getRandomValues` - OS-backed CSPRNG
- `Math.random` - browser built-in PRNG
- LCG, xorshift32, mulberry32, PCG32 - seedable PRNGs for side-by-side comparison

## Tests

Chi-squared goodness-of-fit, Kolmogorov–Smirnov, Wald–Wolfowitz runs, monobit frequency, Shannon entropy, lag-1 autocorrelation, plus mean/variance checks against Uniform(0, 1).

## Run

```bash
bun dev 11-rng-testing
```

## Add a dependency

```bash
bun add --filter @sandbox/11-rng-testing <pkg>
```
