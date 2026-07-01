# 13-flyweight-rts

An RTS-style sandbox built with [p5.js](https://p5js.org/) that demonstrates the
[Flyweight](https://en.wikipedia.org/wiki/Flyweight_pattern) design pattern. This
is a nifty trick for optimizing RAM usage in strategy games where hundreds of units
need to be rendered simultaneously on screen.


## How the Flyweight pattern is used

The pattern splits an object's state into two parts so that the heavy, shared
part can be reused across many instances:

| Role                         | Class in `src/main.ts` | State it holds                                    |
| ---------------------------- | ---------------------- | ------------------------------------------------- |
| Flyweight factory            | `UnitTypeFactory`      | a cache that returns one shared instance per key  |
| Flyweight (intrinsic/shared) | `UnitType`             | colour, square size, max speed, label, `draw()`   |
| Context (extrinsic/per-unit) | `Unit`                 | only `x, y, vx, vy` + a reference to a `UnitType` |


The `draw(p, x, y, heading)` method takes the extrinsic position/heading as
arguments rather than storing them, which is what keeps the flyweight shareable.


## Run

```bash
# from the repo root:
bun dev 13-flyweight-rts

# or from this folder:
bun run dev
```


## Add a dependency

```bash
bun add --filter @sandbox/13-flyweight-rts <pkg>
```
