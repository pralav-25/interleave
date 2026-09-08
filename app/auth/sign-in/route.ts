import { safeReturnPath } from '@/server/auth/protocol';
export async function GET(request: Request) {
  const path = safeReturnPath(
    new URL(request.url).searchParams.get('returnTo') ?? '/workspace',
  );
  return new Response(null, {
    status: 302,
    headers: {
      Location: `/signin-with-chatgpt?return_to=${encodeURIComponent(path)}`,
      'Cache-Control': 'no-store',
    },
  });
}
