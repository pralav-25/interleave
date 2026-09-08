import { database } from '@/server/database';
import { json } from '@/server/http';
export async function GET() {
  try {
    const ready = await database()
      .prepare(
        "SELECT name FROM sqlite_master WHERE type='table' AND name='investigations'",
      )
      .first();
    return json(
      { status: ready ? 'ready' : 'unavailable', version: '0.2.0' },
      ready ? 200 : 503,
    );
  } catch {
    return json({ status: 'unavailable', version: '0.2.0' }, 503);
  }
}
