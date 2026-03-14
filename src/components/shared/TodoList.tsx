/**
 * Per-project todo list component.
 * Add / toggle / delete / reorder todos (dnd-kit); calls todoStore actions.
 * Dependencies: todoStore, dnd-kit
 */
import { useEffect, useState, useReducer, useRef } from 'react';
import { useTodoStore } from '@/store/todoStore';
import type { TodoItem } from '@/types';

// ── SwipeableTodoRow ──────────────────────────────────────────────────────────

const REVEAL_WIDTH = 72;
const DRAG_THRESHOLD = 8;
const SNAP_THRESHOLD = 30;

type SwipeState = { offset: number; revealed: boolean; isDragging: boolean };
const SWIPE_INITIAL: SwipeState = { offset: 0, revealed: false, isDragging: false };

type SwipeAction =
  | { type: 'RESET' }
  | { type: 'DRAG_START' }
  | { type: 'DRAG_MOVE'; offset: number }
  | { type: 'DRAG_CANCEL_VERTICAL'; offset: number }
  | { type: 'SNAP_OPEN' }
  | { type: 'SNAP_CLOSE' }
  | { type: 'KEEP_CURRENT'; revealed: boolean }
  | { type: 'CLOSE_REVEAL' };

function swipeReducer(state: SwipeState, action: SwipeAction): SwipeState {
  switch (action.type) {
    case 'RESET':                return SWIPE_INITIAL;
    case 'DRAG_START':           return { ...state, isDragging: true };
    case 'DRAG_MOVE':            return { ...state, offset: action.offset };
    case 'DRAG_CANCEL_VERTICAL': return { ...state, isDragging: false, offset: action.offset };
    case 'SNAP_OPEN':            return { ...state, isDragging: false, offset: -REVEAL_WIDTH, revealed: true };
    case 'SNAP_CLOSE':           return { ...state, isDragging: false, offset: 0, revealed: false };
    case 'KEEP_CURRENT':         return { ...state, isDragging: false, offset: action.revealed ? -REVEAL_WIDTH : 0 };
    case 'CLOSE_REVEAL':         return { ...state, offset: 0, revealed: false };
  }
}

function SwipeableTodoRow({
  children,
  onDelete,
  onTap,
}: {
  children: React.ReactNode;
  onDelete: () => void;
  onTap?: () => void;
}): React.ReactElement {
  const [state, dispatch] = useReducer(swipeReducer, SWIPE_INITIAL);
  const { offset, revealed, isDragging } = state;

  const isDraggingRef = useRef(false);
  const startXRef = useRef(0);
  const startYRef = useRef(0);
  const baseOffsetRef = useRef(0);
  const hasDraggedRef = useRef(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!revealed) return;
    function onDocPointerDown(e: PointerEvent): void {
      if (!containerRef.current?.contains(e.target as Node)) {
        dispatch({ type: 'CLOSE_REVEAL' });
      }
    }
    document.addEventListener('pointerdown', onDocPointerDown);
    return () => document.removeEventListener('pointerdown', onDocPointerDown);
  }, [revealed]);

  function handlePointerDown(e: React.PointerEvent<HTMLDivElement>): void {
    e.currentTarget.setPointerCapture(e.pointerId);
    startXRef.current = e.clientX;
    startYRef.current = e.clientY;
    baseOffsetRef.current = revealed ? -REVEAL_WIDTH : 0;
    isDraggingRef.current = true;
    hasDraggedRef.current = false;
    dispatch({ type: 'DRAG_START' });
  }

  function handlePointerMove(e: React.PointerEvent<HTMLDivElement>): void {
    if (!isDraggingRef.current) return;
    const dx = e.clientX - startXRef.current;
    const dy = e.clientY - startYRef.current;
    if (!hasDraggedRef.current && Math.abs(dy) > Math.abs(dx)) {
      isDraggingRef.current = false;
      dispatch({ type: 'DRAG_CANCEL_VERTICAL', offset: baseOffsetRef.current });
      return;
    }
    if (Math.abs(dx) < DRAG_THRESHOLD) return;
    hasDraggedRef.current = true;
    dispatch({ type: 'DRAG_MOVE', offset: Math.min(0, Math.max(-REVEAL_WIDTH, baseOffsetRef.current + dx)) });
  }

  function handlePointerUp(): void {
    if (!isDraggingRef.current) return;
    isDraggingRef.current = false;
    const dx = offset - baseOffsetRef.current;
    if (dx < -SNAP_THRESHOLD) {
      dispatch({ type: 'SNAP_OPEN' });
    } else if (dx > SNAP_THRESHOLD && revealed) {
      dispatch({ type: 'SNAP_CLOSE' });
    } else {
      dispatch({ type: 'KEEP_CURRENT', revealed });
      if (!hasDraggedRef.current) {
        if (revealed) dispatch({ type: 'CLOSE_REVEAL' });
        else onTap?.();
      }
    }
  }

  return (
    <div ref={containerRef} className="overflow-hidden border-b border-outline/20">
      <div
        style={{
          display: 'flex',
          transform: `translateX(${offset}px)`,
          transition: isDragging ? 'none' : 'transform 200ms ease-out',
        }}
      >
        <div
          className="w-full shrink-0 flex items-center min-h-14 py-3"
          style={{ touchAction: 'pan-y', userSelect: 'none' }}
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onPointerCancel={handlePointerUp}
        >
          {children}
        </div>
        <div
          className="bg-error shrink-0 flex items-center justify-center"
          style={{ width: REVEAL_WIDTH }}
        >
          <button
            className="h-full w-full flex items-center justify-center text-white text-sm font-medium"
            onClick={() => { dispatch({ type: 'RESET' }); onDelete(); }}
          >
            Delete
          </button>
        </div>
      </div>
    </div>
  );
}

