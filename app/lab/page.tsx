import type { Metadata } from 'next';
import Lab from '@/features/lab/lab';
export const metadata: Metadata = { title: 'Concurrency lab — Interleave' };
export default function LabPage() {
  return <Lab />;
}
