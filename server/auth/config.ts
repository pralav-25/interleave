import { env } from 'cloudflare:workers';
import { matchesSecret, normalizeOrigin } from './protocol';
export function authConfig() {
  const values = env as unknown as Record<string, string | undefined>;
  const secret = values.INTERLEAVE_GATEWAY_SECRET ?? '';
  const origin = values.INTERLEAVE_PUBLIC_ORIGIN;
  if (secret.length < 32 || !origin)
    throw new Error('Vercel sign-in is not configured.');
  return { secret, publicOrigin: normalizeOrigin(origin) };
}
export async function isGateway(headers: Headers) {
  const { secret } = authConfig();
  return matchesSecret(headers.get('x-interleave-gateway') ?? '', secret);
}
