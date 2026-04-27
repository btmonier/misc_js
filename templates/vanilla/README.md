# __NAME__

A sandbox for experimenting with JS/TS/HTML ideas.

## Run

```bash
# from the repo root:
bun dev __NAME__

# or from this folder:
bun run dev
```

## Files

- `index.html` - page entry, imports `src/main.ts`
- `src/main.ts` - code
- `src/styles.css` - styles
- `vite.config.ts` - tweak dev-server / build behavior here

## Add a dependency

```bash
bun add --filter @sandbox/__NAME__ <pkg>
```
