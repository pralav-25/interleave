import type { Metadata } from 'next';
import { Geist, Geist_Mono } from 'next/font/google';
import './globals.css';
const sans = Geist({ variable: '--font-geist-sans', subsets: ['latin'] });
const mono = Geist_Mono({ variable: '--font-geist-mono', subsets: ['latin'] });
export const metadata: Metadata = {
  title: 'Interleave — Concurrency, made visible',
  description:
    'You are the scheduler. Reproduce race conditions, rewind execution, and explore every possible schedule. Six interactive experiments. No signup.',
  authors: [{ name: 'Pralav Singh', url: 'https://github.com/pralav-25' }],
  openGraph: {
    title: 'Interleave — Concurrency, made visible',
    description:
      'Two increments. One disappears. Make the bug happen, then test the fix.',
    type: 'website',
  },
};
export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className="dark">
      <body className={`${sans.variable} ${mono.variable}`}>
        <a className="skip-link" href="#main">
          Skip to experiment
        </a>
        {children}
      </body>
    </html>
  );
}
