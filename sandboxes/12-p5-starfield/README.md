# 12-p5-starfield

A 3D warp-speed starfield built with [p5.js](https://p5js.org/) in WEBGL mode.

Stars hold a fixed `(x, y)` and only travel along `z` toward the camera; the
perspective projection turns that single axis of motion into the classic radial
spread. It leans on a few of p5's graphics features:

- WEBGL perspective camera and 3D primitives (`point`, `line`)
- additive blending (`blendMode(ADD)`) for glow
- depth-based size, brightness, and motion streaks for a sense of distance
- per-star colour variation

## Controls

- **Warp speed** &mdash; how fast stars rush past
- **Stars** &mdash; field density
- **Trail length** &mdash; length of the motion streaks
- **Drift & mouse steering** &mdash; auto rotation plus parallax that follows the mouse
- **Click** the canvas for a momentary speed boost

## Run

```bash
# from the repo root:
bun dev 12-p5-starfield

# or from this folder:
bun run dev
```

## Files

- `index.html` - page entry + HUD controls, imports `src/main.ts`
- `src/main.ts` - the p5 sketch (instance mode)
- `src/styles.css` - styles for the canvas + control panel
- `vite.config.ts` - dev-server / build behavior

## Add a dependency

```bash
bun add --filter @sandbox/12-p5-starfield <pkg>
```
