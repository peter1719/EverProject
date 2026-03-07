import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { TodoItem } from '@/types';

// ── IDB mock ────────────────────────────────────────────────────────────────
const mockDb = vi.hoisted(() => ({
  getAllFromIndex: vi.fn<[string, string, string], Promise<TodoItem[]>>(),
  put: vi.fn<[string, unknown], Promise<void>>(),
  delete: vi.fn<[string, string], Promise<void>>(),
}));

vi.mock('@/db', () => ({
  getDB: () => Promise.resolve(mockDb),
}));

import { useTodoStore } from './todoStore';

// ── Helpers ──────────────────────────────────────────────────────────────────

function makeTodo(overrides: Partial<TodoItem> & { id: string; projectId: string }): TodoItem {
  return {
    text: 'Test todo',
    isDone: false,
    createdAt: Date.now(),
    ...overrides,
  };
}

beforeEach(() => {
  useTodoStore.setState({ todos: [] });
  mockDb.getAllFromIndex.mockResolvedValue([]);
  mockDb.put.mockResolvedValue(undefined);
  mockDb.delete.mockResolvedValue(undefined);
});

// ── loadTodos ────────────────────────────────────────────────────────────────

describe('loadTodos', () => {
  it('從 IDB 按 projectId 載入 todos 並設定 state', async () => {
    const t = makeTodo({ id: 't1', projectId: 'p1' });
    mockDb.getAllFromIndex.mockResolvedValue([t]);

    await useTodoStore.getState().loadTodos('p1');

    expect(mockDb.getAllFromIndex).toHaveBeenCalledWith('todos', 'projectId', 'p1');
    expect(useTodoStore.getState().todos).toEqual([t]);
  });

  it('載入另一個 project 時覆蓋舊 state', async () => {
    const t1 = makeTodo({ id: 't1', projectId: 'p1' });
    useTodoStore.setState({ todos: [t1] });

    const t2 = makeTodo({ id: 't2', projectId: 'p2' });
    mockDb.getAllFromIndex.mockResolvedValue([t2]);

    await useTodoStore.getState().loadTodos('p2');

    expect(useTodoStore.getState().todos).toEqual([t2]);
  });
});

// ── addTodo ──────────────────────────────────────────────────────────────────

describe('addTodo', () => {
  it('新增 todo 到 IDB 並 append 到 state', async () => {
    await useTodoStore.getState().addTodo('p1', 'Buy milk');

    const todos = useTodoStore.getState().todos;
    expect(todos).toHaveLength(1);
    expect(todos[0].text).toBe('Buy milk');
    expect(todos[0].projectId).toBe('p1');
    expect(mockDb.put).toHaveBeenCalledOnce();
  });

  it('id 為 UUID 格式，isDone 預設 false', async () => {
    await useTodoStore.getState().addTodo('p1', 'Read a book');

    const todo = useTodoStore.getState().todos[0];
    expect(todo.id).toBeTruthy();
    expect(todo.isDone).toBe(false);
  });
});

// ── updateTodo ───────────────────────────────────────────────────────────────

describe('updateTodo', () => {
  it('更新 text 並寫回 IDB', async () => {
    const t = makeTodo({ id: 't1', projectId: 'p1', text: 'Old text' });
    useTodoStore.setState({ todos: [t] });

    await useTodoStore.getState().updateTodo('t1', 'New text');

    expect(useTodoStore.getState().todos[0].text).toBe('New text');
    expect(mockDb.put).toHaveBeenCalledOnce();
    expect(mockDb.put).toHaveBeenCalledWith('todos', expect.objectContaining({ text: 'New text' }));
  });
});

// ── toggleTodo ───────────────────────────────────────────────────────────────

describe('toggleTodo', () => {
  it('isDone false → true，寫回 IDB', async () => {
    const t = makeTodo({ id: 't1', projectId: 'p1', isDone: false });
    useTodoStore.setState({ todos: [t] });

    await useTodoStore.getState().toggleTodo('t1');

    expect(useTodoStore.getState().todos[0].isDone).toBe(true);
    expect(mockDb.put).toHaveBeenCalledWith('todos', expect.objectContaining({ isDone: true }));
  });

  it('isDone true → false，寫回 IDB', async () => {
    const t = makeTodo({ id: 't1', projectId: 'p1', isDone: true });
    useTodoStore.setState({ todos: [t] });

    await useTodoStore.getState().toggleTodo('t1');

    expect(useTodoStore.getState().todos[0].isDone).toBe(false);
    expect(mockDb.put).toHaveBeenCalledWith('todos', expect.objectContaining({ isDone: false }));
  });
});

// ── deleteTodo ───────────────────────────────────────────────────────────────

describe('deleteTodo', () => {
  it('從 IDB 刪除並從 state 過濾', async () => {
    const t = makeTodo({ id: 't1', projectId: 'p1' });
    useTodoStore.setState({ todos: [t] });

    await useTodoStore.getState().deleteTodo('t1');

    expect(useTodoStore.getState().todos).toHaveLength(0);
    expect(mockDb.delete).toHaveBeenCalledWith('todos', 't1');
  });
});

// ── reorderTodos ─────────────────────────────────────────────────────────────

describe('reorderTodos', () => {
  it('依傳入順序為每個 todo 指派 order 索引並寫回 IDB', async () => {
    const t1 = makeTodo({ id: 't1', projectId: 'p1' });
    const t2 = makeTodo({ id: 't2', projectId: 'p1' });
    const t3 = makeTodo({ id: 't3', projectId: 'p1' });
    useTodoStore.setState({ todos: [t1, t2, t3] });

    await useTodoStore.getState().reorderTodos(['t3', 't1', 't2']);

    const todos = useTodoStore.getState().todos;
    expect(todos.find(t => t.id === 't3')?.order).toBe(0);
    expect(todos.find(t => t.id === 't1')?.order).toBe(1);
    expect(todos.find(t => t.id === 't2')?.order).toBe(2);
  });

  it('對每個指定的 todo 呼叫 db.put', async () => {
    const t1 = makeTodo({ id: 't1', projectId: 'p1' });
    const t2 = makeTodo({ id: 't2', projectId: 'p1' });
    useTodoStore.setState({ todos: [t1, t2] });

    await useTodoStore.getState().reorderTodos(['t2', 't1']);

    expect(mockDb.put).toHaveBeenCalledTimes(2);
    expect(mockDb.put).toHaveBeenCalledWith('todos', expect.objectContaining({ id: 't2', order: 0 }));
    expect(mockDb.put).toHaveBeenCalledWith('todos', expect.objectContaining({ id: 't1', order: 1 }));
  });

  it('不在 orderedIds 內的 todo（如已完成項目）不受影響', async () => {
    const pending = makeTodo({ id: 't1', projectId: 'p1', isDone: false });
    const done = makeTodo({ id: 't2', projectId: 'p1', isDone: true });
    useTodoStore.setState({ todos: [pending, done] });

    await useTodoStore.getState().reorderTodos(['t1']);

    expect(useTodoStore.getState().todos.find(t => t.id === 't2')?.order).toBeUndefined();
    expect(mockDb.put).toHaveBeenCalledTimes(1);
    expect(mockDb.put).toHaveBeenCalledWith('todos', expect.objectContaining({ id: 't1' }));
  });
});
