import type { LiquidMetalVariant } from './liquid-metal-palettes.ts';

const VERTEX_SHADER = `#version 300 es
in vec2 a;
void main(){ gl_Position = vec4(a, 0.0, 1.0); }`;

const FRAGMENT_SHADER = `#version 300 es
precision highp float;
out vec4 fragColor;
uniform vec2 uRes;
uniform float uTime;
uniform float uDistortion;
uniform float uVariant;
uniform vec2 uPointer;

float hash(vec2 p){
  return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453123);
}

float noise(vec2 p){
  vec2 i = floor(p);
  vec2 f = fract(p);
  float a = hash(i);
  float b = hash(i + vec2(1.0, 0.0));
  float c = hash(i + vec2(0.0, 1.0));
  float d = hash(i + vec2(1.0, 1.0));
  vec2 u = f * f * (3.0 - 2.0 * f);
  return mix(a, b, u.x) + (c - a) * u.y * (1.0 - u.x) + (d - b) * u.x * u.y;
}

float fbm(vec2 p){
  float value = 0.0;
  float amplitude = 0.5;
  mat2 turn = mat2(1.6, 1.2, -1.2, 1.6);
  for (int i = 0; i < 4; i++){
    value += amplitude * noise(p);
    p = turn * p;
    amplitude *= 0.5;
  }
  return value;
}

void main(){
  vec2 uv = gl_FragCoord.xy / uRes;
  vec2 aspect = vec2(uRes.x / uRes.y, 1.0);
  vec2 p = (uv - 0.5) * aspect * 2.2;
  vec2 push = uPointer * 0.55;
  float warp = clamp(uDistortion, 0.0, 3.0);

  vec2 q = vec2(fbm(p + push), fbm(p + vec2(5.2, 1.3) - push));
  vec2 flow = p + warp * 3.2 * q;
  vec2 r = vec2(
    fbm(flow + vec2(1.7, 9.2) + uTime * 0.17),
    fbm(flow + vec2(8.3, 2.8) - uTime * 0.13)
  );

  vec2 base = p + warp * 2.8 * r;
  float eps = 0.006;
  float h = fbm(base);
  float hx = fbm(base + vec2(eps, 0.0));
  float hy = fbm(base + vec2(0.0, eps));
  vec3 n = normalize(vec3((h - hx) / eps * 0.05, (h - hy) / eps * 0.05, 1.0));

  vec3 view = normalize(vec3((uv - 0.5) * aspect, 1.0));
  vec3 refl = reflect(view, n);
  float f = clamp(refl.y * 0.5 + 0.5, 0.0, 1.0);
  float sideways = clamp(refl.x * 0.5 + 0.5, 0.0, 1.0);

  vec3 lo = vec3(0.04, 0.05, 0.07);
  vec3 hi = vec3(0.90, 0.94, 0.99);
  vec3 tint = vec3(0.58, 0.68, 0.85);

  if (uVariant > 0.5 && uVariant < 1.5) {
    lo = vec3(0.16, 0.10, 0.02);
    hi = vec3(1.00, 0.90, 0.62);
    tint = vec3(0.82, 0.58, 0.14);
  } else if (uVariant > 1.5 && uVariant < 2.5) {
    lo = vec3(0.06, 0.08, 0.10);
    hi = vec3(1.00, 1.00, 1.00);
    tint = vec3(0.50, 0.58, 0.68);
  } else if (uVariant > 2.5) {
    lo = vec3(0.05, 0.03, 0.14);
    hi = vec3(0.85, 0.92, 1.00);
    tint = vec3(0.35, 0.55, 0.90);
  }

  vec3 col = mix(lo, hi, smoothstep(0.04, 0.96, f));
  col = mix(col, tint, pow(sideways, 2.0) * 0.55);

  float spec = pow(max(dot(n, normalize(vec3(0.35, 0.75, 0.55))), 0.0), 42.0);
  float fresnel = pow(1.0 - clamp(n.z, 0.0, 1.0), 3.0);
  col += spec * 0.85 + fresnel * 0.20;

  if (uVariant > 2.5) {
    vec3 sheen = 0.5 + 0.5 * cos(6.28318 * (f + h * 0.75 + vec3(0.0, 0.33, 0.67)));
    col = mix(col, sheen, 0.72);
  }

  fragColor = vec4(clamp(col, 0.0, 1.0), 1.0);
}`;

const STRIP = new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]);

export interface MetalSettings {
  variant: LiquidMetalVariant;
  speed: number;
  distortion: number;
}

const VARIANT_INDEX = { chrome: 0, gold: 1, mercury: 2, oil: 3 };
const finite = (value: number, fallback: number) =>
  Number.isFinite(value) ? value : fallback;

/** Keep the decorative shader inexpensive even on Retina and ultrawide displays. */
export function metalResolution(width: number, height: number, dpr: number) {
  const w = Math.max(1, finite(width, 1));
  const h = Math.max(1, finite(height, 1));
  const scale = Math.min(
    Math.max(1, finite(dpr, 1)),
    1.5,
    768 / Math.max(w, h),
    Math.sqrt(180000 / (w * h)),
  );
  return {
    width: Math.max(1, Math.floor(w * scale)),
    height: Math.max(1, Math.floor(h * scale)),
  };
}

