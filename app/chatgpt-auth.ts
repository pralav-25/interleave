import { headers } from 'next/headers';
/** Identity is injected by the Sites dispatcher; never accept a user ID from a payload. */
export async function getChatGPTUser(): Promise<{
  id: string;
  email: string;
} | null> {
  const h = await headers();
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
  return `/signin-with-chatgpt?return_to=${encodeURIComponent(returnTo)}`;
}
