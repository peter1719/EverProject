/**
 * Zustand store for per-project todo items (lightweight, no Immer).
 * On-demand loading via loadTodos(projectId) — not globally hydrated.
 * Supports: add / update / toggle / delete / reorderTodos (dnd-kit drag-and-drop).
 * hydrate() clears in-memory state after a backup import.
 * Dependencies: src/db/index.ts (getDB), src/types (TodoItem)
 */
import { create } from 'zustand';
import { getDB } from '@/db';
import type { TodoItem } from '@/types';

interface TodoStore {
  todos: TodoItem[];
  loadTodos: (projectId: string) => Promise<void>;
  addTodo: (projectId: string, text: string) => Promise<void>;
  updateTodo: (id: string, text: string) => Promise<void>;
  toggleTodo: (id: string) => Promise<void>;
  deleteTodo: (id: string) => Promise<void>;
  reorderTodos: (orderedIds: string[]) => Promise<void>;
  hydrate: () => Promise<void>;
}

export const useTodoStore = create<TodoStore>()((set, get) => ({
  todos: [],

  loadTodos: async (projectId: string) => {
    const db = await getDB();
    const todos = await db.getAllFromIndex('todos', 'projectId', projectId);
    set({ todos });
  },

  addTodo: async (projectId: string, text: string) => {
    const todo: TodoItem = {
      id: crypto.randomUUID(),
      projectId,
      text,
      isDone: false,
      createdAt: Date.now(),
    };
    const db = await getDB();
    await db.put('todos', todo);
    set(s => ({ todos: [...s.todos, todo] }));
  },

  updateTodo: async (id: string, text: string) => {
    const todo = get().todos.find(t => t.id === id);
    if (!todo) return;
    const updated = { ...todo, text };
    const db = await getDB();
    await db.put('todos', updated);
    set(s => ({ todos: s.todos.map(t => (t.id === id ? updated : t)) }));
  },

  toggleTodo: async (id: string) => {
    const todo = get().todos.find(t => t.id === id);
    if (!todo) return;
    const updated = { ...todo, isDone: !todo.isDone };
    const db = await getDB();
    await db.put('todos', updated);
    set(s => ({ todos: s.todos.map(t => (t.id === id ? updated : t)) }));
  },

  deleteTodo: async (id: string) => {
    const db = await getDB();
    await db.delete('todos', id);
    set(s => ({ todos: s.todos.filter(t => t.id !== id) }));
  },

  reorderTodos: async (orderedIds: string[]) => {
    const db = await getDB();
    const updated = get().todos.map(t => {
      const idx = orderedIds.indexOf(t.id);
      return idx >= 0 ? { ...t, order: idx } : t;
    });
    for (const t of updated) {
      if (orderedIds.includes(t.id)) await db.put('todos', t);
    }
    set({ todos: updated });
  },

  // Called after backup import — clears state; UI re-calls loadTodos as needed.
  hydrate: async () => {
    set({ todos: [] });
  },
}));
