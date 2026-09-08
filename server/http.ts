import { StoreError } from './investigations.ts';
export function json(data: unknown, status = 200) {
  return Response.json(data, {
    status,
    headers: {
      'Cache-Control': 'private, no-store',
      'X-Content-Type-Options': 'nosniff',
    },
  });
}
export function requireSameOrigin(request: Request) {
  const origin = request.headers.get('origin');
  if (!origin || origin !== new URL(request.url).origin)
    throw new StoreError(403, 'Request origin is not allowed.');
}
export async function readJson(
  request: Request,
  maxBytes = 48000,
): Promise<unknown> {
  if (!request.headers.get('content-type')?.startsWith('application/json'))
    throw new StoreError(415, 'Send JSON content.');
  if (Number(request.headers.get('content-length')) > maxBytes)
    throw new StoreError(413, 'Request is too large.');
  if (!request.body) throw new StoreError(400, 'Request body is missing.');
  const reader = request.body.getReader();
  const parts: Uint8Array[] = [];
  let size = 0;
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      size += value.byteLength;
      if (size > maxBytes) {
        await reader.cancel();
        throw new StoreError(413, 'Request is too large.');
      }
      parts.push(value);
    }
  } finally {
    reader.releaseLock();
  }
  const bytes = new Uint8Array(size);
  let offset = 0;
  for (const part of parts) {
    bytes.set(part, offset);
    offset += part.length;
  }
  try {
    return JSON.parse(new TextDecoder().decode(bytes)) as unknown;
  } catch {
    throw new StoreError(400, 'Request contains invalid JSON.');
  }
}
export function failure(error: unknown) {
  if (error instanceof StoreError)
    return json({ error: error.message }, error.status);
  const id = crypto.randomUUID();
  console.error(
    JSON.stringify({
      event: 'request_failed',
      requestId: id,
      errorType: error instanceof Error ? error.name : 'unknown',
    }),
  );
  return json(
    {
      error: 'The workspace is temporarily unavailable. Please try again.',
      requestId: id,
    },
    503,
  );
}
