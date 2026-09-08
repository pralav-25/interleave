# Deploy Interleave on Vercel

Interleave supports a Vercel entry point while keeping the existing Cloudflare/Sites application, ChatGPT sign-in, and D1 database. Existing investigations retain the same owner IDs. Vercel serves the compiled static assets and a small Node.js gateway; server-rendered pages and storage operations continue to run on the backend. Both deployments are required.

## What is deployed

`pnpm build:vercel` first creates the ordinary application build, then `deploy/vercel/build.mjs` emits Vercel Build Output API v3 artifacts:

- `.vercel/output/static/`: browser JavaScript, CSS, fonts, and the AI worker.
- `.vercel/output/functions/render.func/`: a Node.js 22 gateway without runtime package dependencies.
- `.vercel/output/config.json`: static-first routing and the gateway fallback.

The gateway forwards only a small allowlist of request headers, supplies its own server credential, and derives identity only from the host-only session cookie. Browser-supplied identity headers, other cookies, and Authorization headers are not forwarded. Private responses never enter a shared cache. Generated assets are immutable; an asset absent from a Vercel build can fall back to the matching backend asset. Keep both deployments on the same source version to avoid unnecessary fallback and protocol drift.

## Runtime configuration

| Variable | Vercel | Sites backend |
| --- | --- | --- |
| `INTERLEAVE_GATEWAY_SECRET` | Secret, at least 32 random characters | The same secret |
| `INTERLEAVE_BACKEND_ORIGIN` | Exact HTTPS origin of the backend | Not used |
| `INTERLEAVE_PUBLIC_ORIGIN` | Optional fixed production HTTPS origin | Required exact Vercel production origin |

When the public origin is omitted on Vercel, the gateway uses the platform's `VERCEL_PROJECT_PRODUCTION_URL`. Preview-host sign-in navigates to the fixed production origin before creating a login cookie. Set an explicit public origin when changing to a custom domain, and update it on both platforms. The gateway secret belongs only in server environment settings; it must never use a public/Vite environment prefix or appear in a client bundle.

For a fork, create your own Sites backend and D1 binding, then generate a new shared secret. Do not reuse this demo's backend as an unauthenticated database service.

## Login and session protocol

1. Vercel creates random state and a PKCE verifier, storing a signed ten-minute flow cookie with `HttpOnly`, `Secure`, `SameSite=Lax`, and the `__Host-` prefix.
2. The browser navigates to the backend with a challenge, state, expiry, and HMAC ticket. The backend checks the ticket before starting its existing ChatGPT sign-in flow.
3. After sign-in, the backend stores a hashed, 60-second authorization code bound to the existing user and PKCE challenge. It redirects only to the configured Vercel callback.
4. Vercel validates the flow cookie and state, then exchanges the code server-to-server with the secret and verifier. An atomic `DELETE … RETURNING` consumes the code once.
5. The backend returns an opaque seven-day session token. Only its hash is stored in D1. Vercel sets the token in a secure, HTTP-only host cookie. It is not placed in a URL or browser-accessible storage.
6. Each authenticated backend request looks up that session and its expiry. Signing out revokes the stored session before clearing the cookie. Each account retains at most ten gateway sessions. Starting a newer authorization invalidates that owner's previous outstanding code.

Authorization responses disable caching and referrer transmission. Write requests are checked for same origin and capped at 48,000 bytes before forwarding. The database still applies owner scoping, validation, quotas, and revision checks. The gateway cannot accept an arbitrary backend URL from a request.

Local development may use explicitly configured localhost HTTP origins. Production cookies remain Secure. The normal Sites development sign-in uses its local test identity; it is not real account authentication.

## Deployment sequence

1. Apply reviewed Drizzle migrations and run `pnpm check` plus `pnpm build:vercel`.
2. Import the GitHub repository into Vercel using **Other** as the application preset. The checked-in `vercel.json` selects the build and install commands. Use the Hobby plan unless your own workload requires another plan.
3. Add the gateway secret and backend origin as server environment variables. Note the actual production URL returned by Vercel.
4. Configure the same secret and exact public origin on Sites, then publish the matching source and migrations. When updating an existing deployment, configure and validate the backend before switching Vercel traffic when possible.
5. Verify readiness, anonymous API denial, login code exchange, a saved record round trip, sign-out revocation, RSC responses, and static worker delivery.
6. Update the repository homepage and public links only after the new deployment succeeds.

The Vercel gateway uses a 20-second upstream timeout and a 30-second function limit. It adds a network hop for server rendering and workspace requests; browser simulation and AI have no server round trip. The retained backend remains a dependency and potential bottleneck. No load-test capacity guarantee is claimed.

## Validation

The automated suite covers PKCE exchange, code reuse and expiry, cookie tampering, login-state mismatch, session revocation and owner isolation, forged headers, private caching, request limits, RSC streams, redirect restrictions, and the existing model/storage/assistant checks. Local HTTP integration also exercises the complete login handoff and create/read/update/delete workflow against real local D1, then revokes the session. Browser GPU inference is not part of these tests.

Primary platform references: [Vercel Build Output API](https://vercel.com/docs/build-output-api), [configuration](https://vercel.com/docs/build-output-api/configuration), and [Node.js function primitives](https://vercel.com/docs/build-output-api/primitives).
