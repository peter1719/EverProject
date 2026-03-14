/**
 * IndexedDB connection manager.
 * Exports: getDB() — returns a cached IDB connection promise.
 * Contains upgrade logic for schema versions v1 through v6.
 * Used by all stores (projectStore, sessionStore, etc.) and timerDraft.ts.
 */
import { openDB, type IDBPDatabase } from 'idb';
import { DB_NAME, DB_VERSION, PROJECT_DURATION_DEFAULT_MINUTES } from '@/lib/constants';
import type { EverProjectDB } from './schema';

let dbPromise: Promise<IDBPDatabase<EverProjectDB>> | null = null;

/**
 * Returns a cached promise for the IndexedDB connection.
 * Creates the connection (and schema) on first call.
 */
export function getDB(): Promise<IDBPDatabase<EverProjectDB>> {
  if (!dbPromise) {
    dbPromise = openDB<EverProjectDB>(DB_NAME, DB_VERSION, {
      upgrade(db, oldVersion, _newVersion, transaction) {
        // v1 stores — only created on fresh install
        if (oldVersion < 1) {
          const projectStore = db.createObjectStore('projects', { keyPath: 'id' });
          projectStore.createIndex('isArchived', 'isArchived');
          projectStore.createIndex('createdAt', 'createdAt');

          const sessionStore = db.createObjectStore('sessions', { keyPath: 'id' });
          sessionStore.createIndex('projectId', 'projectId');
          sessionStore.createIndex('startedAt', 'startedAt');

          db.createObjectStore('settings', { keyPath: 'key' });
        }

        // v2 — add sessionImages store (runs for existing users upgrading from v1)
        if (oldVersion < 2) {
          db.createObjectStore('sessionImages', { keyPath: 'sessionId' });
        }

        // v3 — add todos store
        if (oldVersion < 3) {
          const todoStore = db.createObjectStore('todos', { keyPath: 'id' });
          todoStore.createIndex('projectId', 'projectId');
        }

        // v4 — add timerDraft store for crash recovery
        if (oldVersion < 4) {
          db.createObjectStore('timerDraft', { keyPath: 'key' });
        }

        // v5 — defensive: create timerDraft if missing (handles dev environments
        // where v4 was applied before the timerDraft migration was written)
        if (oldVersion < 5 && !db.objectStoreNames.contains('timerDraft')) {
          db.createObjectStore('timerDraft', { keyPath: 'key' });
        }

        // v6 — add projectDurationMinutes to all existing projects (default 180 min)
        if (oldVersion < 6) {
          void (async () => {
            const store = transaction.objectStore('projects');
            let cursor = await store.openCursor();
            while (cursor) {
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              const val = cursor.value as any;
              if (!('projectDurationMinutes' in val)) {
                // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
                await cursor.update({ ...val, projectDurationMinutes: PROJECT_DURATION_DEFAULT_MINUTES });
              }
              cursor = await cursor.continue();
            }
          })();
        }
      },

      // This connection is blocking a newer version — close it so the upgrade can proceed.
      blocking(_currentVersion, _blockedVersion, event) {
        (event.target as IDBDatabase).close();
        dbPromise = null;
      },

      // Our upgrade is blocked by another open connection (e.g. another tab on old version).
      blocked() {
        console.warn('[EverProject] IDB upgrade blocked by another connection. Reload the page.');
      },
    });
  }
  return dbPromise;
}
