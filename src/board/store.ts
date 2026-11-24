import { create } from 'zustand';
import { applyOp } from '@/shared/ops';
import { asOneStep, redo, resetHistory, undo, useHistory } from './history';
import { DEFAULTS, type BoardRole, type Op, type Shape } from '@/shared/protocol';

export type Tool = 'select' | 'hand' | 'rect' | 'ellipse' | 'diamond' | 'arrow' | 'line' | 'pencil' | 'text' | 'math' | 'eraser';

export type ConnectionStatus = 'connecting' | 'online' | 'offline' | 'error';

export interface Viewport {
    x: number;
    y: number;
    scale: number;
}

export interface AiActivity {
    name: string;
    shapeIds: string[];
    at: number;
    /** Ops that revert this batch of AI edits, oldest first. */
    undo: Op[];
    added: number;
    connectors: number;
    /** Shapes touched by the most recent AI op only. */
    lastIds: string[];
}

/** `text`/`math` edit a shape, `label` edits a box/line label, `new-text`/`new-math` place a new shape. */
export type EditingState = { kind: 'text' | 'label' | 'math'; shapeId: string } | { kind: 'new-text' | 'new-math'; x: number; y: number };

/** Why the board can't be shown: it needs a sign-in, the person has no access, or it was deleted. */
export type BoardAccess = 'ok' | 'auth_required' | 'forbidden' | 'removed';

export interface BoardState {
    roomId: string | null;
    /** What this person may do here. Viewers can look around but not change anything. */
    role: BoardRole;
    access: BoardAccess;
    shapes: Map<string, Shape>;
    tool: Tool;
    strokeColor: string;
    fillColor: string;
    strokeWidth: number;
    fontSize: number;
    selectedIds: string[];
    viewport: Viewport;
    /** Where the camera is gliding to, while it glides. */
    viewportTarget: Viewport | null;
    connection: ConnectionStatus;
    connectionError: string | null;
    aiActivity: AiActivity | null;
    editing: EditingState | null;
    notice: { text: string; kind: 'info' | 'error'; at: number } | null;
    /** Sends an op to the room (set by RoomSync). */
    dispatch: (op: Op) => void;

    setTool: (tool: Tool) => void;
    setStyle: (style: Partial<Pick<BoardState, 'strokeColor' | 'fillColor' | 'strokeWidth' | 'fontSize'>>) => void;
    setSelection: (ids: string[]) => void;
    setViewport: (viewport: Viewport) => void;
    setEditing: (editing: EditingState | null) => void;
    notify: (text: string, kind?: 'info' | 'error') => void;
}

const initialDefaults = {
    roomId: null,
    role: 'editor' as BoardRole,
    access: 'ok' as BoardAccess,
    shapes: new Map<string, Shape>(),
    selectedIds: [] as string[],
    viewport: { x: 0, y: 0, scale: 1 },
    viewportTarget: null as Viewport | null,
    connection: 'connecting' as ConnectionStatus,
    connectionError: null,
    aiActivity: null,
    editing: null,
    notice: null,
};

export const useBoard = create<BoardState>()((set) => ({
    ...initialDefaults,
    tool: 'select',
    strokeColor: DEFAULTS.strokeColor,
    fillColor: DEFAULTS.fillColor,
    strokeWidth: DEFAULTS.strokeWidth,
    fontSize: DEFAULTS.fontSize,
    dispatch: () => {},

    // Viewers only get the hand tool.
    setTool: (tool) => set((s) => (s.role === 'viewer' && tool !== 'hand' ? {} : { tool, selectedIds: tool === 'select' ? s.selectedIds : [], editing: null })),
    setStyle: (style) => set(style),
    setSelection: (selectedIds) => set({ selectedIds }),
    setViewport: (viewport) => set({ viewport }),
    setEditing: (editing) => set({ editing }),
    notify: (text, kind = 'info') => set({ notice: { text, kind, at: Date.now() } }),
}));

/** Applies a role from the server; viewers drop to the hand tool. */
export function setRole(role: BoardRole) {
    useBoard.setState((s) => (role === 'viewer' ? { role, tool: 'hand', selectedIds: [], editing: null } : { role, tool: s.role === 'viewer' ? 'select' : s.tool }));
}

/** Applies an op to the local store only (no network). */
export function applyToStore(op: Op) {
    setShapes(applyOp(useBoard.getState().shapes, op));
}

/** Replaces the rendered shapes, dropping selection/editing state for shapes that no longer exist. */
export function setShapes(shapes: Map<string, Shape>) {
    useBoard.setState((state) => {
        const selectedIds = state.selectedIds.filter((id) => shapes.has(id));
        const editing = state.editing && ('x' in state.editing || shapes.has(state.editing.shapeId)) ? state.editing : null;
        return {
            shapes,
            selectedIds: selectedIds.length === state.selectedIds.length ? state.selectedIds : selectedIds,
            editing,
        };
    });
}

