# The execution model

Interleave is a finite transition system with exactly two actors. A frame contains shared scalar values, per-worker scalar locals, exclusive lock ownership, and two program counters. The current worker executes one enabled operation, producing a copied frame and an event. Operations cannot access clocks, randomness, network state, or user-supplied executable code.

Each displayed row is atomic. Worker-local order is preserved. A schedule is a sequence of worker IDs. Replaying the same valid sequence against the same experiment and mode yields the same events and final frame.

An execution is terminal when both workers finish, or when work remains and no worker is enabled (deadlock). The experiment's final invariant decides pass/fail for completed executions; a deadlock is always counted as a failure. Invariants are checked at termination, not after every intermediate step.

## Enumeration

The explorer performs depth-first search over enabled worker choices. It counts terminal _schedules_, not unique states. Two schedules can arrive at the same final state and are still two schedules. Branches blocked on a lock do not generate illegal steps. The search stops at a node budget, marking the result partial. All built-in experiments currently exhaust the search below that limit.

Do not interpret a ratio of failing schedules as an estimated production failure rate. Real schedulers, instruction granularity, workloads, clocks, and memory models differ. Buggy and fixed models can have different numbers of atomic steps.

## Independently checked example

Two workers performing three unconstrained operations have `C(6,3) = 20` possible interleavings. In the lost-update model only `AAABBB` and `BBBAAA` preserve both increments. Every other schedule allows both initial reads before a first worker's write, producing a final counter of 1. The suite asserts this combinatorial result independently of the explorer's code.

For inventory, `ABAB` makes both buyers observe stock 1 and then reserve, producing stock -1 and two orders. Atomic reservation instead produces one order and stock 0 for both `AB` and `BA`.

For deadlock, `AB` is already a terminal failing schedule in the buggy model: A holds users and B holds orders. Their second acquire instructions are both disabled. The fixed model starts both workers by acquiring users, so that circular wait is unreachable.

## Per-experiment limitations

- **Lost update:** a sequentially consistent teaching example. This does not specify the behavior of a data race in C or C++, nor claim ordinary `++` is atomic.
- **Inventory:** reservation is a conditional atomic operation in the fix. In real SQL, inspect the affected-row count and coordinate any external side effects separately.
- **Payment:** duplicate concurrent deliveries and one idempotency key; no crashes. A crash between claiming and charging can require recovery in a real application. This model makes no exactly-once guarantee across an external provider.
- **Search:** both requests have already been issued and the latest version is fixed at 2. The guard prevents version 1 from replacing version 2. Cancellation is a separate concern.
- **Deadlock:** exclusive locks, no timeouts, no preemption. A blocked lock acquire does not consume a step. No fairness or starvation claim is made.
- **Write skew:** an abstract read-check-write anomaly, not an MVCC simulator. One global lock protects the cross-row invariant. Separate row locks would not provide the same guarantee.

## Replay stability

Version 1 fragments contain `v`, `lab`, `mode`, and `trace`. Traces are restricted to A/B and capped at 64 operations. Restoration rejects unknown IDs, unsupported versions, invalid modes, illegal moves, and oversized inputs. A replay contains the executed prefix; any unexecuted future is intentionally excluded.

Changing a published model's step order or meaning requires a compatibility strategy. Add a new model ID or a new replay version with a migration. Tests verify current built-in replay round trips; no cross-version migration is implemented yet.

## Validation scope

CI runs strict type checking across the project, linting for authored source, model/session/replay tests, and a production build. The untouched generated Shadcn catalog and its mobile hook are excluded from lint because their upstream patterns conflict with the starter’s strict lint rules; they remain included in TypeScript checking.
