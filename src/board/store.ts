import { create } from 'zustand';
import { applyOp } from '@/shared/ops';
import { DEFAULTS, type Op, type Shape } from '@/shared/protocol';

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
}

/** `text`/`math` edit a shape, `label` edits a box/line label, `new-text`/`new-math` place a new shape. */
export type EditingState = { kind: 'text' | 'label' | 'math'; shapeId: string } | { kind: 'new-text' | 'new-math'; x: number; y: number };

export interface BoardState {
    roomId: string | null;
    shapes: Map<string, Shape>;
    tool: Tool;
    strokeColor: string;
    fillColor: string;
    strokeWidth: number;
    fontSize: number;
    selectedIds: string[];
    viewport: Viewport;
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
    shapes: new Map<string, Shape>(),
    selectedIds: [] as string[],
    viewport: { x: 0, y: 0, scale: 1 },
    connection: 'connecting' as ConnectionStatus,
    connectionError: null,
    aiActivity: null,
    editing: null,
    notice: null,
};

export const useBoard = create<BoardState>()((set) => ({
    ...initialDefaults,
    tool: 'pencil',
    strokeColor: DEFAULTS.strokeColor,
    fillColor: DEFAULTS.fillColor,
    strokeWidth: DEFAULTS.strokeWidth,
    fontSize: DEFAULTS.fontSize,
    dispatch: () => {},

    setTool: (tool) => set((s) => ({ tool, selectedIds: tool === 'select' ? s.selectedIds : [], editing: null })),
    setStyle: (style) => set(style),
    setSelection: (selectedIds) => set({ selectedIds }),
    setViewport: (viewport) => set({ viewport }),
    setEditing: (editing) => set({ editing }),
    notify: (text, kind = 'info') => set({ notice: { text, kind, at: Date.now() } }),
}));

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
    useBoard.setState({ ...initialDefaults, roomId, shapes, selectedIds: [], viewport: { x: 0, y: 0, scale: 1 } });
}

if (import.meta.env.DEV || import.meta.env.MODE === 'test') {
    // Handy for debugging and used by the Playwright end-to-end tests.
    (window as unknown as { __board: typeof useBoard }).__board = useBoard;
}
