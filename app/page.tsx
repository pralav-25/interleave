/* oxlint-disable nextjs/no-img-element -- Pre-optimized local WebP captures, with explicit dimensions and loading priority. */
import Link from 'next/link';
import {
  ArrowRight,
  ArrowUpRight,
  Workflow,
  Monitor,
  ShieldCheck,
  GitBranch,
  Code2,
  BookOpen,
} from 'lucide-react';
import { InstallButton } from '@/features/product/install';
import { LegacyReplay } from '@/features/product/legacy-replay';
import { Showcase } from '@/features/product/showcase';
import { ExperimentExplorer } from '@/features/product/experiment-explorer';
import { MacBookPreview } from '@/features/product/macbook-preview';
import { ProductMotion } from '@/features/product/motion';
import { AppLogo } from '@/features/product/app-logo';
import { GlyphMatrix } from '@/components/ui/glyph-matrix';
import { NavigationDock } from '@/features/product/navigation-dock';
import { WorkflowStories } from '@/features/product/workflow-stories';
import LiquidMetal from '@/components/ui/liquid-metal';
import './product.css';
const repository = 'https://github.com/pralav-25/interleave';
export default function Home() {
  return (
    <div className="product-site">
      <LegacyReplay />
      <ProductMotion />
      <NavigationDock />
      <main id="main">
        <section className="product-hero" id="overview">
          <div className="hero-glyphs" aria-hidden="true">
            <GlyphMatrix
              glyphs="01.+*/<>="
              cellSize={20}
              mutationRate={0.025}
              interval={240}
              fadeBottom={0.9}
              color="#a1a1a6"
              duration={3600}
            />
          </div>
          <div className="hero-wordmark" data-reveal="hero">
            <AppLogo className="hero-icon" size={48} />
            <span>Interleave</span>
          </div>
          <h1>
            <span data-reveal="hero" data-reveal-delay="60">
              Concurrency.
            </span>
            <span data-reveal="hero" data-reveal-delay="120">
              <LiquidMetal
                maskText
                variant="chrome"
                speed={0.65}
                pointerInfluence={false}
              >
                Made visible.
              </LiquidMetal>
            </span>
          </h1>
          <p
            className="hero-description"
            data-reveal="hero"
            data-reveal-delay="180"
          >
            Find the race. Replay every step. Understand why a fix works, with
            six interactive experiments and every schedule in a finite model.
          </p>
          <div
            className="hero-actions"
            data-reveal="hero"
            data-reveal-delay="240"
          >
            <InstallButton className="product-primary" />
            <Link href="/lab" className="product-secondary">
              Open the lab <ArrowUpRight size={18} />
            </Link>
          </div>
          <div className="hero-product" data-reveal="media">
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
          <div className="section-heading section-heading-split" data-reveal>
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
          <div className="section-heading section-heading-split" data-reveal>
            <p className="product-kicker">Experiments</p>
            <h2>Six ways for “it should work” to go wrong.</h2>
            <p>
              Familiar bugs, reduced to the moments that matter. Every
              experiment includes a broken implementation, a fix, and explicit
              assumptions.
            </p>
          </div>
          <ExperimentExplorer />
        </section>
        <section className="product-section workflow-section">
          <div className="section-heading section-heading-wide" data-reveal>
            <p className="product-kicker">Investigate</p>
            <h2>Keep the whole investigation in one place.</h2>
          </div>
          <WorkflowStories />
        </section>
        <section className="install-section" id="install">
          <div className="install-inner" data-reveal>
            <AppLogo className="install-icon" size={64} />
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
            <LiquidMetal
              className="install-metal-stage"
              variant="mercury"
              distortion={1.1}
              speed={0.3}
            >
              <MacBookPreview
                src="/screenshots/mac-app.webp"
                alt="Interleave installed on a MacBook, showing the lost-update experiment after both workers complete."
              />
            </LiquidMetal>
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
