/* oxlint-disable nextjs/no-img-element -- Pre-optimized local WebP captures, with explicit dimensions and loading priority. */
'use client';
import { useState } from 'react';
import {
  ArrowUpRight,
  CircleAlert,
  ShieldCheck,
  LockKeyhole,
} from 'lucide-react';
const scenes = [
  {
    id: 'bug',
    title: 'Find the race',
    icon: CircleAlert,
    image: '/screenshots/lost-update-macos.webp',
    alt: 'Interleave running a lost update: two completed workers leave the shared counter at one.',
    caption: 'Two increments. One lost update.',
    text: 'Step through a real execution and see exactly where shared state goes wrong.',
    replay: 'v=1&lab=lost-update&mode=buggy&trace=ABABAB',
  },
  {
    id: 'fix',
    title: 'Verify the fix',
    icon: ShieldCheck,
    image: '/screenshots/atomic-fix-macos.webp',
    alt: 'Interleave verifies the atomic increment: both terminal schedules pass the invariant.',
    caption: 'A small change. Every schedule passes.',
    text: 'Switch to an atomic operation and check every terminal schedule in this finite model.',
    replay: 'v=1&lab=lost-update&mode=fixed&trace=AB',
  },
  {
    id: 'deadlock',
    title: 'Untangle a deadlock',
    icon: LockKeyhole,
    image: '/screenshots/deadlock-macos.webp',
    alt: 'Interleave shows two workers blocked while each holds the lock the other needs.',
    caption: 'See the wait. Understand the cycle.',
    text: 'Inspect lock ownership, rewind the timeline, and explore a different order.',
    replay: 'v=1&lab=deadlock&mode=buggy&trace=AB',
  },
];
export function Showcase() {
  const [active, setActive] = useState(0);
  const scene = scenes[active];
  return (
    <div className="showcase">
      <div
        className="showcase-tabs"
        role="tablist"
        aria-label="Product walkthrough"
      >
        {scenes.map((item, i) => (
          <button
            id={`scene-${item.id}`}
            key={item.id}
            role="tab"
            aria-selected={active === i}
            aria-controls="scene-panel"
            tabIndex={active === i ? 0 : -1}
            onClick={() => setActive(i)}
            onKeyDown={(event) => {
              const next =
                event.key === 'ArrowRight'
                  ? (i + 1) % scenes.length
                  : event.key === 'ArrowLeft'
                    ? (i + scenes.length - 1) % scenes.length
                    : event.key === 'Home'
                      ? 0
                      : event.key === 'End'
                        ? scenes.length - 1
                        : null;
              if (next !== null) {
                event.preventDefault();
                setActive(next);
                document.getElementById(`scene-${scenes[next].id}`)?.focus();
              }
            }}
          >
            <item.icon size={17} />
            {item.title}
          </button>
        ))}
      </div>
      <div
        role="tabpanel"
        id="scene-panel"
        aria-labelledby={`scene-${scene.id}`}
        tabIndex={0}
      >
        <div className="screenshot-shell">
          <div className="window-chrome">
            <span />
            <span />
            <span />
            <p>Interleave / {scene.title}</p>
            <span className="window-local">Runs on your device</span>
          </div>
          <img
            src={scene.image}
            alt={scene.alt}
            width="2940"
            height="1664"
            loading="lazy"
          />
        </div>
        <div className="scene-caption">
          <div>
            <h3>{scene.caption}</h3>
            <p>{scene.text}</p>
          </div>
          <a href={`/lab#${scene.replay}`}>
            Explore this execution <ArrowUpRight size={17} />
          </a>
        </div>
      </div>
    </div>
  );
}
