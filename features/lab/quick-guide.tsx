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
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="quick-guide">
        <DialogHeader>
          <span className="eyebrow">Your first investigation</span>
          <DialogTitle>Make the bug visible.</DialogTitle>
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
                failing schedule.
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
                to compare.
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
