import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  advance,
  decodeReplay,
  encodeReplay,
  explore,
  initialRun,
  outcome,
  replay,
  traceMarkdown,
  type Actor,
} from '../lib/engine.ts';
import { experiments } from '../lib/experiments.ts';
import { initialSession, sessionReducer } from '../lib/session.ts';
for (const experiment of experiments) {
  void test(`${experiment.id}: buggy model has a counterexample, fix passes every schedule`, () => {
    const buggy = explore(experiment.make('buggy'));
    const fixed = explore(experiment.make('fixed'));
    assert.equal(buggy.complete, true);
    assert.equal(fixed.complete, true);
    assert.ok(buggy.results.some((r) => r.outcome !== 'pass'));
    assert.ok(fixed.results.length > 0);
    assert.ok(fixed.results.every((r) => r.outcome === 'pass'));
  });
  for (const mode of ['buggy', 'fixed'] as const)
    void test(`${experiment.id}/${mode}: every explored terminal schedule replays exactly`, () => {
      const p = experiment.make(mode);
      const result = explore(p);
      const keys = new Set();
      for (const item of result.results) {
        const r = replay(p, item.schedule);
        assert.equal(outcome(p, r.frame), item.outcome);
        assert.equal(r.events.length, item.schedule.length);
        assert.deepEqual(replay(p, item.schedule), r);
        keys.add(item.schedule.join(''));
      }
      assert.equal(keys.size, result.results.length);
    });
}
void test('lost update: independent combinatorial oracle gives 20 schedules, only serial schedules preserve both writes', () => {
  const e = experiments[0];
  const p = e.make('buggy');
  const r = explore(p);
  assert.equal(r.results.length, 20);
  assert.deepEqual(
    r.results.filter((x) => x.outcome === 'pass').map((x) => x.schedule),
    [
      [0, 0, 0, 1, 1, 1],
      [1, 1, 1, 0, 0, 0],
    ],
  );
  const bad = replay(p, [0, 1, 0, 1, 0, 1]);
  assert.equal(bad.frame.shared.counter, 1);
  assert.equal(outcome(p, bad.frame), 'fail');
});
void test('step copies state instead of corrupting earlier frames', () => {
  const p = experiments[0].make('buggy');
  const before = initialRun(p);
  const frozen = JSON.stringify(before);
  const after = advance(p, before, 0);
  assert.equal(JSON.stringify(before), frozen);
  assert.notEqual(before.frame.locals[0], after.frame.locals[0]);
  assert.equal(after.frame.locals[0].local, 0);
});
void test('deadlock: blocked actors cannot advance', () => {
  const p = experiments.find((e) => e.id === 'deadlock')!.make('buggy');
  const run = replay(p, [0, 1]);
  assert.equal(outcome(p, run.frame), 'deadlock');
  assert.throws(() => advance(p, run, 0));
  assert.throws(() => advance(p, run, 1));
  assert.equal(run.frame.locks.users, 0);
  assert.equal(run.frame.locks.orders, 1);
});
void test('stale response: older response can arrive last but cannot overwrite the fixed UI', () => {
  const e = experiments.find((e) => e.id === 'stale-search')!;
  assert.equal(
    replay(e.make('buggy'), [1, 1, 0, 0]).frame.shared.results,
    'react',
  );
  assert.equal(
    replay(e.make('fixed'), [1, 1, 0, 0]).frame.shared.results,
    'react hooks',
  );
});
void test('exploration budget is reported as partial, never exhaustive', () => {
  const r = explore(experiments[0].make('buggy'), 3);
  assert.equal(r.complete, false);
  assert.equal(r.visited, 3);
});
void test('round-trip every scenario and mode through URL fragments', () => {
  for (const e of experiments)
    for (const mode of ['buggy', 'fixed'] as const) {
      const trace = explore(e.make(mode)).results[0].schedule;
      const encoded = encodeReplay(e.id, mode, trace);
      assert.deepEqual(decodeReplay('#' + encoded, experiments), {
        id: e.id,
        mode,
        schedule: trace,
      });
    }
});
void test('reject unknown, malformed, impossible, oversized and unsupported replays', () => {
  assert.equal(decodeReplay('', experiments), null);
  for (const h of [
    'v=9&lab=lost-update&mode=buggy',
    'v=1&lab=missing&mode=buggy',
    'v=1&lab=lost-update&mode=wrong',
    'v=1&lab=lost-update&mode=buggy&trace=ABC',
    'v=1&lab=lost-update&mode=fixed&trace=AAA',
    'v=1&lab=deadlock&mode=buggy&trace=ABA',
    `v=1&lab=lost-update&mode=buggy&trace=${'A'.repeat(65)}`,
  ])
    assert.throws(() => decodeReplay(h, experiments));
});
void test('rewind and branch discard the abandoned future', () => {
  const loaded = sessionReducer(initialSession, {
    type: 'load',
    session: { ...initialSession, trace: [0, 1, 0, 1, 0, 1], cursor: 6 },
  });
  const rewound = sessionReducer(loaded, { type: 'seek', cursor: 1 });
  const branch = sessionReducer(rewound, { type: 'step', actor: 0 });
  assert.deepEqual(branch.trace, [0, 0]);
  assert.equal(branch.cursor, 2);
  assert.equal(loaded.trace.length, 6);
});
void test('mode changes reset incompatible traces; disabled steps and invalid loads do nothing', () => {
  let s = sessionReducer(initialSession, { type: 'step', actor: 0 });
  s = sessionReducer(s, { type: 'mode', mode: 'fixed' });
  assert.deepEqual(s.trace, []);
  s = sessionReducer(s, { type: 'step', actor: 0 });
  assert.equal(sessionReducer(s, { type: 'step', actor: 0 }), s);
  assert.equal(
    sessionReducer(s, {
      type: 'load',
      session: { ...s, trace: [9] as unknown as Actor[] },
    }),
    s,
  );
  assert.equal(
    sessionReducer(s, { type: 'load', session: { ...s, cursor: NaN } }),
    s,
  );
});
void test('export includes reproducible trace, result, assumptions and attribution', () => {
  const e = experiments[0];
  const md = traceMarkdown(
    e,
    'buggy',
    replay(e.make('buggy'), [0, 1, 0, 1, 0, 1]),
    'https://example.com/#replay',
  );
  assert.match(md, /Result: \*\*fail\*\*/);
  assert.match(md, /\| 6 \| B \|/);
  assert.match(md, /counter": 1/);
  assert.ok(md.includes(e.assumption));
  assert.match(md, /pralav-25/);
});
