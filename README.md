<div align="center">

<img src="public/favicon.svg" width="72" height="72" alt="Interleave symbol">

# Interleave

### Concurrency, made visible.

**You are the scheduler. Break the code. Rewind. Test the fix.**

[**Open the live lab →**](https://interleave-pralav.websites4u.chatgpt.site) · [Try a failing execution](https://interleave-pralav.websites4u.chatgpt.site/#v=1&lab=lost-update&mode=buggy&trace=ABABAB) · [Contribute an experiment](CONTRIBUTING.md)

[![CI](https://github.com/pralav-25/interleave/actions/workflows/ci.yml/badge.svg)](https://github.com/pralav-25/interleave/actions/workflows/ci.yml)
[![MIT License](https://img.shields.io/badge/license-MIT-d3f36a)](LICENSE)
[![TypeScript](https://img.shields.io/badge/TypeScript-strict-3178c6)](lib/engine.ts)

</div>

Two workers increment a counter. The final value is **1**.

Interleave lets you see exactly how that happens. Advance one worker at a time, inspect shared and local state, and rewind to branch into a different execution. Then switch to the fix and explore every terminal schedule in the model.

No signup. No API key. No arbitrary code execution. The simulation runs in your browser.

## Your first bug in 10 seconds

1. Open [Lost update](https://interleave-pralav.websites4u.chatgpt.site).
2. Click **Find a failure**, or press **1, 2, 1, 2, 1, 2** to schedule the workers yourself.
3. Both workers finish, but the counter is **1** instead of **2**.
4. Select **With the fix**. The atomic increment passes every modeled schedule.
5. **Share replay** gives someone else the exact execution. **Export this trace** produces a Markdown report.

```text
                 Worker A       Worker B       Shared counter
                    │              │                  0
  1. read           0 ◄────────────┼───────────────────┤
  2. read           │              0 ◄────────────────┤
  3. increment      1              │                  │
  4. increment      │              1                  │
  5. write          └──────────────┼──────────────────►1
  6. write                         └──────────────────►1  ← lost update
```

## Six experiments

| Experiment         | What breaks                                          | Fix explored                     |
| ------------------ | ---------------------------------------------------- | -------------------------------- |
| Lost update        | Two read-modify-write sequences overwrite each other | Atomic increment                 |
| Oversold inventory | Two buyers both reserve the last seat                | Atomic conditional reservation   |
| Double payment     | A request and retry both see an unused key           | Atomic key claim before charging |
| Stale search       | An older response overwrites the latest search       | Request-version guard            |
| Deadlock           | Each worker holds a lock the other needs             | Consistent global lock ordering  |
| Write skew         | Both doctors go off call after checking the other    | Serialize the check and decision |

Each experiment includes the broken implementation, its fix, an invariant, model assumptions, and a reference to primary documentation.

## How it works

- **Deterministic engine.** Each displayed operation is atomic; workers retain their own program order. You choose the interleaving.
- **Real state transitions.** Shared state, per-worker locals, lock ownership, and program counters update together.
- **Exhaustive exploration.** A depth-first search visits every enabled schedule in each finite built-in model. A search budget explicitly reports partial results if reached.
- **Rewind and branch.** Select an earlier step, then advance either worker. The abandoned future is discarded.
- **Replay links.** Versioned URL fragments store the experiment, mode, and schedule. Invalid and impossible traces are rejected.
- **Portable reports.** Export the executed prefix as Markdown with operations, results, final state, assumptions, and a replay link.
- **Accessible controls.** Keyboard shortcuts, labeled controls, a skip link, reduced-motion support, and a responsive layout.

The engine has no React or runtime dependencies and can be read independently in [`lib/engine.ts`](lib/engine.ts). Experiments are data plus small state-transition functions in [`lib/experiments.ts`](lib/experiments.ts).

### What the counts mean

The lost-update model has 20 terminal schedules: 18 fail and 2 pass. The fixed atomic model has 2 schedules, both passing. Fixes can change operation counts and the schedule space.

**These counts are not production failure probabilities.** Interleave does not assume a uniformly random scheduler or model timing. Deadlocked schedules are terminal even when workers have not completed.

### Model boundaries

This is a teaching tool, not a production race detector or formal verification service. It models two workers, finite steps, and sequentially consistent memory. It does not model relaxed memory, compiler reordering, thread crashes, network loss, starvation, full database MVCC, or arbitrary programs.

The payment fix prevents concurrent duplicate execution under the model's no-crash assumption; it does not promise exactly-once effects across a payment provider. The write-skew fix uses one global critical section; independently locking different rows is insufficient. See the assumptions inside each experiment and [the model guide](docs/MODEL.md).

## Run locally

Requires Node.js **22.13+** and pnpm **11.19.0**.

```bash
git clone https://github.com/pralav-25/interleave.git
cd interleave
pnpm install --frozen-lockfile
pnpm dev
```

Open the local URL printed by the dev server.

```bash
pnpm test       # Engine, model, replay, and session regression tests
pnpm typecheck  # Strict TypeScript
pnpm lint       # Oxlint
pnpm build      # Production build
```

Built with TypeScript, React, Vinext/Vite, and the provided Shadcn primitives. The web application deploys to Cloudflare Workers through Sites; the simulation itself runs on the client. The development server prints a local test identity from the hosting integration; the lab does not require login. The `.openai/hosting.json` project ID identifies this live demo and is not a credential; use your own project registration for deployment.

## Contribute

The most useful contribution is a **small, explainable bug** with a failing schedule and a fix that passes every modeled schedule. Start with [CONTRIBUTING.md](CONTRIBUTING.md). Contributions that improve accuracy, accessibility, or explanations are welcome.

Ideas for future experiments, **not implemented yet**: cache stampedes, optimistic concurrency retries, and a bounded producer-consumer queue. Every new experiment needs a precise model before UI work.

## Inspiration and references

[The Deadlock Empire](https://github.com/deadlockempire/deadlockempire.github.io) demonstrates the power of letting people control a scheduler. [Nicky Case's interactive explanations](https://github.com/ncase/trust) show how interaction can make abstract ideas tangible. Interleave is an independent implementation, with modern application scenarios, exhaustive schedule inspection, and portable replay links; no code or assets were copied from these projects.

Technical references: [Go memory model](https://go.dev/ref/mem), [PostgreSQL transaction isolation](https://www.postgresql.org/docs/current/transaction-iso.html), [PostgreSQL deadlocks](https://www.postgresql.org/docs/current/explicit-locking.html#LOCKING-DEADLOCKS), [React data-fetching races](https://react.dev/reference/react/useEffect#fetching-data-with-effects), and [Stripe idempotent requests](https://docs.stripe.com/api/idempotent_requests).

## Made by Pralav Singh

[GitHub](https://github.com/pralav-25) · [Portfolio](https://pralav-singh-portfolio.vercel.app)

If Interleave helped a concurrency bug click, a star helps other developers discover it. Sharing an exact failing replay is even more useful.

[MIT](LICENSE) © 2026 Pralav Singh
