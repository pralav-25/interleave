'use client';

import { useEffect, useRef, type HTMLAttributes } from 'react';
import { cn } from '@/lib/utils';

interface GlyphMatrixProps extends HTMLAttributes<HTMLCanvasElement> {
  glyphs?: string;
  cellSize?: number;
  mutationRate?: number;
  interval?: number;
  fadeBottom?: number;
  color?: string;
  /** Active animation time in milliseconds; zero renders a static texture. */
  duration?: number;
}

const finite = (value: number, fallback: number) =>
  Number.isFinite(value) ? value : fallback;

/** Decorative glyphs that settle, pause offscreen, and respect reduced motion. */
export function GlyphMatrix({
  glyphs = '01·•+*/\\<>=',
  cellSize = 14,
  mutationRate = 0.04,
  interval = 90,
  fadeBottom = 0.6,
  color = '#6B7280',
  duration = 4000,
  className,
  style,
  ...props
}: GlyphMatrixProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const colorRef = useRef(color);
  const redrawRef = useRef<(() => void) | null>(null);

  useEffect(() => {
    colorRef.current = color;
    redrawRef.current?.();
  }, [color]);

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!canvas || !ctx) return;

    const characters = Array.from(glyphs || '01');
    const size = Math.max(8, finite(cellSize, 14));
    const rate = Math.min(1, Math.max(0, finite(mutationRate, 0.04)));
    const tickInterval = Math.max(80, finite(interval, 90));
    const fade = Math.min(1, Math.max(0, finite(fadeBottom, 0.6)));
    const media = window.matchMedia('(prefers-reduced-motion: reduce)');
    let remaining = Math.max(0, finite(duration, 4000));
    let visible = !('IntersectionObserver' in window);
    let timer: number | undefined;
    let width = 0;
    let height = 0;
    let pixelRatio = 0;
    let cols = 0;
    let rows = 0;
    let cells: string[] = [];
    let alphas: number[] = [];
    const randomGlyph = () =>
      characters[Math.floor(Math.random() * characters.length)];

    function draw() {
      if (!ctx) return;
      ctx.clearRect(0, 0, width, height);
      ctx.font = `${size - 2}px ui-monospace, SFMono-Regular, Menlo, monospace`;
      ctx.textBaseline = 'top';
      // Canvas preserves the fallback if the consumer passes an invalid color.
      ctx.fillStyle = '#6B7280';
      ctx.fillStyle = colorRef.current;
      for (let y = 0; y < rows; y++) {
        const opacity = 1 - (y / rows) * fade;
        for (let x = 0; x < cols; x++) {
          const i = y * cols + x;
          ctx.globalAlpha = alphas[i] * opacity;
          ctx.fillText(cells[i], x * size, y * size);
        }
      }
      ctx.globalAlpha = 1;
    }

    function stop() {
      if (timer !== undefined) window.clearTimeout(timer);
      timer = undefined;
    }

    function syncMotion() {
      stop();
      if (
        media.matches ||
        document.hidden ||
        !visible ||
        remaining <= 0 ||
        rate === 0 ||
        cells.length === 0
      )
        return;
      const started = performance.now();
      timer = window.setTimeout(
        () => {
          timer = undefined;
          remaining = Math.max(0, remaining - (performance.now() - started));
          const mutations = Math.max(1, Math.floor(cells.length * rate));
          for (let n = 0; n < mutations; n++) {
            const i = Math.floor(Math.random() * cells.length);
            cells[i] = randomGlyph();
            alphas[i] = 0.05 + Math.random() * 0.35;
          }
          draw();
          syncMotion();
        },
        Math.min(tickInterval, remaining),
      );
    }

    function resize() {
      if (!canvas || !ctx) return;
      const ratio = Math.min(window.devicePixelRatio || 1, 2);
      const w = canvas.clientWidth;
      const h = canvas.clientHeight;
      if (w === width && h === height && ratio === pixelRatio) return;
      width = w;
      height = h;
      pixelRatio = ratio;
      canvas.width = Math.round(w * ratio);
      canvas.height = Math.round(h * ratio);
      ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
      cols = Math.ceil(w / size);
      rows = Math.ceil(h / size);
      cells = Array.from({ length: cols * rows }, randomGlyph);
      alphas = Array.from(
        { length: cells.length },
        () => 0.05 + Math.random() * 0.35,
      );
      draw();
      syncMotion();
    }

    redrawRef.current = draw;
    resize();
    const resizeObserver = new ResizeObserver(resize);
    resizeObserver.observe(canvas);
    const visibilityObserver =
      'IntersectionObserver' in window
        ? new IntersectionObserver(([entry]) => {
            visible = entry.isIntersecting;
            syncMotion();
          })
        : null;
    visibilityObserver?.observe(canvas);
    document.addEventListener('visibilitychange', syncMotion);
    media.addEventListener('change', syncMotion);

    return () => {
      stop();
      resizeObserver.disconnect();
      visibilityObserver?.disconnect();
      document.removeEventListener('visibilitychange', syncMotion);
      media.removeEventListener('change', syncMotion);
      redrawRef.current = null;
    };
  }, [glyphs, cellSize, mutationRate, interval, fadeBottom, duration]);

  return (
    <canvas
      {...props}
      ref={canvasRef}
      className={cn('pointer-events-none', className)}
      style={{ width: '100%', height: '100%', display: 'block', ...style }}
      aria-hidden="true"
    />
  );
}

export default GlyphMatrix;
