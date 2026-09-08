import type { WebWorkerMLCEngine, InitProgressReport } from '@mlc-ai/web-llm';
import {
  buildMessages,
  type ChatMessage,
  type TraceContext,
} from './context.ts';
export const MODEL_ID = 'Qwen2.5-1.5B-Instruct-q4f32_1-MLC';
type Engine = Pick<WebWorkerMLCEngine, 'chat' | 'interruptGenerate'>;
export interface BrowserRuntime {
  supported: () => boolean;
  worker: () => Worker;
  engine: (
    worker: Worker,
    progress: (report: InitProgressReport) => void,
  ) => Promise<Engine>;
  removeCache: () => Promise<void>;
}
export interface AssistantProvider {
  load: (progress: (report: InitProgressReport) => void) => Promise<void>;
  stream: (
    context: TraceContext,
    history: ChatMessage[],
    question: string,
    onText: (text: string) => void,
  ) => Promise<string>;
  stop: () => void;
  dispose: () => void;
  clearCache: () => Promise<void>;
}
const browserRuntime: BrowserRuntime = {
  supported: () => typeof navigator !== 'undefined' && 'gpu' in navigator,
  worker: () =>
    new Worker(new URL('./model.worker.ts', import.meta.url), {
      type: 'module',
    }),
  async engine(worker, progress) {
    const { CreateWebWorkerMLCEngine } = await import('@mlc-ai/web-llm');
    return CreateWebWorkerMLCEngine(
      worker,
      MODEL_ID,
      { initProgressCallback: progress },
      { context_window_size: 4096 },
    );
  },
  async removeCache() {
    const { deleteModelAllInfoInCache } = await import('@mlc-ai/web-llm');
    await deleteModelAllInfoInCache(MODEL_ID);
  },
};
/** Runtime injection isolates GPU/worker I/O for lifecycle tests; production uses WebLLM. */
export function createBrowserAssistant(
  runtime: BrowserRuntime = browserRuntime,
): AssistantProvider {
  let worker: Worker | null = null;
  let engine: Engine | null = null;
  let busy = false;
  let generation = 0;
  let cancelled = false;
  let rejectPending: ((error: Error) => void) | null = null;
  function dispose() {
    generation++;
    rejectPending?.(new Error('AI operation cancelled.'));
    rejectPending = null;
    engine?.interruptGenerate();
    worker?.terminate();
    worker = null;
    engine = null;
    busy = false;
    cancelled = true;
  }
  function guarded<T>(
    operation: Promise<T>,
    milliseconds: number,
    message: string,
  ) {
    let timer: ReturnType<typeof setTimeout>;
    let rejectThis: ((error: Error) => void) | null = null;
    const interrupted = new Promise<never>((_, reject) => {
      rejectThis = reject;
      rejectPending = reject;
      timer = setTimeout(() => reject(new Error(message)), milliseconds);
    });
    return Promise.race([operation, interrupted]).finally(() => {
      clearTimeout(timer);
      if (rejectPending === rejectThis) rejectPending = null;
    });
  }
  return {
    async load(progress) {
      if (engine) return;
      if (worker) throw new Error('The model is already loading.');
      if (!runtime.supported())
        throw new Error(
          'Local AI needs a browser and device with WebGPU support. The lab and saved workspace still work.',
        );
      const current = ++generation;
      cancelled = false;
      worker = runtime.worker();
      worker.addEventListener('error', () => {
        rejectPending?.(
          new Error(
            'The AI worker stopped. Reload the local model to try again.',
          ),
        );
      });
      try {
        const loaded = await guarded(
          runtime.engine(worker, (report) => {
            if (current === generation) progress(report);
          }),
          300000,
          'Model loading timed out. Retry on a stable connection.',
        );
        if (current !== generation) throw new Error('Model loading cancelled.');
        engine = loaded;
      } catch (error) {
        if (current === generation) dispose();
        throw error;
      }
    },
    async stream(context, history, question, onText) {
      if (!engine) throw new Error('Enable the local AI model first.');
      if (busy) throw new Error('Wait for the current answer or stop it.');
      busy = true;
      cancelled = false;
      const current = generation;
      const active = engine;
      let full = '';
      const generate = async () => {
        const chunks = await active.chat.completions.create({
          messages: buildMessages(context, history, question),
          stream: true,
          temperature: 0.3,
          max_tokens: 500,
        });
        for await (const chunk of chunks) {
          if (current !== generation || cancelled) break;
          full += chunk.choices[0]?.delta.content ?? '';
          onText(full);
        }
        if (!full && !cancelled)
          throw new Error(
            'The model returned no answer. Try a shorter question.',
          );
        return full;
      };
      try {
        return await guarded(
          generate(),
          120000,
          'Generation timed out. Reload the local model and try again.',
        );
      } catch (error) {
        if (current === generation) dispose();
        throw error;
      } finally {
        if (current === generation) busy = false;
      }
    },
    stop() {
      cancelled = true;
      engine?.interruptGenerate();
    },
    dispose,
    async clearCache() {
      dispose();
      await runtime.removeCache();
    },
  };
}
