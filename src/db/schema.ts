/**
 * IndexedDB schema definition using the idb DBSchema format.
 * Database: ever-project-db v6 with 6 object stores:
 *   projects, sessions, settings, sessionImages, todos, timerDraft
 * Consumed by openDB() in src/db/index.ts.
 */
import type { DBSchema } from 'idb';
import type { Project, Session, AppSettings, TodoItem, TimerDraft } from '@/types';

export interface EverProjectDB extends DBSchema {
  projects: {
    key: string;
    value: Project;
    indexes: { isArchived: IDBValidKey; createdAt: IDBValidKey };
  };
  sessions: {
    key: string;
    value: Session;
    indexes: { projectId: IDBValidKey; startedAt: IDBValidKey };
  };
  settings: {
    key: string;
    value: AppSettings & { key: string };
  };
  sessionImages: {
    key: string; // sessionId
    value: { sessionId: string; dataUrl: string };
  };
  todos: {
    key: string;
    value: TodoItem;
    indexes: { projectId: IDBValidKey };
  };
  timerDraft: {
    key: string;
    value: TimerDraft;
  };
}
