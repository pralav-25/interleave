import { test, type TestContext } from 'node:test';
import assert from 'node:assert/strict';
import {
  createMetalController,
  metalResolution,
} from '../components/ui/liquid-metal-renderer.ts';

function rendererHarness(t: TestContext, failCompile = false) {
  let nextFrame = 0;
  let now = 0;
  let draws = 0;
  let layouts = 0;
  let releases = 0;
  let disconnected = false;
  const deleted: unknown[] = [];
  const frames = new Map<number, FrameRequestCallback>();
  const listeners = new Map<string, () => void>();
  const uniforms = new Map<string, number[]>();
  const resource = () => ({});
  const noop = () => {};
  const gl = {
    VERTEX_SHADER: 1,
    FRAGMENT_SHADER: 2,
    COMPILE_STATUS: 3,
    LINK_STATUS: 4,
    ARRAY_BUFFER: 5,
    STATIC_DRAW: 6,
    FLOAT: 7,
    TRIANGLE_STRIP: 8,
    createShader: resource,
    createProgram: resource,
    createBuffer: resource,
    shaderSource: noop,
    compileShader: noop,
    attachShader: noop,
    linkProgram: noop,
    getShaderParameter: () => !failCompile,
    getProgramParameter: () => true,
    getAttribLocation: () => 0,
    useProgram: noop,
    bindBuffer: noop,
    bufferData: noop,
    enableVertexAttribArray: noop,
    vertexAttribPointer: noop,
    viewport: noop,
    getUniformLocation: (_program: unknown, name: string) => name,
    uniform1f: (key: string, value: number) => uniforms.set(key, [value]),
    uniform2f: (key: string, x: number, y: number) => uniforms.set(key, [x, y]),
    drawArrays: () => {
      draws++;
    },
    deleteShader: (value: unknown) => deleted.push(value),
    deleteProgram: (value: unknown) => deleted.push(value),
    deleteBuffer: (value: unknown) => deleted.push(value),
    getExtension: () => ({
      loseContext: () => {
        releases++;
      },
    }),
  };
  const canvas = {
    width: 0,
    height: 0,
    getContext: () => gl,
    getBoundingClientRect: () => {
      layouts++;
      return { width: 1200, height: 700 };
    },
    addEventListener: (name: string, fn: () => void) => listeners.set(name, fn),
    removeEventListener: (name: string) => listeners.delete(name),
  } as unknown as HTMLCanvasElement;
  const replacements = {
    window: { devicePixelRatio: 3 },
    ResizeObserver: class {
      observe() {}
      disconnect() {
        disconnected = true;
      }
    },
    requestAnimationFrame: (callback: FrameRequestCallback) => {
      frames.set(++nextFrame, callback);
      return nextFrame;
    },
    cancelAnimationFrame: (id: number) => frames.delete(id),
  };
  for (const [key, value] of Object.entries(replacements)) {
    const previous = Object.getOwnPropertyDescriptor(globalThis, key);
    Object.defineProperty(globalThis, key, {
      value,
      writable: true,
      configurable: true,
    });
    t.after(() => {
      if (previous) Object.defineProperty(globalThis, key, previous);
      else Reflect.deleteProperty(globalThis, key);
    });
  }
  t.mock.method(performance, 'now', () => now);
  return {
    canvas,
    frames,
    uniforms,
    listeners,
    deleted,
    get draws() {
      return draws;
    },
    get layouts() {
      return layouts;
    },
    get releases() {
      return releases;
    },
    get disconnected() {
      return disconnected;
    },
    advance(ms: number) {
      now += ms;
      const batch = [...frames.values()];
      frames.clear();
      batch.forEach((callback) => callback(now));
    },
  };
}
const settings = { variant: 'chrome' as const, distortion: 0.7, speed: 0.3 };

void test('metal rendering stays within its pixel and dimension budgets at any display density', () => {
  for (const [w, h, dpr] of [
    [1920, 1080, 3],
    [600, 400, 2],
    [9000, 60, 4],
    [NaN, 0, Infinity],
  ]) {
    const size = metalResolution(w, h, dpr);
    assert.ok(size.width * size.height <= 180000);
    assert.ok(size.width <= 768 && size.height <= 768);
    assert.ok(size.width >= 1 && size.height >= 1);
  }
  assert.deepEqual(metalResolution(20, 10, 2), { width: 30, height: 15 });
});

void test('missing WebGL and rejected context creation return the CSS fallback', () => {
  assert.equal(
    createMetalController(
      { getContext: () => null } as unknown as HTMLCanvasElement,
      settings,
      () => {},
    ),
    null,
  );
  assert.equal(
    createMetalController(
      {
        getContext: () => {
          throw new Error('GPU unavailable');
        },
      } as unknown as HTMLCanvasElement,
      settings,
      () => {},
    ),
    null,
  );
});

void test('shader failure releases partially allocated GPU resources', (t) => {
  const h = rendererHarness(t, true);
  assert.equal(
    createMetalController(h.canvas, settings, () => {}),
    null,
  );
  assert.equal(h.deleted.length, 3);
  assert.equal(h.releases, 1);
  assert.equal(h.frames.size, 0);
});

void test('pause cancels rendering, resume uses one loop, and frames do not measure layout', (t) => {
  const h = rendererHarness(t);
  const controller = createMetalController(h.canvas, settings, () => {});
  assert.ok(controller);
  assert.equal(h.draws, 1);
  controller.setRunning(true);
  controller.setRunning(true);
  assert.equal(h.frames.size, 1);
  h.advance(16);
  assert.equal(h.draws, 1);
  h.advance(24);
  assert.equal(h.draws, 2);
  assert.equal(h.layouts, 1);
  const stale = [...h.frames.values()][0];
  controller.setRunning(false);
  assert.equal(h.frames.size, 0);
  stale(60);
  assert.equal(h.frames.size, 0);
  controller.setRunning(true);
  h.advance(40);
  assert.equal(h.draws, 3);
  controller.destroy();
  controller.destroy();
  assert.equal(h.frames.size, 0);
  assert.equal(h.listeners.size, 0);
  assert.equal(h.disconnected, true);
  assert.equal(h.deleted.length, 4);
  assert.equal(h.releases, 1);
});

void test('live settings reach the shader, while extreme pointer values remain bounded', (t) => {
  const h = rendererHarness(t);
  const controller = createMetalController(h.canvas, settings, () => {});
  assert.ok(controller);
  controller.update({ variant: 'gold', distortion: 100, speed: 1 });
  assert.deepEqual(h.uniforms.get('uVariant'), [1]);
  assert.deepEqual(h.uniforms.get('uDistortion'), [3]);
  controller.setPointer(100, -100);
  controller.setRunning(true);
  h.advance(40);
  assert.deepEqual(h.uniforms.get('uPointer'), [0.12, -0.12]);
  controller.destroy();
});

void test('context loss stops the loop and signals the visible fallback', (t) => {
  const h = rendererHarness(t);
  let failures = 0;
  const controller = createMetalController(h.canvas, settings, () => {
    failures++;
  });
  assert.ok(controller);
  controller.setRunning(true);
  h.listeners.get('webglcontextlost')!();
  assert.equal(failures, 1);
  assert.equal(h.frames.size, 0);
  controller.setRunning(true);
  controller.update(settings);
  assert.equal(h.frames.size, 0);
  assert.equal(h.draws, 1);
  controller.destroy();
});
