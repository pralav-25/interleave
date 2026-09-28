'use client';

import {
  useEffect,
  useRef,
  useState,
  type CSSProperties,
  type ReactNode,
} from 'react';
import { cn } from '@/lib/utils';
import {
  FALLBACK_SURFACE,
  TEXT_SURFACE,
  type LiquidMetalVariant,
} from './liquid-metal-palettes';
import { createMetalController } from './liquid-metal-renderer';
import './liquid-metal.css';

export type { LiquidMetalVariant } from './liquid-metal-palettes';
export interface LiquidMetalProps {
  children?: ReactNode;
  className?: string;
  distortion?: number;
  maskText?: boolean;
  paused?: boolean;
  pointerInfluence?: boolean;
  speed?: number;
  variant?: LiquidMetalVariant;
  /** Maximum active animation time before settling, in milliseconds. */
  duration?: number;
}

/** Adapted from the supplied component; uses native motion preferences, with no animation runtime. */
export default function LiquidMetal({
  children,
  className,
  distortion = 1,
  maskText = false,
  paused = false,
  pointerInfluence = true,
  speed = 1,
  variant = 'chrome',
  duration = 4200,
}: LiquidMetalProps) {
  const wrapper = useRef<HTMLDivElement & HTMLSpanElement>(null);
  const canvas = useRef<HTMLCanvasElement>(null);
  const controller = useRef<ReturnType<typeof createMetalController>>(null);
  const settings = useRef({ variant, speed, distortion });
  const activeTime = useRef(0);
  const [staticSurface, setStaticSurface] = useState(true);
  const [visible, setVisible] = useState(false);
  const [entered, setEntered] = useState(false);
  const [pageVisible, setPageVisible] = useState(true);
  const [ready, setReady] = useState(false);
  const [settled, setSettled] = useState(false);
  const playing =
    !paused &&
    !staticSurface &&
    visible &&
    pageVisible &&
    !settled &&
    speed > 0;
  settings.current = { variant, speed, distortion };

  useEffect(() => {
    const queries = [
      '(prefers-reduced-motion: reduce)',
      '(prefers-reduced-transparency: reduce)',
      '(prefers-contrast: more)',
      '(forced-colors: active)',
    ].map((query) => window.matchMedia(query));
    const syncPreferences = () =>
      setStaticSurface(queries.some((query) => query.matches));
    const syncVisibility = () => setPageVisible(!document.hidden);
    syncPreferences();
    syncVisibility();
    queries.forEach((query) =>
      query.addEventListener('change', syncPreferences),
    );
    document.addEventListener('visibilitychange', syncVisibility);
    return () => {
      queries.forEach((query) =>
        query.removeEventListener('change', syncPreferences),
      );
      document.removeEventListener('visibilitychange', syncVisibility);
    };
  }, []);

  useEffect(() => {
    if (!wrapper.current) return;
    if (!('IntersectionObserver' in window)) {
      setVisible(true);
      setEntered(true);
      return;
    }
    const observer = new IntersectionObserver(
      ([entry]) => {
        setVisible(entry.isIntersecting);
        if (entry.isIntersecting) setEntered(true);
      },
      { threshold: 0.05 },
    );
    observer.observe(wrapper.current);
    return () => observer.disconnect();
  }, [maskText]);

  useEffect(() => {
    if (!playing) return;
    const started = performance.now();
    const limit = Number.isFinite(duration)
      ? Math.max(0, Math.min(duration, 4500))
      : 4200;
    const timer = window.setTimeout(
      () => setSettled(true),
      Math.max(0, limit - activeTime.current),
    );
    return () => {
      window.clearTimeout(timer);
      activeTime.current += performance.now() - started;
    };
  }, [playing, duration]);

  useEffect(() => {
    if (maskText || staticSurface || !entered || !canvas.current) return;
    const renderer = createMetalController(
      canvas.current,
      settings.current,
      () => setReady(false),
    );
    controller.current = renderer;
    setReady(!!renderer);
    return () => {
      renderer?.destroy();
      controller.current = null;
      setReady(false);
    };
  }, [maskText, staticSurface, entered]);

  useEffect(() => {
    controller.current?.update({ variant, speed, distortion });
    controller.current?.setRunning(playing);
  }, [variant, speed, distortion, playing, maskText, staticSurface, entered]);

  useEffect(() => {
    const node = wrapper.current;
    if (!node || !pointerInfluence || !playing || maskText) return;
    const query = window.matchMedia('(hover: hover) and (pointer: fine)');
    const move = (event: PointerEvent) => {
      if (!query.matches) return;
      const rect = node.getBoundingClientRect();
      if (!rect.width || !rect.height) return;
      controller.current?.setPointer(
        ((event.clientX - rect.left) / rect.width - 0.5) * 2,
        (0.5 - (event.clientY - rect.top) / rect.height) * 2,
      );
    };
    const leave = () => controller.current?.setPointer(0, 0);
    node.addEventListener('pointermove', move);
    node.addEventListener('pointerleave', leave);
    return () => {
      node.removeEventListener('pointermove', move);
      node.removeEventListener('pointerleave', leave);
      leave();
    };
  }, [playing, maskText, pointerInfluence]);

  if (maskText) {
    const style = {
      '--metal-text': TEXT_SURFACE[variant],
      '--metal-sweep-time': `${9 / Math.max(0.1, Math.min(3, Number.isFinite(speed) ? speed : 1))}s`,
      animationPlayState: playing ? 'running' : 'paused',
    } as CSSProperties;
    return (
      <span
        ref={wrapper}
        className={cn('liquid-metal-text', className)}
        style={style}
      >
        {children}
      </span>
    );
  }
  return (
    <div
      ref={wrapper}
      className={cn('liquid-metal', className)}
      data-metal-renderer={ready ? 'shader' : 'static'}
    >
      <div
        className="liquid-metal-surface"
        aria-hidden="true"
        style={{ backgroundImage: FALLBACK_SURFACE[variant] }}
      >
        <canvas
          ref={canvas}
          className={ready ? 'metal-canvas-ready' : undefined}
        />
      </div>
      <div className="liquid-metal-content">{children}</div>
    </div>
  );
}
