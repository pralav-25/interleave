import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  createBrowserAssistant,
  type BrowserRuntime,
} from '../features/assistant/browser-provider.ts';
const context = {
  id: 'lost-update',
  mode: 'buggy' as const,
  schedule: [0, 1, 0, 1, 0, 1] as (0 | 1)[],
};
function stub() {
  const calls = { started: 0, stopped: 0, terminated: 0, cacheRemoved: 0 };
  const worker = {
    terminate() {
      calls.terminated++;
    },
    addEventListener() {},
  } as unknown as Worker;
  const engine = {
    interruptGenerate() {
      calls.stopped++;
    },
    chat: {
      completions: {
        async create() {
          return (async function* () {
            yield { choices: [{ delta: { content: 'Counter ' } }] };
            yield { choices: [{ delta: { content: 'is 1.' } }] };
          })();
        },
      },
    },
  };
  const runtime: BrowserRuntime = {
    supported: () => true,
    worker: () => worker,
    engine: async () => {
      calls.started++;
      return engine as unknown as Awaited<ReturnType<BrowserRuntime['engine']>>;
    },
    removeCache: async () => {
      calls.cacheRemoved++;
    },
  };
  return { runtime, calls };
}
void test('unsupported devices do not create workers or download models', async () => {
  const { runtime, calls } = stub();
  runtime.supported = () => false;
  const p = createBrowserAssistant(runtime);
  await assert.rejects(() => p.load(() => {}), /WebGPU/);
  assert.equal(calls.started, 0);
  assert.equal(calls.terminated, 0);
});
void test('one loaded engine serves streamed answers and is reused', async () => {
  const { runtime, calls } = stub();
  const p = createBrowserAssistant(runtime);
  await p.load(() => {});
  await p.load(() => {});
  const chunks: string[] = [];
  assert.equal(
    await p.stream(context, [], 'Explain', (text) => chunks.push(text)),
    'Counter is 1.',
  );
  assert.deepEqual(chunks, ['Counter ', 'Counter is 1.']);
  assert.equal(calls.started, 1);
  p.dispose();
  assert.equal(calls.terminated, 1);
  await assert.rejects(
    () => p.stream(context, [], 'Explain', () => {}),
    /Enable/,
  );
});
void test('cancelling a download rejects immediately and prevents stale initialization', async () => {
  const { runtime, calls } = stub();
  let resolve!: (engine: Awaited<ReturnType<BrowserRuntime['engine']>>) => void;
  runtime.engine = () =>
    new Promise((r) => {
      resolve = r;
    });
  const p = createBrowserAssistant(runtime);
  const pending = p.load(() => {});
  await assert.rejects(() => p.load(() => {}), /already loading/);
  p.dispose();
  await assert.rejects(pending, /cancelled/);
  resolve({ interruptGenerate() {}, chat: {} } as unknown as Awaited<
    ReturnType<BrowserRuntime['engine']>
  >);
  await assert.rejects(
    () => p.stream(context, [], 'Explain', () => {}),
    /Enable/,
  );
  assert.equal(calls.terminated, 1);
});
void test('model load failures clean up the worker and permit retry', async () => {
  const { runtime, calls } = stub();
  const normal = runtime.engine;
  runtime.engine = async () => {
    throw new Error('Network failed');
  };
  const p = createBrowserAssistant(runtime);
  await assert.rejects(() => p.load(() => {}), /Network failed/);
  assert.equal(calls.terminated, 1);
  runtime.engine = normal;
  await p.load(() => {});
  assert.equal(
    await p.stream(context, [], 'Explain', () => {}),
    'Counter is 1.',
  );
  p.dispose();
});
void test('stop suppresses further token updates and cache removal disposes the model', async () => {
  const { runtime, calls } = stub();
  const p = createBrowserAssistant(runtime);
  await p.load(() => {});
  const chunks: string[] = [];
  await p.stream(context, [], 'Explain', (text) => {
    chunks.push(text);
    p.stop();
  });
  assert.deepEqual(chunks, ['Counter ']);
  assert.ok(calls.stopped > 0);
  await p.clearCache();
  assert.equal(calls.cacheRemoved, 1);
  assert.equal(calls.terminated, 1);
});
void test('a stopped generation must settle before another request can use the worker', async () => {
  const { runtime } = stub();
  let release!: () => void;
  const pending = new Promise<void>((resolve) => {
    release = resolve;
  });
  runtime.engine = async () =>
    ({
      interruptGenerate() {},
      chat: {
        completions: {
          async create() {
            await pending;
            return (async function* () {
              yield { choices: [{ delta: { content: 'Ready' } }] };
            })();
          },
        },
      },
    }) as unknown as Awaited<ReturnType<BrowserRuntime['engine']>>;
  const p = createBrowserAssistant(runtime);
  await p.load(() => {});
  const chunks: string[] = [];
  const first = p.stream(context, [], 'Explain', (text) => chunks.push(text));
  p.stop();
  await assert.rejects(
    () => p.stream(context, [], 'Next question', () => {}),
    /Wait for the current answer/,
  );
  release();
  assert.equal(await first, '');
  assert.deepEqual(chunks, []);
  assert.equal(await p.stream(context, [], 'Next question', () => {}), 'Ready');
  p.dispose();
});
