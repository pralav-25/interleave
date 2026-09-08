import type {
  Experiment,
  Operation,
  Program,
  Frame,
  Actor,
  Mode,
} from './engine.ts';
const op = (code: string, run: Operation['run']): Operation => ({ code, run });
const both = (steps: Operation[]): [Operation[], Operation[]] => [steps, steps];
const n = (v: unknown) => Number(v);
const lock = (key: string): Operation => ({
  code: `lock(${key})`,
  enabled: (f, a) => f.locks[key] == null || f.locks[key] === a,
  run: (f, a) => {
    f.locks[key] = a;
    return `Acquired ${key}.`;
  },
});
const unlock = (key: string): Operation =>
  op(`unlock(${key})`, (f) => {
    f.locks[key] = null;
    return `Released ${key}.`;
  });
const name = (a: Actor) => (a === 0 ? 'A' : 'B');
export const experiments: Experiment[] = [
  {
    id: 'lost-update',
    title: 'Lost update',
    subtitle: 'The missing increment',
    headline: 'Two increments. One disappears.',
    category: 'Shared memory',
    description:
      'Both workers read the same counter. You decide who writes first. Make the bug happen, then explore the fix.',
    explanation:
      'A read, a calculation, and a write are three separate steps. If both workers read 0 before either writes, each calculates 1. The second write overwrites the first.',
    fix: 'An atomic increment reads and updates the counter in one indivisible operation. The scheduler cannot interrupt it halfway.',
    assumption:
      'Two workers, one increment each, sequentially consistent memory. Each displayed row is atomic. The fixed atomic increment is a model primitive, not a claim that ordinary ++ is atomic.',
    source: {
      label: 'Read the Go memory model',
      url: 'https://go.dev/ref/mem',
    },
    make: (mode) => ({
      initial: { counter: 0 },
      actors: ['Worker A', 'Worker B'],
      expected: 'counter = 2 when both workers finish',
      invariant: (f) => f.shared.counter === 2,
      steps:
        mode === 'fixed'
          ? both([
              op('atomicAdd(counter, 1)', (f) => {
                f.shared.counter = n(f.shared.counter) + 1;
                return `Counter atomically becomes ${f.shared.counter}.`;
              }),
            ])
          : both([
              op('local = counter', (f, a) => {
                f.locals[a].local = f.shared.counter;
                return `Worker ${name(a)} reads ${f.shared.counter} into its own local value.`;
              }),
              op('local = local + 1', (f, a) => {
                f.locals[a].local = n(f.locals[a].local) + 1;
                return `Worker ${name(a)} calculates ${f.locals[a].local}. Shared counter is still ${f.shared.counter}.`;
              }),
              op('counter = local', (f, a) => {
                f.shared.counter = f.locals[a].local;
                return `Worker ${name(a)} writes ${f.shared.counter} to the shared counter.`;
              }),
            ]),
    }),
  },
  {
    id: 'oversold-inventory',
    title: 'Oversold inventory',
    subtitle: 'One seat, two buyers',
    headline: 'One seat. Two happy customers.',
    category: 'Check then act',
    description:
      'Two customers try to book the last seat. Separate availability checks let both believe it is theirs.',
    explanation:
      'Both buyers can observe one remaining seat. A later purchase trusts that stale observation, so both orders succeed and inventory becomes negative.',
    fix: 'Combine the stock check and decrement into one atomic conditional update. In a database, check the affected-row count before confirming the order.',
    assumption:
      'Two buyers and one unit of stock. The fixed check-and-decrement is one atomic model step, corresponding to a conditional database update.',
    source: {
      label: 'PostgreSQL concurrency control',
      url: 'https://www.postgresql.org/docs/current/transaction-iso.html',
    },
    make: (mode) => ({
      initial: { stock: 1, orders: 0 },
      actors: ['Buyer A', 'Buyer B'],
      expected: 'orders ≤ 1 and stock ≥ 0',
      invariant: (f) => n(f.shared.orders) <= 1 && n(f.shared.stock) >= 0,
      steps:
        mode === 'fixed'
          ? both([
              op('atomicReserveIf(stock > 0)', (f) => {
                if (n(f.shared.stock) > 0) {
                  f.shared.stock = n(f.shared.stock) - 1;
                  f.shared.orders = n(f.shared.orders) + 1;
                  return 'Reserved the only seat atomically.';
                }
                return 'Sold out. No order is created.';
              }),
            ])
          : both([
              op('available = stock > 0', (f, a) => {
                f.locals[a].available = n(f.shared.stock) > 0;
                return `Buyer ${name(a)} sees ${f.locals[a].available ? 'an available seat' : 'sold out'}.`;
              }),
              op('if available: reserve()', (f, a) => {
                if (f.locals[a].available) {
                  f.shared.stock = n(f.shared.stock) - 1;
                  f.shared.orders = n(f.shared.orders) + 1;
                  return `Order confirmed. ${f.shared.stock} seats remain.`;
                }
                return 'No seat available. Order rejected.';
              }),
            ]),
    }),
  },
  {
    id: 'double-payment',
    title: 'Double payment',
    subtitle: 'The duplicate request',
    headline: 'Same request. Charged twice.',
    category: 'Idempotency',
    description:
      'A payment and its retry arrive together with the same key. Can you make both requests charge the customer?',
    explanation:
      'Checking whether a key exists does not reserve it. Two handlers can both see an unused key, charge the customer, then mark that key complete.',
    fix: 'Atomically claim the key before charging. Only its owner proceeds. This model excludes crashes; a production design must also handle failures between claiming and charging.',
    assumption:
      'Two deliveries of one idempotency key, no crashes, timeouts, or lost writes. Atomic claim prevents concurrent duplicates here; it does not establish exactly-once external payment processing.',
    source: {
      label: 'Stripe idempotent requests',
      url: 'https://docs.stripe.com/api/idempotent_requests',
    },
    make: (mode) => {
      const charge = op('if owner: charge(50)', (f, a) => {
        if (f.locals[a].owner) {
          f.shared.charges = n(f.shared.charges) + 1;
          f.shared.total = n(f.shared.total) + 50;
          return 'Charged $50.';
        }
        return 'Duplicate request skipped.';
      });
      return {
        initial: { claimed: false, charges: 0, total: 0 },
        actors: ['Request', 'Retry'],
        expected: 'charges = 1 when both requests finish',
        invariant: (f) => f.shared.charges === 1,
        steps:
          mode === 'fixed'
            ? both([
                op('owner = atomicClaim(key)', (f, a) => {
                  f.locals[a].owner = !f.shared.claimed;
                  if (f.locals[a].owner) f.shared.claimed = true;
                  return f.locals[a].owner
                    ? 'Key claimed exclusively.'
                    : 'Key already claimed. This request is a duplicate.';
                }),
                charge,
              ])
            : both([
                op('owner = !seen(key)', (f, a) => {
                  f.locals[a].owner = !f.shared.claimed;
                  return `The key is ${f.shared.claimed ? 'already recorded' : 'not recorded yet'}.`;
                }),
                charge,
                op('record(key)', (f) => {
                  f.shared.claimed = true;
                  return 'Recorded the idempotency key.';
                }),
              ]),
      } as Program;
    },
  },
  {
    id: 'stale-search',
    title: 'Stale search',
    subtitle: 'The late response wins',
    headline: 'Your old search arrives last.',
    category: 'Async responses',
    description:
      'You searched for “react”, then “react hooks”. Both requests are in flight. Make the older response overwrite the newer results.',
    explanation:
      'Network responses can finish in a different order from requests. Updating the interface on every response allows an older result to replace the latest search.',
    fix: 'Tag requests with a monotonically increasing version. Commit a response only when its version matches the latest issued request.',
    assumption:
      'Both requests are already issued: A is version 1 and B is version 2. The latest query stays version 2 during this finite model. Each receive and commit is a separate atomic step.',
    source: {
      label: 'React: fetching data and race conditions',
      url: 'https://react.dev/reference/react/useEffect#fetching-data-with-effects',
    },
    make: (mode) => {
      const actorSteps = (a: Actor): Operation[] => [
        op(`response = receive(v${a + 1})`, (f) => {
          f.locals[a].response = a === 0 ? 'react' : 'react hooks';
          return `Response for “${f.locals[a].response}” arrived.`;
        }),
        op(
          mode === 'fixed'
            ? `if v${a + 1} == latest: show()`
            : 'show(response)',
          (f) => {
            if (mode === 'fixed' && a + 1 !== f.shared.latest)
              return 'Ignored the stale version 1 response.';
            f.shared.results = f.locals[a].response;
            f.shared.shown = a + 1;
            return `Showing “${f.shared.results}” results.`;
          },
        ),
      ];
      return {
        initial: { latest: 2, shown: 0, results: 'waiting' },
        actors: ['Old query', 'New query'],
        expected: 'shown = latest when both responses finish',
        invariant: (f) => f.shared.shown === f.shared.latest,
        steps: [actorSteps(0), actorSteps(1)],
      };
    },
  },
  {
    id: 'deadlock',
    title: 'Deadlock',
    subtitle: 'Everybody is waiting',
    headline: 'Two locks. Nobody moves.',
    category: 'Lock ordering',
    description:
      'Each worker needs both locks. Give each worker one lock, then watch both wait for the other forever.',
    explanation:
      'Worker A holds the users lock and waits for orders. Worker B holds orders and waits for users. Neither can reach the instruction that releases its lock.',
    fix: 'Acquire shared locks in the same global order. One worker may wait, but it waits while holding no lock needed by the other.',
    assumption:
      'Two exclusive, non-reentrant locks, no timeouts or forced unlocks. A blocked acquire does not advance. Deadlock means unfinished workers exist and no operation is enabled.',
    source: {
      label: 'PostgreSQL explicit locking and deadlocks',
      url: 'https://www.postgresql.org/docs/current/explicit-locking.html#LOCKING-DEADLOCKS',
    },
    make: (mode) => {
      const worker = (first: string, second: string): Operation[] => [
        lock(first),
        lock(second),
        op('updateBoth()', (f) => {
          f.shared.completed = n(f.shared.completed) + 1;
          return 'Updated both resources.';
        }),
        unlock(second),
        unlock(first),
      ];
      return {
        initial: { completed: 0 },
        actors: ['Worker A', 'Worker B'],
        expected: 'both workers finish without deadlock',
        invariant: (f) => f.shared.completed === 2,
        steps: [
          worker('users', 'orders'),
          worker(
            mode === 'fixed' ? 'users' : 'orders',
            mode === 'fixed' ? 'orders' : 'users',
          ),
        ],
      };
    },
  },
  {
    id: 'write-skew',
    title: 'Write skew',
    subtitle: 'Nobody is on call',
    headline: 'Two doctors. Zero on call.',
    category: 'Transaction anomaly',
    description:
      'Each doctor can go off call if the other is available. Both check, both leave. Keep at least one doctor on duty.',
    explanation:
      'The workers write different fields, so there is no direct write conflict. The shared rule is still broken when each acts on an observation that the other is on call.',
    fix: 'Serialize the check and update using one shared lock. The second doctor observes the first doctor’s committed decision before deciding whether to leave.',
    assumption:
      'An abstract read-check-write model of the on-call invariant, not a full MVCC implementation. The fixed version uses one global critical section; row locks on separate doctor rows would be insufficient.',
    source: {
      label: 'PostgreSQL transaction isolation',
      url: 'https://www.postgresql.org/docs/current/transaction-iso.html',
    },
    make: (mode: Mode) => {
      const worker = (a: Actor): Operation[] => {
        const own = a === 0 ? 'alice' : 'bob';
        const other = a === 0 ? 'bob' : 'alice';
        const steps = [
          op(`canLeave = ${other}.onCall`, (f: Frame) => {
            f.locals[a].canLeave = f.shared[other];
            return `${other} is ${f.shared[other] ? 'on call. Leaving looks safe.' : 'off call. This doctor must stay.'}`;
          }),
          op(`if canLeave: ${own} = off`, (f: Frame) => {
            if (f.locals[a].canLeave) {
              f.shared[own] = false;
              return `${own} goes off call.`;
            }
            return `${own} stays on call.`;
          }),
        ];
        return mode === 'fixed'
          ? [lock('roster'), ...steps, unlock('roster')]
          : steps;
      };
      return {
        initial: { alice: true, bob: true },
        actors: ['Alice', 'Bob'],
        expected: 'alice OR bob must remain on call',
        invariant: (f) => Boolean(f.shared.alice || f.shared.bob),
        steps: [worker(0), worker(1)],
      };
    },
  },
];
export const defaultExperiment = experiments[0];
