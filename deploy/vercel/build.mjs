import { mkdir, cp, writeFile, readFile, rm } from 'node:fs/promises';
import ts from 'typescript';
const output = '.vercel/output';
const fn = `${output}/functions/render.func`;
await rm(output, { recursive: true, force: true });
await mkdir(fn, { recursive: true });
await cp('dist/client', `${output}/static`, { recursive: true });
await cp('deploy/vercel/entry.mjs', `${fn}/entry.mjs`);
for (const [from, to] of [
  ['deploy/vercel/gateway.ts', 'gateway.js'],
  ['server/auth/protocol.ts', 'protocol.js'],
]) {
  let source = await readFile(from, 'utf8');
  source = source.replace('../../server/auth/protocol.ts', './protocol.js');
  const compiled = ts.transpileModule(source, {
    compilerOptions: {
      target: ts.ScriptTarget.ES2022,
      module: ts.ModuleKind.ESNext,
    },
  });
  await writeFile(`${fn}/${to}`, compiled.outputText);
}
await writeFile(`${fn}/package.json`, JSON.stringify({ type: 'module' }));
await writeFile(
  `${fn}/.vc-config.json`,
  JSON.stringify({
    runtime: 'nodejs22.x',
    handler: 'entry.mjs',
    launcherType: 'Nodejs',
    maxDuration: 30,
    shouldAddHelpers: false,
  }),
);
await writeFile(
  `${output}/config.json`,
  JSON.stringify(
    {
      version: 3,
      routes: [
        {
          src: '/(.*)',
          headers: {
            'X-Content-Type-Options': 'nosniff',
            'Referrer-Policy': 'strict-origin-when-cross-origin',
            'Permissions-Policy': 'camera=(), microphone=(), geolocation=()',
          },
          continue: true,
        },
        {
          src: '/_next/static/(.*)',
          headers: { 'Cache-Control': 'public, max-age=31536000, immutable' },
          continue: true,
        },
        { handle: 'filesystem' },
        { src: '/(.*)', dest: '/render' },
      ],
    },
    null,
    2,
  ),
);
console.log(
  'Vercel output ready: CDN assets and authenticated Node.js gateway.',
);
