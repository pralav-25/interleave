import Link from 'next/link';
import { Workflow, Bookmark } from 'lucide-react';
import { getChatGPTUser, chatGPTSignInPath } from '@/app/chatgpt-auth';
import { Workspace } from '@/features/workspace/workspace';
export const dynamic = 'force-dynamic';
export const metadata = {
  title: 'Your workspace · Interleave',
  robots: { index: false, follow: false },
};
export default async function WorkspacePage() {
  const user = await getChatGPTUser();
  if (user) return <Workspace email={user.email} />;
  return (
    <>
      <header className="app-header">
        <Link href="/" className="brand">
          <Workflow size={28} />
          interleave
        </Link>
        <Link href="/">Back to the lab</Link>
      </header>
      <main id="main" className="workspace-signin">
        <Bookmark size={35} />
        <p className="eyebrow">Your private workspace</p>
        <h1>
          Save the trace.
          <br />
          Keep the insight.
        </h1>
        <p>
          Keep interesting executions and notes together. Reopen them from any
          device and continue where you left off.
        </p>
        <a
          href={chatGPTSignInPath('/workspace')}
          target="_top"
          className="primary-link"
        >
          Sign in with ChatGPT →
        </a>
        <small>The public lab and local AI work without an account.</small>
      </main>
    </>
  );
}
