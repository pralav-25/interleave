import { test } from 'node:test';
import assert from 'node:assert/strict';
import { DatabaseSync } from 'node:sqlite';
import { readFileSync } from 'node:fs';
import { authStore } from '../server/auth/store.ts';
import {
  digest,
  randomToken,
  SESSION_SECONDS,
} from '../server/auth/protocol.ts';
function fixture() {
  const sqlite = new DatabaseSync(':memory:');
  sqlite.exec(
    readFileSync(
      new URL('../drizzle/0001_round_wendigo.sql', import.meta.url),
      'utf8',
    ),
  );
  const db = {
    prepare(sql: string) {
      const q = sqlite.prepare(sql);
      let values: (string | number)[] = [];
      const stmt = {
        bind(...args: (string | number)[]) {
          values = args;
          return stmt;
        },
        async first() {
          return q.get(...values) ?? null;
        },
        async run() {
          return { meta: { changes: Number(q.run(...values).changes) } };
        },
      };
      return stmt;
    },
  } as unknown as D1Database;
  let clock = 1788892520000;
  return {
    sqlite,
    store: authStore(db, () => clock),
    advance(ms: number) {
      clock += ms;
    },
  };
}
void test('one-time PKCE exchange stores only hashes and preserves the existing owner identity', async () => {
  const f = fixture();
  try {
    const verifier = randomToken();
    const code = await f.store.issueCode(
      { id: 'alice', email: 'alice@example.test' },
      await digest(verifier),
    );
    assert.equal(await f.store.exchange(code, randomToken()), null);
    const token = await f.store.exchange(code, verifier);
    assert.ok(token);
    assert.equal(await f.store.exchange(code, verifier), null);
    assert.deepEqual(
      { ...(await f.store.user(token)) },
      { id: 'alice', email: 'alice@example.test' },
    );
    const row = f.sqlite.prepare('SELECT * FROM gateway_sessions').get()!;
    assert.equal(row.token_hash, await digest(token));
    assert.ok(!JSON.stringify(row).includes(token));
    assert.equal(
      f.sqlite.prepare('SELECT COUNT(*) AS n FROM auth_codes').get()!.n,
      0,
    );
  } finally {
    f.sqlite.close();
  }
});
void test('login codes expire and new logins invalidate old outstanding codes for that owner', async () => {
  const f = fixture();
  try {
    const verifier = randomToken();
    const user = { id: 'alice', email: 'alice@example.test' };
    const first = await f.store.issueCode(user, await digest(verifier));
    const second = await f.store.issueCode(user, await digest(verifier));
    assert.equal(await f.store.exchange(first, verifier), null);
    f.advance(60001);
    assert.equal(await f.store.exchange(second, verifier), null);
  } finally {
    f.sqlite.close();
  }
});
void test('session revocation is isolated, expiry is enforced, and forged tokens fail closed', async () => {
  const f = fixture();
  try {
    const tokens: string[] = [];
    for (const id of ['alice', 'bob']) {
      const verifier = randomToken();
      const code = await f.store.issueCode(
        { id, email: `${id}@example.test` },
        await digest(verifier),
      );
      tokens.push((await f.store.exchange(code, verifier))!);
    }
    await f.store.revoke(tokens[0]);
    assert.equal(await f.store.user(tokens[0]), null);
    assert.equal((await f.store.user(tokens[1]))?.id, 'bob');
    assert.equal(await f.store.user(randomToken()), null);
    assert.equal(await f.store.user('admin'), null);
    f.advance(SESSION_SECONDS * 1000 + 1);
    assert.equal(await f.store.user(tokens[1]), null);
  } finally {
    f.sqlite.close();
  }
});
