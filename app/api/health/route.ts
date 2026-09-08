import { database } from '@/server/database';
import { json } from '@/server/http';
export async function GET() {
  try {
    const ready = await database()
      .prepare(
        "SELECT COUNT(*) AS total FROM sqlite_master WHERE type='table' AND name IN ('investigations', 'auth_codes', 'gateway_sessions')",
      )
      .first<{ total: number }>();
    return json(
      {
        status: ready?.total === 3 ? 'ready' : 'unavailable',
        version: '0.3.0',
      },
      ready?.total === 3 ? 200 : 503,
    );
  } catch {
    return json({ status: 'unavailable', version: '0.3.0' }, 503);
  }
}
