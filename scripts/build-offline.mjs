import { readdir, readFile, writeFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
const root = 'dist/client';
async function walk(directory) {
  const entries = await readdir(directory, { withFileTypes: true });
  const files = await Promise.all(
    entries.map(async (entry) =>
      entry.isDirectory()
        ? walk(`${directory}/${entry.name}`)
        : [`${directory}/${entry.name}`],
    ),
  );
  return files.flat();
}
// Cache version follows generated content, so an update cannot reuse stale chunks.
const files = (await walk(root))
  .filter(
    (file) =>
      /\.(js|css|woff2)$/.test(file) &&
      !file.endsWith('/sw.js') &&
      !file.includes('model.worker'),
  )
  .sort();
const digest = createHash('sha256');
digest.update(await readFile('public/sw.js'));
digest.update(await readFile('public/offline.html'));
for (const file of files) digest.update(await readFile(file));
const version = digest.digest('hex').slice(0, 16);
const source = (await readFile('public/sw.js', 'utf8'))
  .replace('interleave-public-v1', `interleave-public-${version}`)
  .replace(
    'const BUILD_ASSETS = [];',
    `const BUILD_ASSETS = ${JSON.stringify(files.map((file) => file.slice(root.length)))};`,
  );
await writeFile(`${root}/sw.js`, source);
console.log(
  `Offline lab: ${files.length} public assets, cache ${version}. Private routes are excluded.`,
);
