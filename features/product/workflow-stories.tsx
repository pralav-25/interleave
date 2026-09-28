import Link from 'next/link';
import {
  ArrowRight,
  ArrowUpRight,
  Cpu,
  Fingerprint,
  GitBranch,
  LockKeyhole,
  MessageSquare,
  FileText,
} from 'lucide-react';

const repository = 'https://github.com/pralav-25/interleave';

function Schedule({ order, fixed }: { order: string; fixed?: boolean }) {
  return (
    <div className={`story-schedule${fixed ? ' story-schedule-safe' : ''}`}>
      <div className="story-schedule-heading">
        <span>{fixed ? 'A different order' : 'The failing order'}</span>
        <span>counter = {fixed ? '2' : '1'}</span>
      </div>
      <div
        className="story-schedule-steps"
        aria-label={`Worker order: ${order.split('').join(', ')}`}
      >
        {order.split('').map((actor, index) => (
          <span key={index} data-actor={actor} aria-hidden="true">
            {actor}
          </span>
        ))}
      </div>
    </div>
  );
}

export function WorkflowStories() {
  return (
    <div className="workflow-stories">
      <article className="workflow-story">
        <div className="story-copy" data-reveal>
          <p className="story-eyebrow">
            <GitBranch size={18} /> 01 / Follow the execution
          </p>
          <h3>
            Same code.
            <br />A different ending.
          </h3>
          <p>
            Rewind to any step and choose which worker goes next. See how a
            different order changes the result, then share a link that replays
            every decision.
          </p>
          <Link href="/lab#v=1&lab=lost-update&mode=buggy&trace=ABABAB">
            Rewind a lost update <ArrowRight size={17} />
          </Link>
        </div>
        <figure className="story-visual story-replay" data-reveal="media">
          <div className="story-visual-label">
            <GitBranch size={16} /> One counter. Two workers.
          </div>
          <Schedule order="ABABAB" />
          <div className="story-branch">
            <span />
            <GitBranch size={20} />
            <span>Rewind. Change the order.</span>
          </div>
          <Schedule order="AAABBB" fixed />
          <figcaption>
            Illustrated lost-update schedules. Both start at zero.
          </figcaption>
        </figure>
      </article>

      <article className="workflow-story workflow-story-reverse">
        <div className="story-copy" data-reveal>
          <p className="story-eyebrow">
            <Cpu size={18} /> 02 / Understand the why
          </p>
          <h3>
            Your trace.
            <br />A conversation.
          </h3>
          <p>
            Ask the optional local AI tutor about the execution in front of you.
            It receives verified model context and generates its answer on your
            device.
          </p>
          <p className="story-footnote">
            WebGPU required. The first model download is approximately 1 GB.
          </p>
          <a href={`${repository}/blob/main/docs/AI.md`}>
            How local AI works <ArrowUpRight size={17} />
          </a>
        </div>
        <figure className="story-visual story-assistant" data-reveal="media">
          <div className="story-visual-label">
            <MessageSquare size={16} /> From execution to explanation
          </div>
          <div className="story-context">
            <span>Current execution</span>
            <strong>Why did one increment disappear?</strong>
            <div>
              <span>Lost update</span>
              <span>Counter: 1 of 2</span>
            </div>
          </div>
          <div className="story-connector">
            <span />
            <span>Verified model context</span>
            <span />
          </div>
          <div className="story-model">
            <span className="story-chip">
              <Cpu size={30} />
            </span>
            <div>
              <strong>Local AI tutor</strong>
              <span>Runs in your browser with WebGPU</span>
            </div>
          </div>
          <figcaption>
            Illustrated assistant flow. You choose when to enable it.
          </figcaption>
        </figure>
      </article>

      <article className="workflow-story">
        <div className="story-copy" data-reveal>
          <p className="story-eyebrow">
            <Fingerprint size={18} /> 03 / Keep the investigation
          </p>
          <h3>
            Leave yourself
            <br />a trail to follow.
          </h3>
          <p>
            Keep the replay and your notes together in a private investigation.
            Sign in to save your work and pick up where you left off, or export
            a Markdown report from the lab.
          </p>
          <p className="story-footnote">
            The public lab is always available without an account.
          </p>
          <Link href="/workspace">
            Open your workspace <ArrowRight size={17} />
          </Link>
        </div>
        <figure className="story-visual story-notebook" data-reveal="media">
          <div className="story-visual-label">
            <FileText size={16} /> Example investigation{' '}
            <LockKeyhole size={15} />
          </div>
          <div className="story-note-sheet">
            <span className="story-note-eyebrow">
              LOST UPDATE / BUGGY MODEL
            </span>
            <h4>Two workers, one missing write.</h4>
            <div className="story-note-replay">
              <span>Replay</span>
              <code>A B A B A B</code>
            </div>
            <p>
              Both workers read zero before either writes. The second write
              replaces the first increment.
            </p>
            <div className="story-note-footer">
              <GitBranch size={15} />
              <span>6 steps · Reproducible execution</span>
            </div>
          </div>
          <figcaption>
            An example of the context you can keep with your notes.
          </figcaption>
        </figure>
      </article>
    </div>
  );
}
