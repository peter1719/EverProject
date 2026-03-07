import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// ── IDB mock ─────────────────────────────────────────────────────────────────
const mockDb = vi.hoisted(() => ({
  getAll: vi.fn(),
  put: vi.fn(),
  clear: vi.fn(),
}));

vi.mock('@/db', () => ({ getDB: () => Promise.resolve(mockDb) }));

// ── Store hydrate mocks ───────────────────────────────────────────────────────
const mockProjectHydrate = vi.hoisted(() => vi.fn().mockResolvedValue(undefined));
const mockSessionHydrate = vi.hoisted(() => vi.fn().mockResolvedValue(undefined));
const mockTodoHydrate = vi.hoisted(() => vi.fn().mockResolvedValue(undefined));

vi.mock('@/store/projectStore', () => ({
  useProjectStore: { getState: () => ({ hydrate: mockProjectHydrate }) },
}));
vi.mock('@/store/sessionStore', () => ({
  useSessionStore: { getState: () => ({ hydrate: mockSessionHydrate }) },
}));
vi.mock('@/store/todoStore', () => ({
  useTodoStore: { getState: () => ({ hydrate: mockTodoHydrate }) },
}));

// ── URL mock ─────────────────────────────────────────────────────────────────
vi.stubGlobal('URL', { createObjectURL: vi.fn(() => 'blob:mock'), revokeObjectURL: vi.fn() });

import { exportData, importData } from './backup';

// ── Helpers ───────────────────────────────────────────────────────────────────

function makeFile(content: unknown): File {
  const json = JSON.stringify(content);
  return new File([json], 'backup.json', { type: 'application/json' });
}

const VALID_BACKUP = {
  version: 3,
  exportedAt: '2026-03-04T00:00:00.000Z',
  projects: [{ id: 'p1', name: 'Project 1' }],
  sessions: [{ id: 's1', projectId: 'p1' }, { id: 's2', projectId: 'p1' }],
  sessionImages: [{ sessionId: 's1', dataUrl: 'data:image/jpeg;base64,abc' }],
  todos: [{ id: 't1', projectId: 'p1', text: 'Test todo', isDone: false, createdAt: 1000 }],
};

// ── Blob capturing ────────────────────────────────────────────────────────────

const OrigBlob = global.Blob;
let blobContents: string[] = [];

// ── Setup / teardown ─────────────────────────────────────────────────────────

beforeEach(() => {
  vi.clearAllMocks();
  mockDb.getAll.mockResolvedValue([]);
  mockDb.put.mockResolvedValue(undefined);
  mockDb.clear.mockResolvedValue(undefined);
  mockProjectHydrate.mockResolvedValue(undefined);
  mockSessionHydrate.mockResolvedValue(undefined);
  mockTodoHydrate.mockResolvedValue(undefined);

  blobContents = [];
  class CapturingBlob extends OrigBlob {
    constructor(parts?: BlobPart[], opts?: BlobPropertyBag) {
      super(parts, opts);
      if (parts?.[0] !== undefined) blobContents.push(String(parts[0]));
    }
  }
  vi.stubGlobal('Blob', CapturingBlob);

  const mockAnchor = { href: '', download: '', click: vi.fn() };
  vi.spyOn(document, 'createElement').mockReturnValue(mockAnchor as unknown as HTMLElement);
  vi.spyOn(document.body, 'appendChild').mockReturnValue(mockAnchor as unknown as Node);
  vi.spyOn(document.body, 'removeChild').mockReturnValue(mockAnchor as unknown as Node);
});

afterEach(() => {
  vi.stubGlobal('Blob', OrigBlob);
});

// ── exportData ───────────────────────────────────────────────────────────────

