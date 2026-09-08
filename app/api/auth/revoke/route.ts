import { isGateway } from '@/server/auth/config';
import { authStore } from '@/server/auth/store';
import { database } from '@/server/database';
import { json, failure } from '@/server/http';
export async function POST(request: Request) {
  try {
    if (!(await isGateway(request.headers)))
      return json({ error: 'Unauthorized.' }, 401);
    await authStore(database()).revoke(
      request.headers.get('x-interleave-session') ?? '',
    );
    return json({ signedOut: true });
  } catch (e) {
    return failure(e);
  }
}
