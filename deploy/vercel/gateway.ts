import {
  digest,
  randomToken,
  sign,
  matchesSecret,
  validToken,
  safeReturnPath,
  normalizeOrigin,
  SESSION_SECONDS,
} from '../../server/auth/protocol.ts';
export interface GatewayConfig {
  backendOrigin: string;
  publicOrigin: string;
  secret: string;
}
type Fetcher = (
  input: string | URL | Request,
  init?: RequestInit,
) => Promise<Response>;
const sessionName = '__Host-interleave_session';
const flowName = '__Host-interleave_flow';
function cookies(request: Request) {
  return Object.fromEntries(
    (request.headers.get('cookie') ?? '').split(';').map((s) => {
      const i = s.indexOf('=');
      return [s.slice(0, i).trim(), s.slice(i + 1).trim()];
    }),
  );
}
function cookie(name: string, value: string, seconds: number) {
  return `${name}=${value}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=${seconds}`;
}
function redirect(location: string, values: string[] = []) {
  const headers = new Headers({
    Location: location,
    'Cache-Control': 'private, no-store',
    'Referrer-Policy': 'no-referrer',
  });
  for (const value of values) headers.append('Set-Cookie', value);
  return new Response(null, { status: 303, headers });
}
function error(message: string, status: number) {
  return Response.json(
    { error: message },
    {
      status,
      headers: {
        'Cache-Control': 'private, no-store',
        'X-Content-Type-Options': 'nosniff',
      },
    },
  );
}
async function body(request: Request) {
  if (['GET', 'HEAD'].includes(request.method)) return undefined;
  if (Number(request.headers.get('content-length')) > 48000)
    throw new Error('body_limit');
  const reader = request.body?.getReader();
  if (!reader) return undefined;
  const parts: Uint8Array[] = [];
  let size = 0;
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      size += value.byteLength;
      if (size > 48000) {
        await reader.cancel();
        throw new Error('body_limit');
      }
      parts.push(value);
    }
  } finally {
    reader.releaseLock();
  }
  const output = new Uint8Array(size);
  let offset = 0;
  for (const part of parts) {
    output.set(part, offset);
    offset += part.length;
  }
  return output;
}
export function createGateway(
  config: GatewayConfig,
  fetcher: Fetcher = fetch,
  now = () => Date.now(),
) {
  const backend = normalizeOrigin(config.backendOrigin);
  const origin = normalizeOrigin(config.publicOrigin);
  if (config.secret.length < 32)
    throw new Error('Gateway secret is not configured.');
  async function upstream(path: string, init: RequestInit = {}) {
    return fetcher(new URL(path, backend), {
      ...init,
      redirect: 'manual',
      signal: AbortSignal.timeout(20000),
    });
  }
  return async function handle(request: Request): Promise<Response> {
    try {
      const url = new URL(request.url);
      const stored = cookies(request);
      const token = validToken(stored[sessionName]) ? stored[sessionName] : '';
      const serviceHeaders = {
        'x-interleave-gateway': config.secret,
        'x-interleave-session': token,
      };
      if (url.pathname === '/auth/sign-in') {
        if (request.method !== 'GET') return error('Method not allowed.', 405);
        const returnTo = safeReturnPath(
          url.searchParams.get('returnTo') ?? '/workspace',
        );
        // Preview hosts must complete login on the fixed production origin.
        if (url.origin !== origin)
          return redirect(
            `${origin}/auth/sign-in?returnTo=${encodeURIComponent(returnTo)}`,
          );
        const state = randomToken();
        const verifier = randomToken();
        const challenge = await digest(verifier);
        const expires = String(now() + 600000);
        const ticket = await sign(
          `${state}.${challenge}.${expires}`,
          config.secret,
        );
        const flow = encodeURIComponent(
          JSON.stringify({
            state,
            verifier,
            returnTo,
            expires: Number(expires),
          }),
        );
        const flowSignature = await sign(flow, config.secret);
        const authorize = new URL('/auth/authorize', backend);
        for (const [key, value] of Object.entries({
          state,
          challenge,
          expires,
          ticket,
        }))
          authorize.searchParams.set(key, value);
        return redirect(authorize.href, [
          cookie(flowName, `${flow}.${flowSignature}`, 600),
        ]);
      }
      if (url.pathname === '/auth/callback') {
        const clear = cookie(flowName, '', 0);
        if (request.method !== 'GET' || url.origin !== origin)
          return error('Invalid callback.', 400);
        const fail = () => redirect('/workspace?signin=expired', [clear]);
        const value = stored[flowName] ?? '';
        if (value.length > 7000) return fail();
        const separator = value.lastIndexOf('.');
        const encoded = value.slice(0, separator);
        if (
          separator < 1 ||
          !(await matchesSecret(
            value.slice(separator + 1),
            await sign(encoded, config.secret),
          ))
        )
          return fail();
        let flow: {
          state: string;
          verifier: string;
          returnTo: string;
          expires: number;
        };
        try {
          flow = JSON.parse(decodeURIComponent(encoded));
        } catch {
          return fail();
        }
        const code = url.searchParams.get('code') ?? '';
        if (
          !validToken(code) ||
          flow.state !== url.searchParams.get('state') ||
          !validToken(flow.verifier) ||
          !Number.isFinite(flow.expires) ||
          flow.expires < now()
        )
          return fail();
        const exchange = await upstream('/api/auth/exchange', {
          method: 'POST',
          headers: { ...serviceHeaders, 'Content-Type': 'application/json' },
          body: JSON.stringify({ code, verifier: flow.verifier }),
        });
        if (!exchange.ok) return fail();
        const result = (await exchange.json()) as { token?: string };
        if (!validToken(result.token)) return fail();
        return redirect(safeReturnPath(flow.returnTo), [
          clear,
          cookie(sessionName, result.token, SESSION_SECONDS),
        ]);
      }
      if (url.pathname === '/signout-with-chatgpt') {
        if (
          request.method !== 'GET' ||
          request.headers.get('sec-fetch-site') === 'cross-site'
        )
          return error('Open Interleave to sign out.', 403);
        if (token) {
          const revoked = await upstream('/api/auth/revoke', {
            method: 'POST',
            headers: serviceHeaders,
          });
          if (!revoked.ok)
            return error('Sign-out could not complete. Please retry.', 503);
        }
        return redirect('/', [
          cookie(sessionName, '', 0),
          cookie(flowName, '', 0),
        ]);
      }
      // Auth exchange and authorization are only exposed on the backend origin.
      if (
        url.pathname.startsWith('/api/auth/') ||
        url.pathname.startsWith('/auth/') ||
        url.pathname.startsWith('/signin-with-chatgpt')
      )
        return error('Not found.', 404);
      if (!['GET', 'HEAD', 'POST', 'PATCH', 'DELETE'].includes(request.method))
        return error('Method not allowed.', 405);
      if (
        !['GET', 'HEAD'].includes(request.method) &&
        request.headers.get('origin') !== url.origin
      )
        return error('Request origin is not allowed.', 403);
      const headers = new Headers(serviceHeaders);
      for (const name of [
        'accept',
        'content-type',
        'if-match',
        'rsc',
        'next-router-state-tree',
        'next-router-prefetch',
        'next-url',
        'x-vinext-rsc',
        'x-vinext-prefetch',
      ]) {
        const value = request.headers.get(name);
        if (value) headers.set(name, value);
      }
      headers.set('Origin', backend);
      const response = await upstream(url.pathname + url.search, {
        method: request.method,
        headers,
        body: await body(request),
      });
      const output = new Headers(response.headers);
      for (const name of [
        'set-cookie',
        'content-encoding',
        'content-length',
        'transfer-encoding',
        'connection',
      ])
        output.delete(name);
      output.set('Cache-Control', 'private, no-store');
      output.set('Referrer-Policy', 'strict-origin-when-cross-origin');
      output.set('X-Content-Type-Options', 'nosniff');
      const location = output.get('location');
      if (location) {
        const destination = new URL(location, backend);
        if (destination.origin !== backend)
          return error('Unexpected upstream redirect.', 502);
        output.set(
          'Location',
          destination.pathname + destination.search + destination.hash,
        );
      }
      return new Response(response.body, {
        status: response.status,
        headers: output,
      });
    } catch (e) {
      if (e instanceof Error && e.message === 'body_limit')
        return error('Request is too large.', 413);
      return error(
        'Interleave is temporarily unavailable. Please try again.',
        503,
      );
    }
  };
}