describe('exportData', () => {
  it('包含 projects、sessions、todos、version、exportedAt（includeImages: false）', async () => {
    mockDb.getAll.mockImplementation((store: string) => {
      if (store === 'projects') return Promise.resolve([{ id: 'p1' }]);
      if (store === 'sessions') return Promise.resolve([{ id: 's1' }]);
      if (store === 'todos') return Promise.resolve([{ id: 't1' }]);
      return Promise.resolve([]);
    });

    await exportData(false);

    expect(blobContents.length).toBeGreaterThan(0);
    const parsed = JSON.parse(blobContents[0]) as Record<string, unknown>;
    expect(parsed).toHaveProperty('version', 3);
    expect(parsed).toHaveProperty('exportedAt');
    expect(Array.isArray(parsed.projects)).toBe(true);
    expect(Array.isArray(parsed.sessions)).toBe(true);
    expect(Array.isArray(parsed.todos)).toBe(true);
  });

  it('sessionImages 為空陣列（includeImages: false）', async () => {
    await exportData(false);

    expect(blobContents.length).toBeGreaterThan(0);
    const parsed = JSON.parse(blobContents[0]) as Record<string, unknown>;
    expect(parsed.sessionImages).toEqual([]);
  });

  it('sessionImages 包含真實資料（includeImages: true）', async () => {
    mockDb.getAll.mockImplementation((store: string) => {
      if (store === 'sessionImages')
        return Promise.resolve([{ sessionId: 's1', dataUrl: 'data:image/jpeg;base64,abc' }]);
      return Promise.resolve([]);
    });

    await exportData(true);

    expect(blobContents.length).toBeGreaterThan(0);
    const parsed = JSON.parse(blobContents[0]) as Record<string, unknown>;
    expect(Array.isArray(parsed.sessionImages)).toBe(true);
    expect((parsed.sessionImages as unknown[]).length).toBe(1);
  });

  it('觸發 Blob + a.click，檔名符合 everproject-YYYY-MM-DD.json 格式', async () => {
    const mockAnchor = { href: '', download: '', click: vi.fn() };
    vi.spyOn(document, 'createElement').mockReturnValue(mockAnchor as unknown as HTMLElement);

    await exportData(false);

    expect(URL.createObjectURL).toHaveBeenCalled();
    expect(mockAnchor.click).toHaveBeenCalled();
    expect(mockAnchor.download).toMatch(/^everproject-\d{4}-\d{2}-\d{2}\.json$/);
  });
});

// ── importData ───────────────────────────────────────────────────────────────

describe('importData', () => {
  it('valid file → 清除 4 個 store 並 put 回所有資料', async () => {
    const file = makeFile(VALID_BACKUP);
    await importData(file);

    expect(mockDb.clear).toHaveBeenCalledWith('projects');
    expect(mockDb.clear).toHaveBeenCalledWith('sessions');
    expect(mockDb.clear).toHaveBeenCalledWith('sessionImages');
    expect(mockDb.clear).toHaveBeenCalledWith('todos');

    expect(mockDb.put).toHaveBeenCalledWith('projects', VALID_BACKUP.projects[0]);
    expect(mockDb.put).toHaveBeenCalledWith('sessions', VALID_BACKUP.sessions[0]);
    expect(mockDb.put).toHaveBeenCalledWith('sessions', VALID_BACKUP.sessions[1]);
    expect(mockDb.put).toHaveBeenCalledWith('sessionImages', VALID_BACKUP.sessionImages[0]);
    expect(mockDb.put).toHaveBeenCalledWith('todos', VALID_BACKUP.todos[0]);
  });

  it('valid file → 回傳正確的 { projects, sessions, images, todos } 數量', async () => {
    const file = makeFile(VALID_BACKUP);
    const result = await importData(file);

    expect(result).toEqual({ projects: 1, sessions: 2, images: 1, todos: 1 });
  });

  it('缺少 sessionImages 欄位 → 不報錯，images 數量為 0', async () => {
    const withoutImages = Object.fromEntries(
      Object.entries(VALID_BACKUP).filter(([k]) => k !== 'sessionImages'),
    );
    const file = makeFile(withoutImages);
    const result = await importData(file);

    expect(result.images).toBe(0);
    expect(mockDb.clear).toHaveBeenCalledWith('sessionImages');
  });

  it('缺少 todos 欄位 → 不報錯，todos 數量為 0', async () => {
    const withoutTodos = Object.fromEntries(
      Object.entries(VALID_BACKUP).filter(([k]) => k !== 'todos'),
    );
    const file = makeFile(withoutTodos);
    const result = await importData(file);

    expect(result.todos).toBe(0);
    expect(mockDb.clear).toHaveBeenCalledWith('todos');
  });

  it('無效 JSON → throw Error', async () => {
    const file = new File(['not valid json!!!'], 'backup.json', { type: 'application/json' });
    await expect(importData(file)).rejects.toThrow();
  });

  it('缺少必要欄位（projects/sessions）→ throw Error', async () => {
    const file = makeFile({ version: 2, exportedAt: '2026-03-04T00:00:00.000Z' });
    await expect(importData(file)).rejects.toThrow('Invalid backup file');
  });

  it('缺少 version → throw Error', async () => {
    const withoutVersion = Object.fromEntries(
      Object.entries(VALID_BACKUP).filter(([k]) => k !== 'version'),
    );
    const file = makeFile(withoutVersion);
    await expect(importData(file)).rejects.toThrow('Invalid backup file');
  });

  it('匯入後呼叫 projectStore.hydrate()、sessionStore.hydrate()、todoStore.hydrate()', async () => {
    const file = makeFile(VALID_BACKUP);
    await importData(file);

    expect(mockProjectHydrate).toHaveBeenCalled();
    expect(mockSessionHydrate).toHaveBeenCalled();
    expect(mockTodoHydrate).toHaveBeenCalled();
  });
});
