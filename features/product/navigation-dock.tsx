'use client';

import { useEffect, useRef, useState, type MouseEvent } from 'react';
import Link from 'next/link';
import { Code2, Download, FlaskConical, PanelsTopLeft } from 'lucide-react';
import { AppLogo } from './app-logo';
import { LiquidGlass } from './liquid-glass';

const sections = ['overview', 'experiments', 'install'] as const;
type Section = (typeof sections)[number];

export function NavigationDock() {
  const [active, setActive] = useState<Section>('overview');
  const animation = useRef(0);

  useEffect(() => {
    let tracking = 0;
    const motion = window.matchMedia('(prefers-reduced-motion: reduce)');
    function cancelScroll() {
      cancelAnimationFrame(animation.current);
      animation.current = 0;
    }
    function trackSection() {
      tracking = 0;
      const threshold = Math.min(window.innerHeight * 0.35, 240);
      let current: Section = 'overview';
      for (const id of sections) {
        const section = document.getElementById(id);
        if (section && section.getBoundingClientRect().top <= threshold)
          current = id;
      }
      setActive(current);
    }
    function queueTracking() {
      if (!tracking) tracking = requestAnimationFrame(trackSection);
    }
    function interrupt(event: KeyboardEvent) {
      if (
        [
          'Escape',
          'ArrowUp',
          'ArrowDown',
          'PageUp',
          'PageDown',
          'Home',
          'End',
          ' ',
        ].includes(event.key)
      )
        cancelScroll();
    }
    trackSection();
    window.addEventListener('scroll', queueTracking, { passive: true });
    window.addEventListener('resize', queueTracking);
    window.addEventListener('wheel', cancelScroll, { passive: true });
    window.addEventListener('touchstart', cancelScroll, { passive: true });
    window.addEventListener('keydown', interrupt);
    window.addEventListener('popstate', cancelScroll);
    motion.addEventListener('change', cancelScroll);
    return () => {
      cancelScroll();
      cancelAnimationFrame(tracking);
      window.removeEventListener('scroll', queueTracking);
      window.removeEventListener('resize', queueTracking);
      window.removeEventListener('wheel', cancelScroll);
      window.removeEventListener('touchstart', cancelScroll);
      window.removeEventListener('keydown', interrupt);
      window.removeEventListener('popstate', cancelScroll);
      motion.removeEventListener('change', cancelScroll);
    };
  }, []);

  function navigate(event: MouseEvent<HTMLAnchorElement>, id: Section) {
    if (
      event.button !== 0 ||
      event.metaKey ||
      event.ctrlKey ||
      event.shiftKey ||
      event.altKey
    )
      return;
    const target = document.getElementById(id);
    if (!target) return;
    event.preventDefault();
    cancelAnimationFrame(animation.current);
    animation.current = 0;
    const from = window.scrollY;
    const top = Math.max(
      0,
      Math.min(
        from + target.getBoundingClientRect().top - 24,
        document.documentElement.scrollHeight - window.innerHeight,
      ),
    );
    if (window.location.hash !== `#${id}`)
      window.history.pushState(window.history.state, '', `#${id}`);
    function finish() {
      animation.current = 0;
      setActive(id);
      if (event.detail === 0) {
        target!.setAttribute('tabindex', '-1');
        target!.focus({ preventScroll: true });
      }
    }
    if (
      window.matchMedia('(prefers-reduced-motion: reduce)').matches ||
      Math.abs(top - from) < 2
    ) {
      window.scrollTo({ top, behavior: 'instant' });
      finish();
      return;
    }
    const start = performance.now();
    const duration = Math.min(1150, 600 + Math.abs(top - from) * 0.1);
    function step(now: number) {
      const progress = Math.min(1, (now - start) / duration);
      const eased =
        progress < 0.5 ? 4 * progress ** 3 : 1 - (-2 * progress + 2) ** 3 / 2;
      window.scrollTo({
        top: from + (top - from) * eased,
        behavior: 'instant',
      });
      if (progress < 1) animation.current = requestAnimationFrame(step);
      else finish();
    }
    animation.current = requestAnimationFrame(step);
  }

  return (
    <header className="dock-position">
      <LiquidGlass className="navigation-dock" radius={26}>
        <nav className="dock-items" aria-label="Product navigation">
          <a
            href="#overview"
            className="dock-link"
            aria-label="Overview"
            aria-current={active === 'overview' ? 'location' : undefined}
            onClick={(event) => navigate(event, 'overview')}
          >
            <span className="dock-icon dock-home">
              <AppLogo size={32} />
            </span>
            <span className="dock-label" aria-hidden="true">
              Overview
            </span>
          </a>
          <a
            href="#experiments"
            className="dock-link"
            aria-label="Experiments"
            aria-current={active === 'experiments' ? 'location' : undefined}
            onClick={(event) => navigate(event, 'experiments')}
          >
            <span className="dock-icon">
              <FlaskConical size={25} strokeWidth={1.6} />
            </span>
            <span className="dock-label" aria-hidden="true">
              Experiments
            </span>
          </a>
          <a
            href="#install"
            className="dock-link"
            aria-label="Install"
            aria-current={active === 'install' ? 'location' : undefined}
            onClick={(event) => navigate(event, 'install')}
          >
            <span className="dock-icon">
              <Download size={25} strokeWidth={1.6} />
            </span>
            <span className="dock-label" aria-hidden="true">
              Install
            </span>
          </a>
          <span className="dock-divider" aria-hidden="true" />
          <a
            href="https://github.com/pralav-25/interleave"
            className="dock-link"
            aria-label="Source on GitHub (opens in a new tab)"
            target="_blank"
            rel="noreferrer"
          >
            <span className="dock-icon">
              <Code2 size={25} strokeWidth={1.6} />
            </span>
            <span className="dock-label" aria-hidden="true">
              Source
            </span>
          </a>
          <Link
            href="/lab"
            className="dock-link dock-lab"
            aria-label="Open lab"
          >
            <span className="dock-icon">
              <PanelsTopLeft size={25} strokeWidth={1.6} />
            </span>
            <span className="dock-label" aria-hidden="true">
              Open lab
            </span>
          </Link>
        </nav>
      </LiquidGlass>
    </header>
  );
}
