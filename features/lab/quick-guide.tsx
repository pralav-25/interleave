import { useRef } from 'react';
import { ArrowRight, GitBranch, Workflow, Bot, Bookmark } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
export function QuickGuide({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (value: boolean) => void;
}) {
  const titleRef = useRef<HTMLHeadingElement>(null);
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="quick-guide" initialFocus={titleRef}>
        <DialogHeader>
          <span className="eyebrow">Your first investigation</span>
          <DialogTitle ref={titleRef} tabIndex={-1}>
            Make the bug visible.
          </DialogTitle>
          <DialogDescription>
            Control the order of two workers. See exactly when their shared
            state goes wrong.
          </DialogDescription>
        </DialogHeader>
        <ol className="guide-steps">
          <li>
            <span>
              <Workflow size={20} />
            </span>
            <div>
              <h3>Choose what runs next</h3>
              <p>
                Click Step A or Step B, or use keys 1 and 2. Each highlighted
                row is one indivisible operation. Find a failure plays a known
                failing schedule. On a phone, both worker controls stay at the
                bottom of the screen.
              </p>
            </div>
          </li>
          <li>
            <span>
              <GitBranch size={20} />
            </span>
            <div>
              <h3>Inspect, rewind, compare</h3>
              <p>
                Watch shared state and the invariant. Select a timeline step to
                rewind, then choose a different worker. Switch to With the fix
                to compare. Filter the schedule list to inspect just the passes
                or failures, then replay any result.
              </p>
            </div>
          </li>
          <li>
            <span>
              <Bot size={20} />
            </span>
            <div>
              <h3>Ask why it happened</h3>
              <p>
                The optional AI assistant explains the exact trace on your
                device. It needs WebGPU and a first-use download of roughly 1
                GB.
              </p>
            </div>
          </li>
          <li>
            <span>
              <Bookmark size={20} />
            </span>
            <div>
              <h3>Keep the insight</h3>
              <p>
                Save a private investigation after signing in, copy a public
                replay link, or export a Markdown report.
              </p>
            </div>
          </li>
        </ol>
        <p className="guide-limit">
          Schedule counts describe this finite model. They are not production
          failure probabilities.
        </p>
        <Button onClick={() => onOpenChange(false)}>
          Explore the lab <ArrowRight size={16} />
        </Button>
      </DialogContent>
    </Dialog>
  );
}
