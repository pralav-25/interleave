'use client';
import { useEffect } from 'react';
export function LegacyReplay() {
  useEffect(() => {
    function restore() {
      if (window.location.hash.startsWith('#v=')) {
        window.location.replace(
          '/lab' + window.location.search + window.location.hash,
        );
      }
    }
    restore();
    window.addEventListener('hashchange', restore);
    return () => window.removeEventListener('hashchange', restore);
  }, []);
  return null;
}
