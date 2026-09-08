# Contributing to Interleave

Welcome. Small, accurate experiments are the heart of this project.

## Development

Use Node 22.13+ and pnpm 11.19.0. Run `pnpm install --frozen-lockfile`, `pnpm db:migrate:local`, then `pnpm dev`. Before opening a pull request, run `pnpm check` and `pnpm build`. See [architecture and deployment](docs/ARCHITECTURE.md) for the workspace and [AI assistance](docs/AI.md) for the model integration.

Keep identity at the trusted hosting boundary and every database operation scoped to its authenticated owner. Generate schema changes with `pnpm db:generate`; commit migrations and never rewrite an applied migration. Cover authorization and optimistic concurrency changes with real SQLite tests. For AI lifecycle changes, distinguish mock-provider tests from actual WebGPU validation; report the browser, GPU, model, and result if you run the latter.

## Add an experiment

1. Open an experiment proposal with the invariant, initial state, worker operations, and a concrete failing schedule.
2. Add an `Experiment` to `lib/experiments.ts`. Use a stable, unique `id`: replay links depend on it.
3. Implement `make('buggy')` and `make('fixed')`, each returning fresh program data.
4. Every displayed code row must correspond to exactly one atomic transition. Operations may mutate only the copied frame they receive. `enabled` predicates must be pure.
5. Give every worker a finite operation list. An unavailable lock should disable a step, not busy-wait. Keep the model small enough to exhaust its schedule space under 50,000 visited nodes.
6. Include an invariant, plain-language explanation, fix, model assumptions, and a primary technical reference.
7. Add a regression with an explicit failing trace and an independently reasoned expectation. The generic suite must find a buggy failure and prove every modeled fixed schedule passes.
8. Check keyboard use, narrow screens, reduced motion, replay restoration, and export when changing the interface. Report which checks you ran in the pull request.

Do not add arbitrary code execution, external API dependencies, or tracking to implement a teaching scenario. Do not change the meaning of a published experiment ID without adding a replay-version migration.

## Good first contributions

- Explain an operation more clearly while preserving its semantics.
- Improve a reference or add a tested teaching example to `docs/MODEL.md`.
- Add an independent regression for a model boundary or invalid replay.
- Improve focus visibility or screen-reader descriptions.

## Pull requests

Describe the learner's problem, the behavior after your change, the assumptions, and the validation you ran. A screenshot is useful for interface changes. Keep code changes focused and preserve the lockfile unless a dependency change is necessary.

Credit sources, be kind in reviews, and disclose limitations. We value correctness and clarity over scenario count.
