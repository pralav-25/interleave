'use client';
import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import {
  Workflow,
  ArrowUpRight,
  Plus,
  Bookmark,
  Pencil,
  Trash2,
  RefreshCw,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogCancel,
  AlertDialogAction,
} from '@/components/ui/alert-dialog';
import { experiments } from '@/lib/experiments';
import { encodeReplay } from '@/lib/engine';
import {
  decodeTrace,
  MAX_INVESTIGATIONS,
  type Investigation,
} from '@/lib/investigations';
export function Workspace({ email }: { email: string }) {
  const [items, setItems] = useState<Investigation[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [editing, setEditing] = useState<Investigation | null>(null);
  const [deleting, setDeleting] = useState<Investigation | null>(null);
  const [busy, setBusy] = useState(false);
  const [editError, setEditError] = useState('');
  const refresh = useCallback((signal?: AbortSignal) => {
    return fetch('/api/investigations', { signal })
      .then(async (r) => {
        const data = (await r.json()) as {
          investigations: Investigation[];
          error?: string;
        };
        if (!r.ok)
          throw new Error(data.error ?? 'Could not load your workspace.');
        return data.investigations;
      })
      .then((rows) => {
        if (!signal?.aborted) {
          setItems(rows);
          setError('');
        }
      })
      .catch((error: unknown) => {
        if (!signal?.aborted)
          setError(
            error instanceof Error
              ? error.message
              : 'Could not load your workspace.',
          );
      })
      .finally(() => {
        if (!signal?.aborted) setLoading(false);
      });
  }, []);
  useEffect(() => {
    const controller = new AbortController();
    void refresh(controller.signal);
    return () => controller.abort();
  }, [refresh]);
  async function update() {
    if (!editing) return;
    setBusy(true);
    setEditError('');
    try {
      const r = await fetch(`/api/investigations/${editing.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: editing.title,
          notes: editing.notes,
          version: editing.version,
        }),
      });
      const data = (await r.json()) as { error?: string };
      if (!r.ok) throw new Error(data.error ?? 'Could not update.');
      setEditing(null);
      await refresh();
    } catch (e) {
      setEditError(e instanceof Error ? e.message : 'Could not update.');
    } finally {
      setBusy(false);
    }
  }
  async function remove() {
    if (!deleting) return;
    setBusy(true);
    setError('');
    try {
      const r = await fetch(`/api/investigations/${deleting.id}`, {
        method: 'DELETE',
        headers: { 'If-Match': String(deleting.version) },
      });
      const data = (await r.json()) as { error?: string };
      if (!r.ok) throw new Error(data.error ?? 'Could not delete.');
      setDeleting(null);
      await refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not delete.');
      setDeleting(null);
    } finally {
      setBusy(false);
    }
  }
  return (
    <>
      <header className="app-header">
        <Link href="/" className="brand">
          <Workflow size={28} />
          interleave <small>v0.2</small>
        </Link>
        <nav className="header-links">
          <Link href="/">Lab</Link>
          {/* oxlint-disable-next-line nextjs/no-html-link-for-pages -- Sites owns sign-out and requires a top-level navigation. */}
          <a href="/signout-with-chatgpt?return_to=/" target="_top">
            Sign out
          </a>
        </nav>
      </header>
      <main id="main" className="workspace-page">
        <div className="workspace-intro">
          <div>
            <p className="eyebrow">Your workspace</p>
            <h1>Keep the investigation going.</h1>
            <p>Saved traces and notes, private to your account.</p>
            <p className="account-email">{email}</p>
          </div>
          <Link href="/" className="primary-link">
            <Plus size={16} />
            New investigation
          </Link>
        </div>
        <div className="workspace-toolbar">
          <span>
            {items.length} / {MAX_INVESTIGATIONS} saved
          </span>
          <Button
            variant="ghost"
            onClick={() => {
              setLoading(true);
              void refresh();
            }}
            disabled={loading}
          >
            <RefreshCw size={15} />
            Refresh
          </Button>
        </div>
        {error && (
          <p className="product-error" role="alert">
            {error}
          </p>
        )}
        {loading ? (
          <output className="workspace-empty">
            Loading your investigations…
          </output>
        ) : items.length === 0 ? (
          <section className="workspace-empty">
            <Bookmark size={32} />
            <h2>Your next insight belongs here.</h2>
            <p>
              Open an experiment, find an interesting execution, and choose Save
              investigation.
            </p>
            <Link href="/" className="product-link">
              Explore the lab →
            </Link>
          </section>
        ) : (
          <div className="investigation-grid">
            {items.map((item) => (
              <article key={item.id} className="investigation-card">
                <div className="investigation-meta">
                  <span>
                    {experiments.find((e) => e.id === item.experimentId)
                      ?.title ?? item.experimentId}
                  </span>
                  <span>{item.mode === 'buggy' ? 'Bug' : 'Fix'}</span>
                </div>
                <h2>{item.title}</h2>
                <p className="notes-preview">
                  {item.notes ||
                    'No notes yet. Open this investigation to continue.'}
                </p>
                <div className="saved-trace mono">
                  {item.trace || 'Initial state'}
                </div>
                <div className="investigation-bottom">
                  <time dateTime={new Date(item.updatedAt).toISOString()}>
                    {new Date(item.updatedAt).toLocaleDateString()}
                  </time>
                  <div>
                    <Button
                      variant="ghost"
                      size="icon"
                      aria-label={`Edit ${item.title}`}
                      onClick={() => {
                        setEditError('');
                        setEditing({ ...item });
                      }}
                    >
                      <Pencil size={15} />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      aria-label={`Delete ${item.title}`}
                      onClick={() => setDeleting(item)}
                    >
                      <Trash2 size={15} />
                    </Button>
                    <a
                      className="reopen-link"
                      href={
                        '/#' +
                        encodeReplay(
                          item.experimentId,
                          item.mode,
                          decodeTrace(item.trace),
                        )
                      }
                    >
                      Reopen <ArrowUpRight size={15} />
                    </a>
                  </div>
                </div>
              </article>
            ))}
          </div>
        )}
      </main>
      <Dialog
        open={Boolean(editing)}
        onOpenChange={(v) => {
          if (!v && !busy) setEditing(null);
        }}
      >
        <DialogContent className="save-dialog">
          <DialogHeader>
            <DialogTitle>Edit investigation</DialogTitle>
            <DialogDescription>
              The saved execution stays the same. Update your title and notes.
            </DialogDescription>
          </DialogHeader>
          {editing && (
            <form
              className="save-form"
              onSubmit={(e) => {
                e.preventDefault();
                void update();
              }}
            >
              <label htmlFor="edit-title">Title</label>
              <Input
                id="edit-title"
                value={editing.title}
                onChange={(e) =>
                  setEditing({ ...editing, title: e.target.value })
                }
                maxLength={100}
              />
              <label htmlFor="edit-notes">Notes</label>
              <Textarea
                id="edit-notes"
                value={editing.notes}
                onChange={(e) =>
                  setEditing({ ...editing, notes: e.target.value })
                }
                maxLength={10000}
                rows={7}
              />
              {editError && (
                <p role="alert" className="product-error">
                  {editError}
                </p>
              )}
              <Button disabled={busy || !editing.title.trim()} type="submit">
                {busy ? 'Saving…' : 'Save changes'}
              </Button>
              {editError && (
                <Button
                  variant="outline"
                  type="button"
                  onClick={() => {
                    setEditing(null);
                    void refresh();
                  }}
                >
                  Close and reload workspace
                </Button>
              )}
            </form>
          )}
        </DialogContent>
      </Dialog>
      <AlertDialog
        open={Boolean(deleting)}
        onOpenChange={(v) => {
          if (!v && !busy) setDeleting(null);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this investigation?</AlertDialogTitle>
            <AlertDialogDescription>
              “{deleting?.title}” and its notes will be removed from your
              workspace. This cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={busy}>Keep it</AlertDialogCancel>
            <AlertDialogAction disabled={busy} onClick={() => void remove()}>
              {busy ? 'Deleting…' : 'Delete investigation'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
