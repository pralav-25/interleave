import { test } from 'node:test';
import assert from 'node:assert/strict';
import { DatabaseSync } from 'node:sqlite';
import { readFileSync } from 'node:fs';
import { investigationStore, StoreError } from '../server/investigations.ts';
import {
  createInvestigationSchema,
  updateInvestigationSchema,
  MAX_INVESTIGATIONS,
} from '../lib/investigations.ts';
import { readJson, requireSameOrigin } from '../server/http.ts';
function fixture() {
  const sqlite = new DatabaseSync(':memory:');
  sqlite.exec(
    readFileSync(
      new URL('../drizzle/0000_bent_harrier.sql', import.meta.url),
      'utf8',
    ),
  );
  const db = {
    prepare(sql: string) {
      const query = sqlite.prepare(sql);
      let values: (string | number | null)[] = [];
      const statement = {
        bind(...input: (string | number | null)[]) {
          values = input;
          return statement;
        },
        async first() {
          return query.get(...values) ?? null;
        },
        async all() {
          return { results: query.all(...values) };
        },
        async run() {
          const result = query.run(...values);
          return { meta: { changes: Number(result.changes) } };
        },
      };
      return statement;
    },
  } as unknown as D1Database;
  return { sqlite, store: investigationStore(db) };
}
const input = {
  title: 'Counter regression',
  experimentId: 'lost-update',
  mode: 'buggy' as const,
  trace: 'ABABAB',
  notes: 'Both read zero.',
};
void test('saved investigations survive storage round trips with owner-only reads', async () => {
  const { sqlite, store } = fixture();
  try {
    const a = await store.create('alice', input);
    const b = await store.create('bob', { ...input, title: 'Bob private' });
    assert.equal((await store.list('alice')).length, 1);
    assert.equal((await store.get('alice', a.id)).notes, input.notes);
    await assert.rejects(
      () => store.get('bob', a.id),
      (e: unknown) => e instanceof StoreError && e.status === 404,
    );
    assert.equal((await store.get('bob', b.id)).title, 'Bob private');
  } finally {
    sqlite.close();
  }
});
void test('cross-user update and delete fail without exposing or changing the record', async () => {
  const { sqlite, store } = fixture();
  try {
    const a = await store.create('alice', input);
    await assert.rejects(
      () =>
        store.update('bob', a.id, {
          title: 'Intrusion',
          notes: 'changed',
          version: 1,
        }),
      (e: unknown) => e instanceof StoreError && e.status === 404,
    );
    await assert.rejects(
      () => store.delete('bob', a.id, 1),
      (e: unknown) => e instanceof StoreError && e.status === 404,
    );
    assert.equal((await store.get('alice', a.id)).version, 1);
  } finally {
    sqlite.close();
  }
});
void test('optimistic concurrency prevents lost notes and stale deletes', async () => {
  const { sqlite, store } = fixture();
  try {
    const a = await store.create('alice', input);
    await store.update('alice', a.id, {
      title: 'First writer',
      notes: 'Keep this',
      version: 1,
    });
    await assert.rejects(
      () =>
        store.update('alice', a.id, {
          title: 'Stale writer',
          notes: 'Overwrite',
          version: 1,
        }),
      (e: unknown) => e instanceof StoreError && e.status === 409,
    );
    await assert.rejects(
      () => store.delete('alice', a.id, 1),
      (e: unknown) => e instanceof StoreError && e.status === 409,
    );
    const row = await store.get('alice', a.id);
    assert.equal(row.notes, 'Keep this');
    assert.equal(row.version, 2);
    await store.delete('alice', a.id, 2);
    assert.equal((await store.list('alice')).length, 0);
  } finally {
    sqlite.close();
  }
});
void test('quota is enforced by the insert and recovers after a deletion', async () => {
  const { sqlite, store } = fixture();
  try {
    for (let i = 0; i < MAX_INVESTIGATIONS; i++)
      await store.create('alice', { ...input, title: `Run ${i}` });
    await assert.rejects(
      () => store.create('alice', input),
      (e: unknown) => e instanceof StoreError && e.status === 409,
    );
    assert.equal((await store.list('alice')).length, 50);
    await store.create('bob', input);
    const first = (await store.list('alice'))[0];
    await store.delete('alice', first.id, first.version);
    await store.create('alice', input);
    assert.equal((await store.list('alice')).length, 50);
  } finally {
    sqlite.close();
  }
});
void test('owner listing uses its index', () => {
  const { sqlite } = fixture();
  try {
    const plan = sqlite
      .prepare(
        'EXPLAIN QUERY PLAN SELECT id FROM investigations WHERE owner_id = ? ORDER BY updated_at DESC, id DESC LIMIT 50',
      )
      .all('alice');
    assert.match(JSON.stringify(plan), /idx_investigations_owner_updated/);
  } finally {
    sqlite.close();
  }
});
void test('create validation rejects fabricated ownership, impossible schedules and oversized fields', () => {
  assert.equal(createInvestigationSchema.safeParse(input).success, true);
  for (const value of [
    { ...input, ownerId: 'admin' },
    { ...input, title: ' ' },
    { ...input, trace: 'ABAZ' },
    { ...input, experimentId: 'unknown' },
    { ...input, mode: 'fixed', trace: 'AAAA' },
    { ...input, title: 'a'.repeat(101) },
    { ...input, notes: 'a'.repeat(10001) },
  ])
    assert.equal(createInvestigationSchema.safeParse(value).success, false);
  assert.equal(
    updateInvestigationSchema.safeParse({
      title: 'Valid',
      notes: '',
      version: 0,
    }).success,
    false,
  );
});
void test('same-origin mutation guard rejects absent and cross-site origins', () => {
  assert.doesNotThrow(() =>
    requireSameOrigin(
      new Request('https://interleave.test/api/investigations', {
        headers: { Origin: 'https://interleave.test' },
      }),
    ),
  );
  for (const origin of [undefined, 'https://attacker.test', 'null'])
    assert.throws(
      () =>
        requireSameOrigin(
          new Request('https://interleave.test/api/investigations', {
            headers: origin ? { Origin: origin } : {},
          }),
        ),
      StoreError,
    );
});
void test('bounded JSON reader validates content type, actual bytes and malformed JSON', async () => {
  assert.deepEqual(
    await readJson(
      new Request('https://test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: '{"ok":true}',
      }),
    ),
    { ok: true },
  );
  for (const [headers, body, max] of [
    [{ 'Content-Type': 'text/plain' }, '{}', 100],
    [{ 'Content-Type': 'application/json' }, '{', 100],
    [{ 'Content-Type': 'application/json' }, '"💥💥"', 5],
  ] as const) {
    await assert.rejects(
      () =>
        readJson(
          new Request('https://test', { method: 'POST', headers, body }),
          max,
        ),
      StoreError,
    );
  }
});
