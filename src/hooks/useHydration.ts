/**
 * IDB hydration coordination hook.
 * Triggers hydrate() on projectStore, sessionStore, and settingsStore on mount.
 * Returns true once all three stores are ready — used as a hydration gate in App.tsx.
 * Dependencies: projectStore, sessionStore, settingsStore
 */
import { useEffect } from 'react';
import { useProjectStore } from '@/store/projectStore';
import { useSessionStore } from '@/store/sessionStore';
import { useSettingsStore } from '@/store/settingsStore';

/**
 * Triggers hydration of all IDB-backed stores on mount.
 * Returns true once all three stores have loaded from IndexedDB.
 */
export function useHydration(): boolean {
  const hydrateProjects = useProjectStore(s => s.hydrate);
  const hydrateSettings = useSettingsStore(s => s.hydrate);
  const hydrateSessions = useSessionStore(s => s.hydrate);

  const projectsReady = useProjectStore(s => s.isHydrated);
  const sessionsReady = useSessionStore(s => s.isHydrated);
  const settingsReady = useSettingsStore(s => s.isHydrated);

  useEffect(() => {
    void hydrateProjects();
    void hydrateSessions();
    void hydrateSettings();
  }, [hydrateProjects, hydrateSessions, hydrateSettings]);

  return projectsReady && sessionsReady && settingsReady;
}
