# 06-metronome

Web Audio–scheduled metronome with BPM control (30–400), beats-per-bar, optional downbeat accent, and Space to start/stop (except in text fields, the beats-per-bar `<select>`, or the accent checkbox).

## Run

```bash
# from the repo root:
bun dev 06-metronome

# or from this folder:
bun run dev
```

## Files

- `index.html` - page shell
- `src/main.ts` - scheduling, clicks, UI sync
- `src/styles.css` - layout
- `vite.config.ts` - Vite settings

## Add a dependency

```bash
bun add --filter @sandbox/06-metronome <pkg>
```