export function createMetalController(
  canvas: HTMLCanvasElement,
  initial: MetalSettings,
  onContextLost: () => void,
) {
  let gl: WebGL2RenderingContext | null;
  try {
    gl = canvas.getContext('webgl2', {
      alpha: false,
      antialias: false,
      powerPreference: 'low-power',
    });
  } catch {
    return null;
  }
  if (!gl) return null;
  const context = gl;
  const shaders: WebGLShader[] = [];
  let program: WebGLProgram | null = null;
  let buffer: WebGLBuffer | null = null;
  function release() {
    shaders.splice(0).forEach((shader) => context.deleteShader(shader));
    if (buffer) context.deleteBuffer(buffer);
    if (program) context.deleteProgram(program);
    context.getExtension('WEBGL_lose_context')?.loseContext();
  }
  function compile(type: number, source: string) {
    const shader = context.createShader(type);
    if (!shader) return null;
    shaders.push(shader);
    context.shaderSource(shader, source);
    context.compileShader(shader);
    return context.getShaderParameter(shader, context.COMPILE_STATUS)
      ? shader
      : null;
  }
  const vertex = compile(context.VERTEX_SHADER, VERTEX_SHADER);
  const fragment = compile(context.FRAGMENT_SHADER, FRAGMENT_SHADER);
  program = context.createProgram();
  if (!vertex || !fragment || !program) {
    release();
    return null;
  }
  context.attachShader(program, vertex);
  context.attachShader(program, fragment);
  context.linkProgram(program);
  if (!context.getProgramParameter(program, context.LINK_STATUS)) {
    release();
    return null;
  }
  shaders.splice(0).forEach((shader) => context.deleteShader(shader));
  buffer = context.createBuffer();
  const position = context.getAttribLocation(program, 'a');
  if (!buffer || position < 0) {
    release();
    return null;
  }
  context.useProgram(program);
  context.bindBuffer(context.ARRAY_BUFFER, buffer);
  context.bufferData(context.ARRAY_BUFFER, STRIP, context.STATIC_DRAW);
  context.enableVertexAttribArray(position);
  context.vertexAttribPointer(position, 2, context.FLOAT, false, 0, 0);
  const uniforms = Object.fromEntries(
    ['uRes', 'uTime', 'uDistortion', 'uVariant', 'uPointer'].map((name) => [
      name,
      context.getUniformLocation(program!, name),
    ]),
  );
  let settings = initial;
  let running = false;
  let destroyed = false;
  let lost = false;
  let frame = 0;
  let elapsed = 0;
  let lastDraw = 0;
  let pointerX = 0;
  let pointerY = 0;
  let targetX = 0;
  let targetY = 0;
  function draw() {
    if (destroyed || lost) return;
    context.uniform2f(uniforms.uRes, canvas.width, canvas.height);
    context.uniform1f(uniforms.uTime, elapsed);
    context.uniform1f(
      uniforms.uDistortion,
      Math.max(0, Math.min(3, finite(settings.distortion, 1))),
    );
    context.uniform1f(uniforms.uVariant, VARIANT_INDEX[settings.variant]);
    context.uniform2f(uniforms.uPointer, pointerX, pointerY);
    context.drawArrays(context.TRIANGLE_STRIP, 0, 4);
  }
  function resize() {
    if (destroyed || lost) return;
    const rect = canvas.getBoundingClientRect();
    const size = metalResolution(
      rect.width,
      rect.height,
      window.devicePixelRatio,
    );
    canvas.width = size.width;
    canvas.height = size.height;
    context.viewport(0, 0, canvas.width, canvas.height);
    draw();
  }
  function tick(now: number) {
    frame = 0;
    if (destroyed || lost || !running) return;
    if (now - lastDraw >= 1000 / 30) {
      const delta = Math.min((now - lastDraw) / 1000, 0.05);
      lastDraw = now;
      elapsed += delta * Math.max(0, Math.min(3, finite(settings.speed, 1)));
      pointerX += (targetX - pointerX) * 0.12;
      pointerY += (targetY - pointerY) * 0.12;
      draw();
    }
    frame = requestAnimationFrame(tick);
  }
  function stop() {
    cancelAnimationFrame(frame);
    frame = 0;
    running = false;
  }
  function contextLost() {
    lost = true;
    stop();
    onContextLost();
  }
  canvas.addEventListener('webglcontextlost', contextLost);
  const observer =
    typeof ResizeObserver === 'undefined' ? null : new ResizeObserver(resize);
  observer?.observe(canvas);
  if (!observer) window.addEventListener('resize', resize);
  resize();
  return {
    update(next: MetalSettings) {
      settings = next;
      draw();
    },
    setPointer(x: number, y: number) {
      targetX = Math.max(-1, Math.min(1, finite(x, 0)));
      targetY = Math.max(-1, Math.min(1, finite(y, 0)));
    },
    setRunning(next: boolean) {
      if (destroyed || lost || next === running) return;
      if (!next) {
        stop();
        return;
      }
      running = true;
      lastDraw = performance.now();
      frame = requestAnimationFrame(tick);
    },
    destroy() {
      if (destroyed) return;
      destroyed = true;
      stop();
      observer?.disconnect();
      if (!observer) window.removeEventListener('resize', resize);
      canvas.removeEventListener('webglcontextlost', contextLost);
      release();
    },
  };
}
