const encoder = new TextEncoder();
export function randomToken() {
  return base64url(crypto.getRandomValues(new Uint8Array(32)));
}
function base64url(bytes: Uint8Array) {
  return btoa(String.fromCharCode(...bytes))
    .replaceAll('+', '-')
    .replaceAll('/', '_')
    .replaceAll('=', '');
}
export async function digest(value: string) {
  return base64url(
    new Uint8Array(
      await crypto.subtle.digest('SHA-256', encoder.encode(value)),
    ),
  );
}
export function validToken(value: unknown): value is string {
  return typeof value === 'string' && /^[A-Za-z0-9_-]{43}$/.test(value);
}
export async function sign(value: string, secret: string) {
  const key = await crypto.subtle.importKey(
    'raw',
    encoder.encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign'],
  );
  return base64url(
    new Uint8Array(
      await crypto.subtle.sign('HMAC', key, encoder.encode(value)),
    ),
  );
}
export async function matchesSecret(candidate: string, expected: string) {
  if (expected.length < 32) return false;
  const [a, b] = await Promise.all([digest(candidate), digest(expected)]);
  let difference = 0;
  for (let i = 0; i < a.length; i++)
    difference |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return difference === 0;
}
function hasControlCharacter(input: string) {
  for (let i = 0; i < input.length; i++)
    if (input.charCodeAt(i) < 32) return true;
  return false;
}
export function safeReturnPath(input: string) {
  if (
    !input.startsWith('/') ||
    input.startsWith('//') ||
    input.includes('\\') ||
    hasControlCharacter(input) ||
    input.length > 2048
  )
    return '/workspace';
  return input.startsWith('/auth/') ||
    input.startsWith('/api/') ||
    input.startsWith('/signin-') ||
    input.startsWith('/signout-')
    ? '/workspace'
    : input;
}
export function normalizeOrigin(value: string) {
  const url = new URL(value);
  if (
    url.origin !== value ||
    url.username ||
    url.password ||
    (url.protocol !== 'https:' &&
      !(
        url.protocol === 'http:' &&
        ['localhost', '127.0.0.1'].includes(url.hostname)
      ))
  )
    throw new Error('Invalid configured origin.');
  return url.origin;
}
export const SESSION_SECONDS = 7 * 24 * 60 * 60;
