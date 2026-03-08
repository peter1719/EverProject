import { useState, useEffect } from 'react';
import { getDB } from '@/db';
import { useSessionStore } from '@/store/sessionStore';

/**
 * Lazily loads a session image from IDB.
 * Returns null while loading or if no image exists.
 * Re-fetches automatically whenever putSessionImage / removeSessionImage is called.
 *
 * @param sessionId  - the session ID to look up
 * @param enabled    - set to `session.hasImage ?? false` to skip IDB on sessions without photos
 */
export function useSessionImage(sessionId: string, enabled: boolean): string | null {
  const [dataUrl, setDataUrl] = useState<string | null>(null);
  const version = useSessionStore(s => s.imageVersions[sessionId] ?? 0);

  useEffect(() => {
    if (!enabled) return;
    let cancelled = false;
    void (async () => {
      const db = await getDB();
      const record = await db.get('sessionImages', sessionId);
      if (!cancelled) {
        setDataUrl(record?.dataUrl ?? null);
      }
    })();
    return () => { cancelled = true; };
  }, [sessionId, enabled, version]);

  return enabled ? dataUrl : null;
}
