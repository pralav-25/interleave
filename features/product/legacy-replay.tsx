'use client';
import { useEffect } from 'react';
export function LegacyReplay() {
  useEffect(() => {
    if (window.location.hash.startsWith('#v=')) {
      window.location.replace(
        '/lab' + window.location.search + window.location.hash,
      );
    }
  }, []);
  return null;
}
