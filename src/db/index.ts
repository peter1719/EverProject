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
      upgrade(db) {
        // projects store
        if (!db.objectStoreNames.contains('projects')) {
          const projectStore = db.createObjectStore('projects', { keyPath: 'id' });
          projectStore.createIndex('isArchived', 'isArchived');
          projectStore.createIndex('createdAt', 'createdAt');
        }

        // sessions store
        if (!db.objectStoreNames.contains('sessions')) {
          const sessionStore = db.createObjectStore('sessions', { keyPath: 'id' });
          sessionStore.createIndex('projectId', 'projectId');
          sessionStore.createIndex('startedAt', 'startedAt');
        }

        // settings store (single record with key "settings")
        if (!db.objectStoreNames.contains('settings')) {
          db.createObjectStore('settings', { keyPath: 'key' });
        }
      },
    });
  }
  return dbPromise;
}
