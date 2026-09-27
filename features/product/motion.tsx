'use client';
import { useEffect } from 'react';

/** Progressive enhancement: content is visible before hydration and without JS. */
export function ProductMotion() {
  useEffect(() => {
    if (!('IntersectionObserver' in window) || !Element.prototype.animate)
      return;
    const media = window.matchMedia('(prefers-reduced-motion: reduce)');
    const animations = new Set<Animation>();
    const seen = new WeakSet<Element>();
    const root = document.querySelector('.product-site');
    if (!root) return;
    const style = getComputedStyle(root);
    const duration =
      parseFloat(style.getPropertyValue('--motion-entrance')) || 380;
    const easing = style.getPropertyValue('--ease-enter').trim();
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (!entry.isIntersecting) continue;
          observer.unobserve(entry.target);
          if (media.matches || seen.has(entry.target)) continue;
          seen.add(entry.target);
          const delay =
            Number(entry.target.getAttribute('data-reveal-delay')) || 0;
          const animation = entry.target.animate(
            [
              { opacity: 0, transform: 'translateY(16px)' },
              { opacity: 1, transform: 'translateY(0)' },
            ],
            {
              duration,
              delay: Math.min(delay, 150),
              easing,
              fill: 'backwards',
            },
          );
          animations.add(animation);
          animation.finished.then(
            () => animations.delete(animation),
            () => animations.delete(animation),
          );
        }
      },
      { threshold: 0.08 },
    );
    function syncMotion() {
      observer.disconnect();
      for (const animation of animations) animation.cancel();
      animations.clear();
      if (!media.matches) {
        root?.querySelectorAll('[data-reveal]').forEach((element) => {
          if (!seen.has(element)) observer.observe(element);
        });
      }
    }
    syncMotion();
    media.addEventListener('change', syncMotion);
    return () => {
      observer.disconnect();
      media.removeEventListener('change', syncMotion);
      for (const animation of animations) animation.cancel();
    };
  }, []);
  return null;
}
