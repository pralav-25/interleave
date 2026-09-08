import { Readable } from 'node:stream';
import { pipeline } from 'node:stream/promises';
import { createGateway } from './gateway.js';
export default async function handler(req, res) {
  try {
    const publicOrigin =
      process.env.INTERLEAVE_PUBLIC_ORIGIN ||
      (process.env.VERCEL_PROJECT_PRODUCTION_URL
        ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`
        : '');
    const gateway = createGateway({
      backendOrigin: process.env.INTERLEAVE_BACKEND_ORIGIN || '',
      publicOrigin,
      secret: process.env.INTERLEAVE_GATEWAY_SECRET || '',
    });
    const headers = new Headers();
    for (const [key, value] of Object.entries(req.headers)) {
      if (Array.isArray(value))
        value.forEach((item) => headers.append(key, item));
      else if (value) headers.set(key, value);
    }
    const url = new URL(req.url, `https://${req.headers.host}`);
    const request = new Request(url, {
      method: req.method,
      headers,
      ...(!['GET', 'HEAD'].includes(req.method)
        ? { body: Readable.toWeb(req), duplex: 'half' }
        : {}),
    });
    const response = await gateway(request);
    res.statusCode = response.status;
    response.headers.forEach((value, key) => {
      if (key !== 'set-cookie') res.setHeader(key, value);
    });
    const cookies = response.headers.getSetCookie();
    if (cookies.length) res.setHeader('Set-Cookie', cookies);
    if (response.body && req.method !== 'HEAD')
      await pipeline(Readable.fromWeb(response.body), res);
    else res.end();
  } catch {
    if (!res.headersSent) {
      res.statusCode = 503;
      res.setHeader('Content-Type', 'application/json');
      res.setHeader('Cache-Control', 'no-store');
    }
    res.end(
      '{"error":"Interleave is temporarily unavailable. Please try again."}',
    );
  }
}
