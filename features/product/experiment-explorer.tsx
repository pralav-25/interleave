'use client';

import { useState } from 'react';
import Link from 'next/link';
import { ArrowRight, ChevronRight } from 'lucide-react';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';

const experiments = [
  {
    id: 'lost-update',
    title: 'Lost update',
    category: 'Shared memory',
    description: 'When two increments become one.',
    actors: ['Worker A', 'Worker B'],
    steps: [
      [0, 'Read counter → 0'],
      [1, 'Read counter → 0'],
      [0, 'Write counter → 1'],
      [1, 'Write counter → 1'],
    ],
    outcome: 'counter = 1',
    expected: 'Expected 2',
    why: 'Both workers start from the same value. The last write erases the first increment.',
    fix: 'Make the increment atomic.',
    trace: 'ABABAB',
  },
  {
    id: 'oversold-inventory',
    title: 'Oversold inventory',
    category: 'Check then act',
    description: 'One seat. Two successful bookings.',
    actors: ['Buyer A', 'Buyer B'],
    steps: [
      [0, 'See 1 seat available'],
      [1, 'See 1 seat available'],
      [0, 'Confirm booking'],
      [1, 'Confirm booking'],
    ],
    outcome: '2 orders · 1 seat',
    expected: 'At most 1 order',
    why: 'Both buyers pass the availability check before either reserves the last seat.',
    fix: 'Check and reserve in one atomic step.',
    trace: 'ABAB',
  },
  {
    id: 'double-payment',
    title: 'Double payment',
    category: 'Idempotency',
    description: 'The retry that charges twice.',
    actors: ['Request', 'Retry'],
    steps: [
      [0, 'Key is unused'],
      [1, 'Key is unused'],
      [0, 'Charge $50'],
      [1, 'Charge $50'],
    ],
    outcome: '$100 charged',
    expected: 'One $50 charge',
    why: 'Checking the key does not claim it. Both handlers believe they can charge the customer.',
    fix: 'Atomically claim the key before charging.',
    trace: 'ABABAB',
  },
  {
    id: 'stale-search',
    title: 'Stale search',
    category: 'Async responses',
    description: 'When an old response arrives last.',
    actors: ['Old query', 'New query'],
    steps: [
      [1, '“react hooks” arrives'],
      [1, 'Show new results'],
      [0, '“react” arrives'],
      [0, 'Overwrite results'],
    ],
    outcome: 'Old results shown',
    expected: 'Latest query wins',
    why: 'The older request finishes last and replaces the results for the newer search.',
    fix: 'Only commit the latest request version.',
    trace: 'BBAA',
  },
  {
    id: 'deadlock',
    title: 'Deadlock',
    category: 'Lock ordering',
    description: 'Two workers. Neither can move.',
    actors: ['Worker A', 'Worker B'],
    steps: [
      [0, 'Lock users'],
      [1, 'Lock orders'],
      [0, 'Wait for orders'],
      [1, 'Wait for users'],
    ],
    outcome: 'Both workers blocked',
    expected: 'Both workers finish',
    why: 'Each worker holds the lock the other needs. Neither can reach the release step.',
    fix: 'Acquire locks in the same global order.',
    trace: 'AB',
  },
  {
    id: 'write-skew',
    title: 'Write skew',
    category: 'Transaction anomaly',
    description: 'Locally correct. Together, wrong.',
    actors: ['Alice', 'Bob'],
    steps: [
      [0, 'Bob is on call'],
      [1, 'Alice is on call'],
      [0, 'Go off call'],
      [1, 'Go off call'],
    ],
    outcome: 'Nobody on call',
    expected: 'At least 1 doctor stays',
    why: 'Each doctor relies on the other staying. Separate writes break the shared rule.',
    fix: 'Serialize the check and update.',
    trace: 'ABAB',
  },
] as const;

export function ExperimentExplorer() {
  const [active, setActive] = useState<string>(experiments[0].id);
  return (
    <Tabs
      value={active}
      onValueChange={(value) => setActive(String(value))}
      orientation="vertical"
      className="experiment-explorer"
    >
      <TabsList
        className="experiment-index"
        aria-label="Choose an experiment"
        aria-orientation="vertical"
        onKeyDown={(event) => {
          if (event.key !== 'ArrowDown' && event.key !== 'ArrowUp') return;
          event.preventDefault();
          const index = experiments.findIndex((item) => item.id === active);
          const next =
            (index +
              (event.key === 'ArrowDown' ? 1 : -1) +
              experiments.length) %
            experiments.length;
          setActive(experiments[next].id);
          event.currentTarget
            .querySelector<HTMLButtonElement>(
              `[data-experiment="${experiments[next].id}"]`,
            )
            ?.focus();
        }}
      >
        {experiments.map((item, index) => (
          <TabsTrigger
            value={item.id}
            key={item.id}
            data-experiment={item.id}
            className="experiment-index-item"
          >
            <span className="experiment-index-number">
              {String(index + 1).padStart(2, '0')}
            </span>
            <span className="experiment-index-copy">
              <span>{item.title}</span>
              <small>{item.category}</small>
            </span>
            <ChevronRight size={17} aria-hidden="true" />
          </TabsTrigger>
        ))}
      </TabsList>
      {experiments.map((item, index) => (
        <TabsContent
          value={item.id}
          key={item.id}
          className="experiment-detail"
        >
          <div className="experiment-detail-heading">
            <span className="experiment-category">{item.category}</span>
            <span className="experiment-position">
              {String(index + 1).padStart(2, '0')} / 06
            </span>
          </div>
          <h3>{item.title}</h3>
          <p className="experiment-description">{item.description}</p>
          <figure
            className="experiment-trace"
            aria-label={`Illustrated failure: ${item.title}`}
          >
            <div className="trace-heading">
              <span>How it breaks</span>
              <span>Time ↓</span>
            </div>
            <div className="trace-lanes" aria-hidden="true">
              <span>{item.actors[0]}</span>
              <span>{item.actors[1]}</span>
            </div>
            <ol className="trace-steps">
              {item.steps.map(([actor, text], step) => (
                <li
                  key={step}
                  className={`trace-step actor-${actor}${step === 3 ? ' trace-conflict' : ''}`}
                >
                  <span className="trace-tick" aria-hidden="true">
                    {step + 1}
                  </span>
                  <span className="trace-event">
                    <span className="sr-only">{item.actors[actor]}: </span>
                    {text}
                  </span>
                </li>
              ))}
            </ol>
            <div className="trace-outcome">
              <strong>{item.outcome}</strong>
              <span>{item.expected}</span>
            </div>
          </figure>
          <p className="experiment-why">{item.why}</p>
          <div className="experiment-detail-footer">
            <p>
              <span>The fix</span>
              {item.fix}
            </p>
            <Link
              href={`/lab#v=1&lab=${item.id}&mode=buggy&trace=${item.trace}`}
              className="experiment-launch"
            >
              Try this experiment <ArrowRight size={17} aria-hidden="true" />
            </Link>
          </div>
        </TabsContent>
      ))}
    </Tabs>
  );
}
