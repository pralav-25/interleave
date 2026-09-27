/* oxlint-disable nextjs/no-img-element -- Pre-optimized local WebP captures, with explicit dimensions and loading priority. */
import Link from 'next/link';
import {
  ArrowRight,
  ArrowUpRight,
  Workflow,
  Code,
  Monitor,
  ShieldCheck,
  GitBranch,
  Fingerprint,
  Cpu,
  Code2,
  BookOpen,
} from 'lucide-react';
import { InstallButton } from '@/features/product/install';
import { LegacyReplay } from '@/features/product/legacy-replay';
import { Showcase } from '@/features/product/showcase';
import { MacBookPreview } from '@/features/product/macbook-preview';
import { ProductMotion } from '@/features/product/motion';
import { AppLogo } from '@/features/product/app-logo';
import './product.css';
const repository = 'https://github.com/pralav-25/interleave';
const experiments = [
  ['01', 'Lost update', 'When two increments become one.', 'lost-update'],
  [
    '02',
    'Oversold inventory',
    'One seat. Two successful bookings.',
    'oversold-inventory',
  ],
  ['03', 'Double payment', 'The retry that charges twice.', 'double-payment'],
  ['04', 'Stale search', 'When an old response arrives last.', 'stale-search'],
  ['05', 'Deadlock', 'Two workers. Neither can move.', 'deadlock'],
  ['06', 'Write skew', 'Locally correct. Together, wrong.', 'write-skew'],
];
export default function Home() {
  return (
    <div className="product-site">
      <LegacyReplay />
      <ProductMotion />
      <header className="product-nav">
        <div className="product-nav-inner">
          <Link href="/" className="product-brand" aria-label="Interleave home">
            <AppLogo size={24} />
            Interleave
          </Link>
          <nav aria-label="Product navigation">
            <a href="#overview">Overview</a>
            <a href="#experiments">Experiments</a>
            <a href="#install">Install</a>
            <a
              className="source-nav"
              href={repository}
              target="_blank"
              rel="noreferrer"
            >
              <Code size={16} />
              <span>Source</span>
            </a>
          </nav>
          <Link href="/lab" className="nav-cta">
            Open lab <ArrowUpRight size={14} />
          </Link>
        </div>
      </header>
      <main id="main">
        <section className="product-hero" id="overview">
          <AppLogo className="hero-icon" size={96} />
          <h1>Interleave</h1>
          <p className="hero-description">
            Interleave gives you the tools to understand concurrency. Control
            the scheduler, reproduce race conditions, and test a fix against
            every possible order in a finite model. Explore six interactive
            experiments, with a local AI assistant and a workspace for your
            investigations.
          </p>
          <div className="hero-product">
            <MacBookPreview
              src="/screenshots/lost-update-macos.webp"
              alt="Interleave on a MacBook, showing a completed lost-update execution in the installed macOS app."
              priority
            />
          </div>
        </section>
        <section className="product-proof" aria-label="Product capabilities">
          <div>
            <Workflow size={19} />
            <span>6 interactive experiments</span>
          </div>
          <div>
            <GitBranch size={19} />
            <span>Every modeled schedule</span>
          </div>
          <div>
            <Monitor size={19} />
            <span>Install on your desktop</span>
          </div>
          <div>
            <Code2 size={19} />
            <span>Open source. Yours to explore.</span>
          </div>
        </section>
        <section className="product-section walkthrough" id="walkthrough">
          <div className="section-heading" data-reveal>
            <p className="product-kicker">Explore</p>
            <h2>Find the bug. Understand the fix.</h2>
            <p>
              Control two workers. Inspect every change. Then try a fix and put
              it through every possible order in the model.
            </p>
          </div>
          <Showcase />
          <p className="capture-note">
            Actual captures from the installed Interleave app on macOS. Each
            view links to the same reproducible execution.
          </p>
        </section>
        <section
          className="product-section experiment-section"
          id="experiments"
        >
          <div className="section-heading" data-reveal>
            <p className="product-kicker">Experiments</p>
            <h2>Six ways for “it should work” to go wrong.</h2>
            <p>
              Familiar bugs, reduced to the moments that matter. Every
              experiment includes a broken implementation, a fix, and explicit
              assumptions.
            </p>
          </div>
          <div className="experiment-grid">
            {experiments.map(([number, title, description, id], index) => (
              <Link
                href={`/lab#v=1&lab=${id}&mode=buggy&trace=`}
                className="experiment-card"
                key={id}
                data-reveal
                data-reveal-delay={(index % 3) * 50}
              >
                <span className="experiment-number">{number}</span>
                <ArrowUpRight className="experiment-arrow" size={21} />
                <h3>{title}</h3>
                <p>{description}</p>
                <span className="experiment-open">
                  Open experiment <ArrowRight size={15} />
                </span>
              </Link>
            ))}
          </div>
        </section>
        <section className="product-section workflow-section">
          <div className="section-heading" data-reveal>
            <p className="product-kicker">Investigate</p>
            <h2>Keep the whole investigation in one place.</h2>
          </div>
          <div className="workflow-grid">
            <article data-reveal>
              <GitBranch size={29} />
              <h3>Rewind. Branch. Replay.</h3>
              <p>
                Go back to any step and change the order. Share a link that
                reproduces the exact execution, or export a Markdown report.
              </p>
              <Link href="/lab">
                Start an investigation <ArrowRight size={16} />
              </Link>
            </article>
            <article data-reveal data-reveal-delay="50">
              <Cpu size={29} />
              <h3>An assistant on your device.</h3>
              <p>
                Enable the optional local AI tutor to discuss your trace. WebGPU
                required; the first model download is approximately 1 GB.
              </p>
              <a href={`${repository}/blob/main/docs/AI.md`}>
                How local AI works <ArrowUpRight size={16} />
              </a>
            </article>
            <article data-reveal data-reveal-delay="100">
              <Fingerprint size={29} />
              <h3>Your notes. Your workspace.</h3>
              <p>
                Sign in to save private investigations and pick up where you
                left off. The public lab is always available without an account.
              </p>
              <Link href="/workspace">
                Open your workspace <ArrowRight size={16} />
              </Link>
            </article>
          </div>
        </section>
        <section className="install-section" id="install">
          <div className="install-inner" data-reveal>
            <AppLogo className="install-icon" size={96} />
            <p className="product-kicker">Install</p>
            <h2>
              A little lab.
              <br />A place on your desktop.
            </h2>
            <p>
              Install Interleave for its own window and a shortcut in your Dock
              or app launcher. The public lab works offline after it has loaded
              once.
            </p>
            <div className="install-actions">
              <InstallButton className="product-primary" />
              <Link href="/lab" className="product-text-link">
                Or keep going in your browser <ArrowRight size={16} />
              </Link>
            </div>
            <div className="install-platforms">
              <span>
                <Monitor size={17} />
                macOS · Windows · Linux
              </span>
              <span>
                <ShieldCheck size={17} />
                No installer download required
              </span>
            </div>
            <p className="install-fineprint">
              A progressive web app. Installation depends on your browser.
              Sign-in and cloud saves require internet. Local AI has separate
              hardware and model-download requirements.
            </p>
          </div>
          <figure className="installed-preview">
            <MacBookPreview
              src="/screenshots/mac-app.webp"
              alt="Interleave installed on a MacBook, showing the lost-update experiment after both workers complete."
            />
            <figcaption>
              Interleave on macOS. A real execution in the installed app.
            </figcaption>
          </figure>
        </section>
        <section className="product-section faq-section">
          <div>
            <p className="product-kicker">Questions</p>
            <h2>
              Before you
              <br />
              start exploring.
            </h2>
            <a
              className="product-text-link"
              href={`${repository}/blob/main/docs/MODEL.md`}
            >
              <BookOpen size={16} />
              Read the model guide <ArrowUpRight size={16} />
            </a>
          </div>
          <div className="faq-list">
            <details>
              <summary>Does Interleave run my production code?</summary>
              <p>
                No. Interleave is an educational workbench for finite,
                two-worker models. It does not scan repositories or prove
                arbitrary programs safe.
              </p>
            </details>
            <details>
              <summary>What does “every schedule” mean?</summary>
              <p>
                The engine explores every enabled terminal schedule within each
                built-in finite model. If a search budget is reached, results
                are marked partial. Counts are not production failure
                probabilities.
              </p>
            </details>
            <details>
              <summary>Is it free? Do I need an account?</summary>
              <p>
                The public lab is free, open source, and requires no account.
                Sign in only when you want to keep private investigations in the
                cloud.
              </p>
            </details>
            <details>
              <summary>Can I use it without an internet connection?</summary>
              <p>
                After opening the lab online once in the production app, its
                core experiments are cached on that device. Private saves and
                sign-in need internet. Clearing browser storage removes offline
                files.
              </p>
            </details>
            <details>
              <summary>Can I run it on my own infrastructure?</summary>
              <p>
                Yes. The MIT-licensed source includes the deterministic engine,
                UI, database migrations, tests, and deployment documentation.
                Follow the repository’s setup instructions to configure your own
                identity and storage.
              </p>
            </details>
          </div>
        </section>
      </main>
      <footer className="product-footer">
        <div>
          <Link href="/" className="product-brand">
            <AppLogo size={24} />
            Interleave
          </Link>
          <p>Concurrency, made visible.</p>
        </div>
        <div>
          <span>
            Made by <a href="https://github.com/pralav-25">Pralav Singh ↗</a>
          </span>
          <a href={repository}>GitHub</a>
          <a href={`${repository}/blob/main/LICENSE`}>MIT license</a>
          <Link href="/workspace">Workspace</Link>
        </div>
      </footer>
    </div>
  );
}