// ── TodoList ──────────────────────────────────────────────────────────────────

const ROW_H = 56; // h-14 = 56px

interface TodoListProps {
  projectId: string;
  colorHex: string;
}

export function TodoList({ projectId, colorHex }: TodoListProps): React.ReactElement {
  const todos = useTodoStore(s => s.todos);
  const loadTodos = useTodoStore(s => s.loadTodos);
  const addTodo = useTodoStore(s => s.addTodo);
  const updateTodo = useTodoStore(s => s.updateTodo);
  const toggleTodo = useTodoStore(s => s.toggleTodo);
  const deleteTodo = useTodoStore(s => s.deleteTodo);
  const reorderTodos = useTodoStore(s => s.reorderTodos);

  const [editingId, setEditingId] = useState<string | null>(null);
  const [editText, setEditText] = useState('');
  const [isReordering, setIsReordering] = useState(false);
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [dragOrderIds, setDragOrderIds] = useState<string[]>([]);

  const draggingIdRef = useRef<string | null>(null);
  const dragOrderIdsRef = useRef<string[]>([]);
  const pendingListRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    void loadTodos(projectId);
  }, [projectId, loadTodos]);

  // Separate pending / done; pending respects custom order field
  const pendingTodos = [...todos]
    .filter(t => !t.isDone)
    .sort((a, b) => (a.order ?? a.createdAt) - (b.order ?? b.createdAt));
  const doneTodos = [...todos]
    .filter(t => t.isDone)
    .sort((a, b) => a.createdAt - b.createdAt);

  // While dragging, substitute the real-time reordered array
  const displayedPending: TodoItem[] =
    isReordering && dragOrderIds.length > 0
      ? (dragOrderIds.map(id => pendingTodos.find(t => t.id === id)).filter(Boolean) as TodoItem[])
      : pendingTodos;

  // ── Edit handlers ────────────────────────────────────────────────────────

  async function handleAddTodo(): Promise<void> {
    await addTodo(projectId, '');
    const newTodo = useTodoStore.getState().todos.at(-1);
    if (newTodo) {
      setEditText('');
      setEditingId(newTodo.id);
    }
  }

  function startEdit(todo: TodoItem): void {
    setEditingId(todo.id);
    setEditText(todo.text);
  }

  async function commitEdit(id: string): Promise<void> {
    const text = editText.trim();
    setEditingId(null);
    if (text) {
      await updateTodo(id, text);
    } else {
      await deleteTodo(id);
    }
  }

  // ── Reorder mode ─────────────────────────────────────────────────────────

  function enterReorder(): void {
    setDragOrderIds(pendingTodos.map(t => t.id));
    setIsReordering(true);
  }

  function exitReorder(): void {
    setIsReordering(false);
    setDraggingId(null);
    setDragOrderIds([]);
  }

  // ── Drag handle pointer handlers ─────────────────────────────────────────

  function handleDragPointerDown(e: React.PointerEvent<HTMLDivElement>, id: string): void {
    e.stopPropagation();
    e.currentTarget.setPointerCapture(e.pointerId);
    draggingIdRef.current = id;
    const ids = pendingTodos.map(t => t.id);
    dragOrderIdsRef.current = [...ids];
    setDraggingId(id);
    setDragOrderIds([...ids]);
  }

  function handleDragPointerMove(e: React.PointerEvent<HTMLDivElement>): void {
    if (!draggingIdRef.current || !pendingListRef.current) return;
    const { top } = pendingListRef.current.getBoundingClientRect();
    const relY = e.clientY - top;
    const count = dragOrderIdsRef.current.length;
    const targetIdx = Math.max(0, Math.min(Math.floor(relY / ROW_H), count - 1));
    const fromIdx = dragOrderIdsRef.current.indexOf(draggingIdRef.current);
    if (fromIdx === targetIdx) return;
    const newIds = [...dragOrderIdsRef.current];
    newIds.splice(fromIdx, 1);
    newIds.splice(targetIdx, 0, draggingIdRef.current);
    dragOrderIdsRef.current = newIds;
    setDragOrderIds([...newIds]);
  }

  async function handleDragPointerUp(): Promise<void> {
    if (!draggingIdRef.current) return;
    draggingIdRef.current = null;
    setDraggingId(null);
    await reorderTodos(dragOrderIdsRef.current);
  }

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <div className="bg-surface-variant mx-4 mt-4 rounded-xl overflow-hidden border border-outline/20">
      {/* Sort button header — only if 2+ pending items */}
      {pendingTodos.length >= 2 && (
        <div className="flex justify-end px-3 py-1.5 border-b border-outline/20">
          <button
            type="button"
            className={`flex items-center gap-1 text-xs px-2 py-1 rounded-lg font-medium transition-colors ${
              isReordering ? 'text-primary' : 'text-on-surface-variant/60'
            }`}
            onClick={isReordering ? exitReorder : enterReorder}
          >
            {isReordering ? '完成' : (
              <>
                <svg viewBox="0 0 16 12" className="w-3.5 h-3 fill-current">
                  <rect x="0" y="0" width="16" height="2" rx="1" />
                  <rect x="0" y="5" width="16" height="2" rx="1" />
                  <rect x="0" y="10" width="16" height="2" rx="1" />
                </svg>
                排序
              </>
            )}
          </button>
        </div>
      )}

      {isReordering ? (
        /* ── Reorder mode ── */
        <>
          <div ref={pendingListRef}>
            {displayedPending.map(todo => (
              <div
                key={todo.id}
                className={`h-14 flex items-center gap-3 px-4 border-b border-outline/20 transition-colors duration-100 ${
                  draggingId === todo.id ? 'bg-primary-container/40' : ''
                }`}
                style={{ userSelect: 'none' }}
              >
                {/* Circle — visual only */}
                <div
                  className="shrink-0 w-6 h-6 rounded-full border-2"
                  style={{ borderColor: `${colorHex}40` }}
                />
                {/* Text */}
                <span className="flex-1 text-sm text-on-surface">{todo.text}</span>
                {/* Drag handle */}
                <div
                  className="shrink-0 w-10 h-full flex items-center justify-center text-on-surface-variant/40 active:text-on-surface-variant"
                  style={{ touchAction: 'none', cursor: 'grab' }}
                  onPointerDown={e => handleDragPointerDown(e, todo.id)}
                  onPointerMove={handleDragPointerMove}
                  onPointerUp={() => { void handleDragPointerUp(); }}
                  onPointerCancel={() => { void handleDragPointerUp(); }}
                >
                  <svg viewBox="0 0 16 12" className="w-4 h-3 fill-current">
                    <rect x="0" y="0" width="16" height="2" rx="1" />
                    <rect x="0" y="5" width="16" height="2" rx="1" />
                    <rect x="0" y="10" width="16" height="2" rx="1" />
                  </svg>
                </div>
              </div>
            ))}
          </div>

          {/* Done items — static, no drag */}
          {doneTodos.map(todo => (
            <div
              key={todo.id}
              className="h-14 flex items-center gap-3 px-4 border-b border-outline/20 opacity-40"
            >
              <div
                className="shrink-0 w-6 h-6 rounded-full border-2 flex items-center justify-center"
                style={{ backgroundColor: colorHex, borderColor: colorHex }}
              >
                <svg viewBox="0 0 12 10" className="w-3 h-3 fill-none stroke-white stroke-2">
                  <polyline points="1,5 4.5,8.5 11,1" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </div>
              <span className="flex-1 text-sm line-through text-on-surface-variant/40">{todo.text}</span>
            </div>
          ))}
        </>
      ) : (
        /* ── Normal mode ── */
        <>
          {/* Top border */}
          <div className="border-t border-outline/20" />

          {pendingTodos.map(todo => (
            <SwipeableTodoRow
              key={todo.id}
              onDelete={() => { void deleteTodo(todo.id); }}
              onTap={() => { if (editingId !== todo.id) startEdit(todo); }}
            >
              <div className="flex items-start gap-3 px-4 w-full">
                <button
                  type="button"
                  className="shrink-0 mt-0.5 w-6 h-6 rounded-full border-2 flex items-center justify-center transition-colors duration-150"
                  style={{ borderColor: `${colorHex}80` }}
                  onPointerDown={e => e.stopPropagation()}
                  onClick={() => { void toggleTodo(todo.id); }}
                />
                {editingId === todo.id ? (
                  <textarea
                    autoFocus
                    rows={1}
                    className="flex-1 bg-transparent text-sm text-on-surface outline-none resize-none overflow-hidden leading-5"
                    value={editText}
                    ref={el => {
                      if (el) { el.style.height = 'auto'; el.style.height = el.scrollHeight + 'px'; }
                    }}
                    onChange={e => {
                      setEditText(e.target.value);
                      e.target.style.height = 'auto';
                      e.target.style.height = e.target.scrollHeight + 'px';
                    }}
                    onBlur={() => { void commitEdit(todo.id); }}
                    onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) e.currentTarget.blur(); }}
                    onPointerDown={e => e.stopPropagation()}
                  />
                ) : (
                  <span className="flex-1 text-sm text-on-surface select-none break-words whitespace-pre-wrap min-w-0">
                    {todo.text || <span className="italic text-on-surface-variant/40">（空白）</span>}
                  </span>
                )}
              </div>
            </SwipeableTodoRow>
          ))}

          {doneTodos.map(todo => (
            <SwipeableTodoRow
              key={todo.id}
              onDelete={() => { void deleteTodo(todo.id); }}
              onTap={() => { void toggleTodo(todo.id); }}
            >
              <div className="flex items-start gap-3 px-4 w-full">
                <button
                  type="button"
                  className="shrink-0 mt-0.5 w-6 h-6 rounded-full border-2 flex items-center justify-center"
                  style={{ backgroundColor: colorHex, borderColor: colorHex }}
                  onPointerDown={e => e.stopPropagation()}
                  onClick={() => { void toggleTodo(todo.id); }}
                >
                  <svg viewBox="0 0 12 10" className="w-3 h-3 fill-none stroke-white stroke-2">
                    <polyline points="1,5 4.5,8.5 11,1" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </button>
                <span className="flex-1 text-sm line-through text-on-surface-variant/40 select-none break-words whitespace-pre-wrap min-w-0">
                  {todo.text}
                </span>
              </div>
            </SwipeableTodoRow>
          ))}

          {/* Add row */}
          <button
            type="button"
            className="h-14 w-full flex items-center gap-3 px-4 text-sm italic text-on-surface-variant/40 border-t border-outline/20"
            onClick={() => { void handleAddTodo(); }}
          >
            <span className="w-6 h-6 flex items-center justify-center text-lg leading-none">+</span>
            新增待辦
          </button>
        </>
      )}
    </div>
  );
}
