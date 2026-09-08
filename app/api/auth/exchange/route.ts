import { isGateway } from '@/server/auth/config';
import { authStore } from '@/server/auth/store';
import { database } from '@/server/database';
import { json, readJson, failure } from '@/server/http';
import { validToken } from '@/server/auth/protocol';
export async function POST(request: Request) {
  try {
    if (!(await isGateway(request.headers)))
      return json({ error: 'Unauthorized.' }, 401);
    const input = (await readJson(request, 1024)) as Record<
      string,
      unknown
    > | null;
    if (!input || !validToken(input.code) || !validToken(input.verifier))
      return json({ error: 'Invalid exchange.' }, 400);
    const token = await authStore(database()).exchange(
      input.code,
      input.verifier,
    );
    return token
      ? json({ token })
      : json(
          {
            error:
              'Sign-in expired or was already completed. Please start again.',
          },
          400,
        );
  } catch (e) {
    return failure(e);
  }
}
