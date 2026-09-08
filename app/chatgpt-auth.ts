import { headers } from 'next/headers';
import { isGateway } from '@/server/auth/config';
import { authStore } from '@/server/auth/store';
import { database } from '@/server/database';
/** Identity is injected by the Sites dispatcher; never accept a user ID from a payload. */
export async function getChatGPTUser(): Promise<{
  id: string;
  email: string;
} | null> {
  const h = await headers();
  if (h.has('x-interleave-gateway') || h.has('x-interleave-session')) {
    if (!(await isGateway(h))) return null;
    return authStore(database()).user(h.get('x-interleave-session') ?? '');
  }
  const id = h.get('oai-authenticated-user-id');
  const email = h.get('oai-authenticated-user-email');
  return id && email ? { id, email } : null;
}
export function chatGPTSignInPath(returnTo = '/workspace'): string {
  if (
    !returnTo.startsWith('/') ||
    returnTo.startsWith('//') ||
    returnTo.includes('\\')
  )
    throw new Error('Invalid return path.');
  return `/auth/sign-in?returnTo=${encodeURIComponent(returnTo)}`;
}
