import { getChatGPTUser } from '@/app/chatgpt-auth';
import { database } from '@/server/database';
import { authStore } from '@/server/auth/store';
import { authConfig } from '@/server/auth/config';
import { sign, matchesSecret, validToken } from '@/server/auth/protocol';
import { json, failure } from '@/server/http';
export async function GET(request: Request) {
  try {
    const config = authConfig();
    const url = new URL(request.url);
    const state = url.searchParams.get('state') ?? '';
    const challenge = url.searchParams.get('challenge') ?? '';
    const expires = url.searchParams.get('expires') ?? '';
    const ticket = url.searchParams.get('ticket') ?? '';
    if (
      !validToken(state) ||
      !validToken(challenge) ||
      !/^\d{13}$/.test(expires) ||
      Number(expires) < Date.now() ||
      Number(expires) > Date.now() + 600000 ||
      !(await matchesSecret(
        ticket,
        await sign(`${state}.${challenge}.${expires}`, config.secret),
      ))
    )
      return json(
        { error: 'This sign-in link expired. Start again from Interleave.' },
        400,
      );
    const user = await getChatGPTUser();
    if (!user)
      return new Response(null, {
        status: 302,
        headers: {
          Location: `/signin-with-chatgpt?return_to=${encodeURIComponent(url.pathname + url.search)}`,
          'Cache-Control': 'no-store',
          'Referrer-Policy': 'no-referrer',
        },
      });
    const code = await authStore(database()).issueCode(user, challenge);
    const callback = new URL('/auth/callback', config.publicOrigin);
    callback.searchParams.set('code', code);
    callback.searchParams.set('state', state);
    return new Response(null, {
      status: 302,
      headers: {
        Location: callback.href,
        'Cache-Control': 'no-store',
        'Referrer-Policy': 'no-referrer',
      },
    });
  } catch (e) {
    return failure(e);
  }
}