export function resetBoardState(roomId: string | null, shapes: Map<string, Shape>) {
    resetHistory();
    useBoard.setState((s) => ({ ...initialDefaults, roomId, shapes, selectedIds: [], viewport: { x: 0, y: 0, scale: 1 }, tool: s.role === 'viewer' ? 'select' : s.tool }));
}

/** "claude-ai" → "Claude AI": a readable name for an MCP client. */
export function agentName(raw: string): string {
    const words = raw.replace(/[-_.]+/g, ' ').trim().split(/\s+/).filter(Boolean);
    if (!words.length) return 'AI';
    return words.map((w) => (w.length <= 2 ? w.toUpperCase() : w[0].toUpperCase() + w.slice(1))).join(' ');
}

let viewportAnim = 0;

/**
 * Glides the camera to `target`. Stops as soon as anything else moves the viewport
 * (a pan, a wheel), so it never fights the user.
 */
export function animateViewport(target: Viewport, ms = 320) {
    const start = useBoard.getState().viewport;
    cancelAnimationFrame(viewportAnim);
    if (typeof window === 'undefined' || window.matchMedia('(prefers-reduced-motion: reduce)').matches || ms <= 0) {
        useBoard.setState({ viewport: target, viewportTarget: null });
        return;
    }
    useBoard.setState({ viewportTarget: target });
    const t0 = performance.now();
    let last = start;
    const ease = (t: number) => 1 - Math.pow(1 - t, 3);
    const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
    // Glide the board point under the screen centre, so the view never drifts sideways while zooming.
    const cx = window.innerWidth / 2;
    const cy = window.innerHeight / 2;
    const c0 = { x: (cx - start.x) / start.scale, y: (cy - start.y) / start.scale };
    const c1 = { x: (cx - target.x) / target.scale, y: (cy - target.y) / target.scale };
    const step = (now: number) => {
        const current = useBoard.getState().viewport;
        if (current !== last) {
            useBoard.setState({ viewportTarget: null }); // someone else moved the camera
            return;
        }
        const t = Math.min(1, (now - t0) / ms);
        const k = ease(t);
        // Interpolate scale geometrically so zooming feels even.
        const scale = start.scale * Math.pow(target.scale / start.scale, k);
        const c = { x: lerp(c0.x, c1.x, k), y: lerp(c0.y, c1.y, k) };
        last = { scale, x: cx - c.x * scale, y: cy - c.y * scale };
        if (t >= 1) last = target;
        useBoard.setState(t >= 1 ? { viewport: last, viewportTarget: null } : { viewport: last });
        if (t < 1) viewportAnim = requestAnimationFrame(step);
    };
    viewportAnim = requestAnimationFrame(step);
}

/** Undo/redo the local user's last change. */
/** Whether Undo has anything to do: your own history, or a newer AI batch. */
export function useCanUndo(): boolean {
    const local = useHistory((s) => s.undo.length > 0);
    const lastAt = useHistory((s) => s.lastAt);
    const ai = useBoard((s) => s.aiActivity);
    return local || (!!ai?.undo.length && ai.at > lastAt);
}

/** True when the newest change on the board is an AI batch you can still revert. */
export function aiUndoable(): boolean {
    const ai = useBoard.getState().aiActivity;
    return !!ai?.undo.length && ai.at > useHistory.getState().lastAt && Date.now() - ai.at < 120_000;
}

/** Undo: the AI's batch if that is the newest change, otherwise your own last change. */
export const undoLast = () => {
    if (aiUndoable()) {
        undoAiBatch();
        return true;
    }
    return undo((op) => useBoard.getState().dispatch(op), () => useBoard.getState().shapes);
};
/** Reverts the AI's most recent batch of edits (as one undoable step for this user). */
export function undoAiBatch() {
    const { aiActivity, dispatch, notify } = useBoard.getState();
    if (!aiActivity?.undo.length) return;
    asOneStep(() => {
        for (const op of [...aiActivity.undo].reverse()) dispatch(op);
    });
    useBoard.setState({ aiActivity: null });
    notify(`Reverted ${aiActivity.name}'s changes`);
}
export const redoLast = () => redo((op) => useBoard.getState().dispatch(op), () => useBoard.getState().shapes);

if (import.meta.env.DEV || import.meta.env.MODE === 'test') {
    // Handy for debugging and used by the Playwright end-to-end tests.
    (window as unknown as { __board: typeof useBoard }).__board = useBoard;
}
