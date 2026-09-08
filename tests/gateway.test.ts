import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createGateway } from '../deploy/vercel/gateway.ts';
import {
  digest,
  sign,
  safeReturnPath,
  randomToken,
} from '../server/auth/protocol.ts';
const config = {
  backendOrigin: 'https://backend.test',
  publicOrigin: 'https://app.test',
  secret: 'test-secret-with-at-least-thirty-two-characters',
};
const now = 1788892520000;
const session = randomToken();
async function start() {
  const response = await createGateway(
    config,
    () => {
      throw new Error('Unexpected network');
    },
    () => now,
  )(new Request('https://app.test/auth/sign-in?returnTo=%2F%23v%3D1'));
  const cookie = response.headers.getSetCookie()[0].split(';')[0];
  return {
    response,
    cookie,
    authorize: new URL(response.headers.get('location')!),
  };
}
void test('sign-in binds state, PKCE challenge, ticket expiry and a private host-only cookie', async () => {
  const { response, authorize } = await start();
  assert.equal(response.status, 303);
  assert.equal(authorize.origin, config.backendOrigin);
  assert.equal(authorize.pathname, '/auth/authorize');
  const q = authorize.searchParams;
  assert.equal(
    q.get('ticket'),
    await sign(
      `${q.get('state')}.${q.get('challenge')}.${q.get('expires')}`,
      config.secret,
    ),
  );
  assert.match(
    response.headers.getSetCookie()[0],
    /__Host-interleave_flow=.*; Path=\/; HttpOnly; Secure; SameSite=Lax; Max-Age=600/,
  );
});
void test('callback rejects missing, tampered, expired and mismatched login state without exchanging', async () => {
  const { cookie, authorize } = await start();
  const url = `https://app.test/auth/callback?code=${randomToken()}&state=${authorize.searchParams.get('state')}`;
  const noNetwork = () => {
    throw new Error('Unexpected exchange');
  };
  for (const [value, requestUrl, clock] of [
    ['', url, now],
    [cookie + 'tampered', url, now],
    [cookie, url.replace('state=', 'other='), now],
    [cookie, url, now + 700000],
  ] as const) {
    const result = await createGateway(
      config,
      noNetwork,
      () => clock,
    )(new Request(requestUrl, { headers: { Cookie: value } }));
    assert.equal(result.headers.get('location'), '/workspace?signin=expired');
    assert.match(result.headers.getSetCookie()[0], /Max-Age=0/);
  }
});
void test('valid callback exchanges only on the server and returns to the original replay', async () => {
  const { cookie, authorize } = await start();
  const handle = createGateway(
    config,
    async (input, init) => {
      assert.equal(
        input instanceof Request
          ? input.url
          : input instanceof URL
            ? input.href
            : input,
        'https://backend.test/api/auth/exchange',
      );
      assert.equal(
        new Headers(init?.headers).get('x-interleave-gateway'),
        config.secret,
      );
      const submitted = JSON.parse(
        typeof init?.body === 'string' ? init.body : '',
      );
      assert.equal(
        await digest(submitted.verifier),
        authorize.searchParams.get('challenge'),
      );
      return Response.json({ token: session });
    },
    () => now,
  );
  const result = await handle(
    new Request(
      `https://app.test/auth/callback?code=${randomToken()}&state=${authorize.searchParams.get('state')}`,
      { headers: { Cookie: cookie } },
    ),
  );
  assert.equal(result.headers.get('location'), '/#v=1');
  assert.equal(result.headers.getSetCookie().length, 2);
  assert.match(
    result.headers.getSetCookie()[1],
    /HttpOnly; Secure; SameSite=Lax; Max-Age=604800/,
  );
  assert.equal(await result.text(), '');
});
void test('gateway strips browser-supplied identity and service headers; sessions stay private', async () => {
  const handle = createGateway(config, async (input, init) => {
    assert.equal(
      input instanceof Request
        ? input.url
        : input instanceof URL
          ? input.href
          : input,
      'https://backend.test/api/investigations',
    );
    const headers = new Headers(init?.headers);
    assert.equal(headers.get('x-interleave-gateway'), config.secret);
    assert.equal(headers.get('x-interleave-session'), session);
    assert.equal(headers.get('oai-authenticated-user-id'), null);
    assert.equal(headers.get('cookie'), null);
    assert.equal(headers.get('authorization'), null);
    return Response.json(
      { investigations: [] },
      {
        headers: { 'Set-Cookie': 'upstream=secret', 'Cache-Control': 'public' },
      },
    );
  });
  const result = await handle(
    new Request('https://app.test/api/investigations', {
      headers: {
        Cookie: `__Host-interleave_session=${session}; unrelated=private`,
        'oai-authenticated-user-id': 'admin',
        'x-interleave-session': 'forged',
        'x-interleave-gateway': 'forged',
        Authorization: 'Bearer forged',
      },
    }),
  );
  assert.equal(result.status, 200);
  assert.equal(result.headers.get('set-cookie'), null);
  assert.equal(result.headers.get('cache-control'), 'private, no-store');
});
void test('mutations require same origin and are capped by actual byte count', async () => {
  const handle = createGateway(config, () => {
    throw new Error('Unexpected network');
  });
  for (const origin of ['', 'https://attacker.test']) {
    const result = await handle(
      new Request('https://app.test/api/investigations', {
        method: 'POST',
        headers: { Origin: origin },
        body: '{}',
      }),
    );
    assert.equal(result.status, 403);
  }
  const large = await handle(
    new Request('https://app.test/api/investigations', {
      method: 'POST',
      headers: { Origin: 'https://app.test' },
      body: '💥'.repeat(13000),
    }),
  );
  assert.equal(large.status, 413);
});
void test('sign-out revokes the server session before clearing cookies', async () => {
  let revoked = false;
  const handle = createGateway(config, async (input, init) => {
    assert.equal(
      input instanceof Request
        ? input.url
        : input instanceof URL
          ? input.href
          : input,
      'https://backend.test/api/auth/revoke',
    );
    assert.equal(init?.method, 'POST');
    assert.equal(
      new Headers(init?.headers).get('x-interleave-session'),
      session,
    );
    revoked = true;
    return Response.json({ signedOut: true });
  });
  const result = await handle(
    new Request('https://app.test/signout-with-chatgpt', {
      headers: { Cookie: `__Host-interleave_session=${session}` },
    }),
  );
  assert.ok(revoked);
  assert.equal(result.headers.get('location'), '/');
  assert.ok(
    result.headers.getSetCookie().every((s) => s.includes('Max-Age=0')),
  );
  const denied = await handle(
    new Request('https://app.test/signout-with-chatgpt', {
      headers: { 'sec-fetch-site': 'cross-site' },
    }),
  );
  assert.equal(denied.status, 403);
});
void test('proxy preserves RSC streams, blocks external redirects, and hides auth exchange routes', async () => {
  const handle = createGateway(config, async (_input, init) => {
    assert.equal(new Headers(init?.headers).get('rsc'), '1');
    return new Response('RSC stream', {
      headers: {
        'Content-Type': 'text/x-component',
        'Content-Encoding': 'gzip',
        'Content-Length': '10',
      },
    });
  });
  const result = await handle(
    new Request('https://app.test/workspace', { headers: { RSC: '1' } }),
  );
  assert.equal(await result.text(), 'RSC stream');
  assert.equal(result.headers.get('content-type'), 'text/x-component');
  assert.equal(result.headers.get('content-encoding'), null);
  assert.equal(result.headers.get('content-length'), null);
  const bad = createGateway(
    config,
    async () =>
      new Response(null, {
        status: 302,
        headers: { Location: 'https://evil.test' },
      }),
  );
  assert.equal((await bad(new Request('https://app.test/'))).status, 502);
  assert.equal(
    (
      await handle(
        new Request('https://app.test/api/auth/exchange', { method: 'POST' }),
      )
    ).status,
    404,
  );
});
void test('return paths reject external origins, control characters and login loops', () => {
  for (const value of [
    'https://evil.test',
    '//evil.test',
    '/\\evil.test',
    '/\r\nevil',
    '/auth/callback',
    '/api/session',
  ])
    assert.equal(safeReturnPath(value), '/workspace');
  assert.equal(safeReturnPath('/#v=1'), '/#v=1');
});
