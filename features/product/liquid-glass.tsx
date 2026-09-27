'use client';

import {
  useEffect,
  useId,
  useRef,
  useState,
  type CSSProperties,
  type HTMLAttributes,
} from 'react';

/** A web material: SVG edge lensing on Chromium, frosted optics elsewhere. */
export function LiquidGlass({
  as: Tag = 'div',
  children,
  className = '',
  radius = 32,
  ...props
}: HTMLAttributes<HTMLDivElement> & {
  radius?: number;
  as?: 'div' | 'section';
}) {
  const id = `liquid-${useId().replace(/[^a-zA-Z0-9_-]/g, '')}`;
  const root = useRef<HTMLDivElement>(null);
  const [map, setMap] = useState('');

  useEffect(() => {
    const element = root.current;
    if (!element) return;
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)');
    const opaque = window.matchMedia(
      '(prefers-reduced-transparency: reduce), (prefers-contrast: more)',
    );
    // SVG backdrop filters currently fail in WebKit and Gecko. Keep their CSS optics.
    const canRefract =
      /Chrome\//.test(navigator.userAgent) &&
      !/EdgiOS|CriOS/.test(navigator.userAgent);
    let frame = 0;
    let lightFrame = 0;
    let lastSize = '';
    let light = { x: 50, y: 0 };
    function resize() {
      if (!element || !canRefract || opaque.matches || reduced.matches) {
        setMap('');
        lastSize = '';
        return;
      }
      const width = Math.max(1, Math.round(element.clientWidth));
      const height = Math.max(1, Math.round(element.clientHeight));
      const size = `${width}:${height}`;
      if (lastSize === size) return;
      lastSize = size;
      const scale = Math.min(1, 900 / width, 300 / height);
      const canvas = document.createElement('canvas');
      canvas.width = Math.max(1, Math.round(width * scale));
      canvas.height = Math.max(1, Math.round(height * scale));
      const context = canvas.getContext('2d');
      if (!context) return;
      const pixels = context.createImageData(canvas.width, canvas.height);
      const r = Math.min(radius, width / 2, height / 2) * scale;
      const bevel = Math.min(14 * scale, r);
      for (let y = 0; y < canvas.height; y++) {
        for (let x = 0; x < canvas.width; x++) {
          const dx = x - Math.max(r, Math.min(canvas.width - r, x));
          const dy = y - Math.max(r, Math.min(canvas.height - r, y));
          const distance = Math.hypot(dx, dy);
          const depth = r - distance;
          const bend =
            distance > 0 && depth >= 0 && depth < bevel
              ? Math.sin((depth / bevel) * Math.PI)
              : 0;
          const offset = (y * canvas.width + x) * 4;
          pixels.data[offset] =
            128 + (distance ? dx / distance : 0) * bend * 110;
          pixels.data[offset + 1] =
            128 + (distance ? dy / distance : 0) * bend * 110;
          pixels.data[offset + 2] = 128;
          pixels.data[offset + 3] = 255;
        }
      }
      context.putImageData(pixels, 0, 0);
      setMap(canvas.toDataURL());
    }
    function queueResize() {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(resize);
    }
    function move(event: PointerEvent) {
      if (
        !element ||
        reduced.matches ||
        opaque.matches ||
        event.pointerType === 'touch'
      )
        return;
      const bounds = element.getBoundingClientRect();
      light = {
        x: ((event.clientX - bounds.left) / bounds.width) * 100,
        y: ((event.clientY - bounds.top) / bounds.height) * 100,
      };
      if (lightFrame) return;
      lightFrame = requestAnimationFrame(() => {
        element.style.setProperty('--liquid-x', `${light.x}%`);
        element.style.setProperty('--liquid-y', `${light.y}%`);
        lightFrame = 0;
      });
    }
    function resetLight() {
      cancelAnimationFrame(lightFrame);
      lightFrame = 0;
      element?.style.removeProperty('--liquid-x');
      element?.style.removeProperty('--liquid-y');
    }
    function preferencesChanged() {
      resetLight();
      queueResize();
    }
    const observer = new ResizeObserver(queueResize);
    observer.observe(element);
    queueResize();
    element.addEventListener('pointermove', move, { passive: true });
    element.addEventListener('pointerleave', resetLight);
    reduced.addEventListener('change', preferencesChanged);
    opaque.addEventListener('change', preferencesChanged);
    return () => {
      observer.disconnect();
      cancelAnimationFrame(frame);
      cancelAnimationFrame(lightFrame);
      element.removeEventListener('pointermove', move);
      element.removeEventListener('pointerleave', resetLight);
      reduced.removeEventListener('change', preferencesChanged);
      opaque.removeEventListener('change', preferencesChanged);
    };
  }, [radius]);

  return (
    <Tag ref={root} className={`liquid-glass ${className}`} {...props}>
      {map && (
        <svg
          className="liquid-filter"
          aria-hidden="true"
          focusable="false"
          width="1"
          height="1"
        >
          <defs>
            <filter
              id={id}
              x="0"
              y="0"
              width="100%"
              height="100%"
              colorInterpolationFilters="sRGB"
            >
              <feImage
                href={map}
                x="0"
                y="0"
                width="100%"
                height="100%"
                preserveAspectRatio="none"
                result="lens"
              />
              <feDisplacementMap
                in="SourceGraphic"
                in2="lens"
                scale="26"
                xChannelSelector="R"
                yChannelSelector="G"
              />
            </filter>
          </defs>
        </svg>
      )}
      <span
        className="liquid-material"
        aria-hidden="true"
        style={
          map
            ? ({
                '--liquid-filter': `url("#${id}") blur(6px) saturate(1.5)`,
              } as CSSProperties)
            : undefined
        }
      />
      {children}
    </Tag>
  );
}
