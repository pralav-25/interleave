import { getChatGPTUser, chatGPTSignInPath } from '@/app/chatgpt-auth';
import { json } from '@/server/http';
export async function GET(request: Request) {
  const user = await getChatGPTUser();
  let signInUrl = chatGPTSignInPath('/workspace');
  try {
    signInUrl = chatGPTSignInPath(
      new URL(request.url).searchParams.get('returnTo') ?? '/workspace',
    );
  } catch {}
  return json({
    signedIn: Boolean(user),
    email: user?.email ?? null,
    signInUrl,
  });
}
