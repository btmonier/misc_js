# Miscellaneous \*Script

A personal monorepo for trying out JavaScript, TypeScript, and HTML ideas in
fully isolated browser sandboxes. Each sandbox is its own package with its own
dependencies, dev server, and build so experiments can't contaminate each
other.

## Current stack

* bun (JSX toolkit)
* Vite (serve and build)
* Biome (linting and formatting)


## Setup

One-time:

```bash
bun install
```

## Daily flow

```bash
# create a new sandbox (copies templates/vanilla to sandboxes/<slug>)
bun run new fetch-streaming

# start its dev server (opens browser, HMR on)
bun dev fetch-streaming

# list everything you've got
bun run list

# typecheck or build all sandboxes
bun run typecheck
bun run build
```

In case you need to delete a sandbox:

```bash
rm -rf sandoxes/<slug>
```


## Add a dependency to a single sandbox

```bash
bun add --filter @sandbox/<slug> three
```

Each sandbox has its own `package.json`, so dependencies never leak.


## Adding a new template

Drop a directory under `templates/` (e.g. `templates/react/`) with a complete
sandbox skeleton. Use `__NAME__` anywhere you want the slug substituted. Then:

```bash
bun run new my-experiment --template react
```


