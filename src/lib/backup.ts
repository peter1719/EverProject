import { getDB } from '@/db';
import { useProjectStore } from '@/store/projectStore';
import { useSessionStore } from '@/store/sessionStore';
import { useTodoStore } from '@/store/todoStore';
import type { Project, Session, TodoItem } from '@/types';

export async function exportData(includeImages: boolean): Promise<void> {
  const db = await getDB();
  const payload = {
    version: 3,
    exportedAt: new Date().toISOString(),
    projects: await db.getAll('projects'),
    sessions: await db.getAll('sessions'),
    sessionImages: includeImages ? await db.getAll('sessionImages') : [],
    todos: await db.getAll('todos'),
  };
  const blob = new Blob([JSON.stringify(payload)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `everproject-${new Date().toISOString().slice(0, 10)}.json`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export async function importData(
  file: File,
): Promise<{ projects: number; sessions: number; images: number; todos: number }> {
  const data: unknown = JSON.parse(await file.text());
  if (
    !data ||
    typeof data !== 'object' ||
    !('version' in data) ||
    !Array.isArray((data as Record<string, unknown>).projects) ||
    !Array.isArray((data as Record<string, unknown>).sessions)
  ) {
    throw new Error('Invalid backup file');
  }
  const { projects, sessions, sessionImages = [], todos = [] } = data as unknown as {
    projects: Project[];
    sessions: Session[];
    sessionImages?: { sessionId: string; dataUrl: string }[];
    todos?: TodoItem[];
  };
  const db = await getDB();
  await db.clear('projects');
  await db.clear('sessions');
  await db.clear('sessionImages');
  await db.clear('todos');
  for (const p of projects) await db.put('projects', p);
  for (const s of sessions) await db.put('sessions', s);
  for (const img of sessionImages) await db.put('sessionImages', img);
  for (const t of todos) await db.put('todos', t);
  await useProjectStore.getState().hydrate();
  await useSessionStore.getState().hydrate();
  await useTodoStore.getState().hydrate();
  return { projects: projects.length, sessions: sessions.length, images: sessionImages.length, todos: todos.length };
}
