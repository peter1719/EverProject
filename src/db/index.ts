import { openDB, type IDBPDatabase } from 'idb';
import { DB_NAME, DB_VERSION } from '@/lib/constants';
import type { EverProjectDB } from './schema';

let dbPromise: Promise<IDBPDatabase<EverProjectDB>> | null = null;

/**
 * Returns a cached promise for the IndexedDB connection.
 * Creates the connection (and schema) on first call.
 */
export function getDB(): Promise<IDBPDatabase<EverProjectDB>> {
  if (!dbPromise) {
    dbPromise = openDB<EverProjectDB>(DB_NAME, DB_VERSION, {
      upgrade(db, oldVersion) {
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
