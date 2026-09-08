import type { Metadata } from 'next';
import { Geist, Geist_Mono } from 'next/font/google';
import './globals.css';
const sans = Geist({ variable: '--font-geist-sans', subsets: ['latin'] });
const mono = Geist_Mono({ variable: '--font-geist-mono', subsets: ['latin'] });
export const metadata: Metadata = {
  title: 'Interleave — Concurrency, made visible',
  description:
    'Reproduce race conditions, test fixes, ask a local AI tutor, and save private investigations. Six interactive concurrency experiments with shareable replays.',
  authors: [{ name: 'Pralav Singh', url: 'https://github.com/pralav-25' }],
  openGraph: {
    title: 'Interleave — Concurrency, made visible',
    description:
      'Make the bug happen, ask AI why, and save the investigation. An open-source concurrency workbench.',
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
