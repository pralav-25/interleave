'use client';
import { useEffect, useState } from 'react';
import { Bookmark, ArrowUpRight, Check } from 'lucide-react';
import Link from 'next/link';
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
import { encodeReplay } from '@/lib/engine';
import type { TraceContext } from '@/features/assistant/context';
export function SaveDialog({
  open,
  onOpenChange,
  context,
  title: defaultTitle,
}: {
  open: boolean;
  onOpenChange: (value: boolean) => void;
  context: TraceContext;
  title: string;
}) {
  const [title, setTitle] = useState(defaultTitle);
  const [notes, setNotes] = useState('');
  const [auth, setAuth] = useState<{
    signedIn: boolean;
    signInUrl: string;
  } | null>(null);
  const [busy, setBusy] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState('');
  useEffect(() => {
    if (!open) return;
    const controller = new AbortController();
    const returnTo =
      '/#' + encodeReplay(context.id, context.mode, context.schedule);
    fetch('/api/session?returnTo=' + encodeURIComponent(returnTo), {
      signal: controller.signal,
    })
      .then(async (r) => {
        if (!r.ok) throw new Error('Could not check sign-in.');
        setAuth((await r.json()) as { signedIn: boolean; signInUrl: string });
      })
      .catch((e) => {
        if (!controller.signal.aborted)
          setError(e instanceof Error ? e.message : 'Could not check sign-in.');
      });
    return () => controller.abort();
  }, [open, context]);
  async function save() {
    setBusy(true);
    setError('');
    try {
      const r = await fetch('/api/investigations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title,
          notes,
          experimentId: context.id,
          mode: context.mode,
          trace: context.schedule.map((a) => (a ? 'B' : 'A')).join(''),
        }),
      });
      const data = (await r.json()) as { error?: string };
      if (!r.ok)
        throw new Error(data.error ?? 'Could not save this investigation.');
      setSaved(true);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not save.');
    } finally {
      setBusy(false);
    }
  }
  return (
    <Dialog
      open={open}
      onOpenChange={(value) => {
        if (!busy) onOpenChange(value);
      }}
    >
      <DialogContent className="save-dialog">
        <DialogHeader>
          <DialogTitle className="text-link">
            <Bookmark size={18} />
            Save investigation
          </DialogTitle>
          <DialogDescription>
            Keep this exact execution and your notes in your private workspace.
          </DialogDescription>
        </DialogHeader>
        {saved ? (
          <div className="save-success">
            <Check size={25} />
            <p>Investigation saved.</p>
            <Link href="/workspace" className="product-link">
              Open workspace →
            </Link>
          </div>
        ) : !auth ? (
          <p className="muted">Checking sign-in…</p>
        ) : !auth.signedIn ? (
          <div className="signin-prompt">
            <p>
              Sign in with ChatGPT to save and return to your investigations on
              another device.
            </p>
            <a href={auth.signInUrl} target="_top" className="primary-link">
              Sign in to save <ArrowUpRight size={16} />
            </a>
          </div>
        ) : (
          <form
            onSubmit={(e) => {
              e.preventDefault();
              void save();
            }}
            className="save-form"
          >
            <label htmlFor="investigation-title">Title</label>
            <Input
              id="investigation-title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              maxLength={100}
              required
            />
            <label htmlFor="investigation-notes">Notes</label>
            <Textarea
              id="investigation-notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              maxLength={10000}
              rows={5}
              placeholder="What did you learn? What would you try next?"
            />
            <p className="muted">
              {context.schedule.length} steps ·{' '}
              {context.mode === 'buggy' ? 'with the bug' : 'with the fix'}
            </p>
            <Button disabled={busy || !title.trim()} type="submit">
              {busy ? 'Saving…' : 'Save to workspace'}
            </Button>
          </form>
        )}
        {error && (
          <p className="product-error" role="alert">
            {error}
          </p>
        )}
      </DialogContent>
    </Dialog>
  );
}
