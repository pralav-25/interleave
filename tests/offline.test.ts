import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import { readFileSync } from 'node:fs';

type WorkerEvent = {
  request?: Request;
  respondWith: (response: Promise<Response>) => void;
  waitUntil: (work: Promise<unknown>) => void;
  data?: { type: string };
};
function worker() {
  const listeners = new Map<string, (event: WorkerEvent) => void>();
  const records = new Map<string, Response>();
  const writes: string[] = [];
  let online = true;
  const key = (input: Request | string) =>
    typeof input === 'string' ? input : new URL(input.url).pathname;
  const cache = {
    match: async (input: Request | string) => records.get(key(input)),
    put: async (input: Request | string, response: Response) => {
      writes.push(key(input));
      records.set(key(input), response);
    },
    addAll: async () => {},
  };
  vm.runInNewContext(readFileSync('public/sw.js', 'utf8'), {
    URL,
    Response,
    self: {
      location: { origin: 'https://interleave.test' },
      addEventListener: (
        type: string,
        listener: (event: WorkerEvent) => void,
      ) => listeners.set(type, listener),
    },
    caches: { open: async () => cache, match: cache.match },
    fetch: async () => {
      if (!online) throw new Error('offline');
      return new Response('<html>Public lab</html>', {
        headers: { 'Content-Type': 'text/html' },
      });
    },
  });
  return {
    records,
    writes,
    setOffline: () => {
      online = false;
    },
    request: (
      path: string,
      options: {
        mode?: string;
        headers?: Record<string, string>;
        method?: string;
      } = {},
    ) => {
      let result: Promise<Response> | undefined;
      const request = {
        url: `https://interleave.test${path}`,
        method: options.method ?? 'GET',
        mode: options.mode ?? 'cors',
        headers: new Headers(options.headers),
      } as Request;
      listeners.get('fetch')!({
        request,
        respondWith: (response) => {
          result = response;
        },
        waitUntil: () => {},
      });
      return result;
    },
  };
}
void test('offline worker never intercepts private API or RSC data requests', () => {
  const app = worker();
  for (const path of [
    '/api/investigations',
    '/api/session',
    '/auth/authorize',
    '/workspace',
  ])
    assert.equal(app.request(path), undefined);
  assert.equal(app.request('/lab', { headers: { RSC: '1' } }), undefined);
  assert.equal(
    app.request('/lab', { headers: { 'X-RSC-Navigation': '1' } }),
    undefined,
  );
  assert.equal(
    app.request('/api/investigations', { method: 'POST' }),
    undefined,
  );
  assert.equal(app.request('/_next/static/test.js?token=secret'), undefined);
  assert.deepEqual(app.writes, []);
});
void test('public lab navigation persists and returns the same shell offline', async () => {
  const app = worker();
  const first = await app.request('/lab', { mode: 'navigate' });
  assert.equal(await first!.text(), '<html>Public lab</html>');
  assert.deepEqual(app.writes, ['/lab']);
  app.setOffline();
  assert.equal(
    await (await app.request('/lab', { mode: 'navigate' }))!.text(),
    '<html>Public lab</html>',
  );
});
void test('private navigation is never cached and shows only a neutral offline fallback', async () => {
  const app = worker();
  app.records.set(
    '/offline.html',
    new Response('Reconnect to open your workspace.'),
  );
  await app.request('/workspace', { mode: 'navigate' });
  assert.deepEqual(app.writes, []);
  app.setOffline();
  assert.equal(
    await (await app.request('/workspace', { mode: 'navigate' }))!.text(),
    'Reconnect to open your workspace.',
  );
});
void test('unknown or query-bearing lab navigations cannot replace the offline public shell', async () => {
  const app = worker();
  await app.request('/lab?user=example', { mode: 'navigate' });
  await app.request('/auth/sign-in', { mode: 'navigate' });
  assert.deepEqual(app.writes, []);
});
