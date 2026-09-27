'use client';
import { useEffect, useId, useRef, useState } from 'react';
import Link from 'next/link';
import { Download, Check, ArrowUpRight } from 'lucide-react';

type InstallPrompt = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
};

export function InstallButton({ className = '' }: { className?: string }) {
  const [prompt, setPrompt] = useState<InstallPrompt | null>(null);
  const [installed, setInstalled] = useState(false);
  const [help, setHelp] = useState(false);
  const helpId = useId();
  const trigger = useRef<HTMLButtonElement>(null);
  function dismissHelp() {
    setHelp(false);
    trigger.current?.focus();
  }
  useEffect(() => {
    if (!help) return;
    const closeOnEscape = (event: KeyboardEvent) => {
      if (
        event.key === 'Escape' &&
        event.target instanceof Node &&
        trigger.current?.parentElement?.contains(event.target)
      ) {
        event.stopPropagation();
        setHelp(false);
        trigger.current?.focus();
      }
    };
    document.addEventListener('keydown', closeOnEscape);
    return () => document.removeEventListener('keydown', closeOnEscape);
  }, [help]);
  useEffect(() => {
    const media = window.matchMedia('(display-mode: standalone)');
    const sync = () => setInstalled(media.matches);
    const ready = (event: Event) => {
      event.preventDefault();
      setPrompt(event as InstallPrompt);
    };
    const done = () => {
      setInstalled(true);
      setPrompt(null);
      setHelp(false);
    };
    sync();
    window.addEventListener('beforeinstallprompt', ready);
    window.addEventListener('appinstalled', done);
    media.addEventListener('change', sync);
    return () => {
      window.removeEventListener('beforeinstallprompt', ready);
      window.removeEventListener('appinstalled', done);
      media.removeEventListener('change', sync);
    };
  }, []);
  async function install() {
    if (!prompt) {
      setHelp(!help);
      return;
    }
    try {
      await prompt.prompt();
      const choice = await prompt.userChoice;
      if (choice.outcome === 'accepted') setInstalled(true);
    } catch {
      setHelp(true);
    } finally {
      setPrompt(null);
    }
  }
  return (
    <div className="install-control">
      <button
        ref={trigger}
        className={className}
        onClick={install}
        disabled={installed}
        aria-expanded={help}
        aria-controls={help ? helpId : undefined}
      >
        {installed ? <Check size={16} /> : <Download size={16} />}
        {installed ? 'Installed' : 'Install Interleave'}
      </button>
      {help && (
        <section
          className="install-help"
          id={helpId}
          aria-label="Installation instructions"
        >
          <strong>A place on your desktop.</strong>
          <p>
            In Chrome or Edge, open the browser menu and choose{' '}
            <b>Cast, save and share → Install page as app</b> (or{' '}
            <b>Apps → Install this site as an app</b>).
          </p>
          <p>
            On a Mac with Safari, choose <b>File → Add to Dock</b>. On iPhone or
            iPad, use <b>Share → Add to Home Screen</b>.
          </p>
          <Link href="/lab">
            Open the lab first <ArrowUpRight size={14} />
          </Link>
          <button className="install-dismiss" onClick={dismissHelp}>
            Got it
          </button>
        </section>
      )}
    </div>
  );
}

export function AppLifecycle() {
  const [offline, setOffline] = useState(false);
  const [waiting, setWaiting] = useState<ServiceWorker | null>(null);
  useEffect(() => {
    const online = () => setOffline(!navigator.onLine);
    online();
    window.addEventListener('online', online);
    window.addEventListener('offline', online);
    let disposed = false;
    if ('serviceWorker' in navigator && process.env.NODE_ENV === 'production') {
      navigator.serviceWorker
        .register('/sw.js', { updateViaCache: 'none' })
        .then((registration) => {
          if (disposed) return;
          if (registration.waiting) setWaiting(registration.waiting);
          registration.addEventListener('updatefound', () => {
            const worker = registration.installing;
            worker?.addEventListener('statechange', () => {
              if (
                !disposed &&
                worker.state === 'installed' &&
                navigator.serviceWorker.controller
              )
                setWaiting(worker);
            });
          });
        })
        .catch(() => {
          /* The online app still works if storage is unavailable. */
        });
    }
    return () => {
      disposed = true;
      window.removeEventListener('online', online);
      window.removeEventListener('offline', online);
    };
  }, []);
  return (
    <>
      {offline && (
        <output className="connection-banner">
          You’re offline. Previously loaded lab experiments still work. Saving
          needs a connection.
        </output>
      )}
      {waiting && (
        <output className="update-banner">
          A new version is ready. Export any unsaved trace before updating.{' '}
          <button
            onClick={() => {
              navigator.serviceWorker.addEventListener(
                'controllerchange',
                () => window.location.reload(),
                { once: true },
              );
              waiting.postMessage({ type: 'SKIP_WAITING' });
            }}
          >
            Update app
          </button>
        </output>
      )}
    </>
  );
}
