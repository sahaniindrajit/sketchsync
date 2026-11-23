import { create } from 'zustand';
import type { Op, Shape, ShapeChanges, ShapePatch } from '@/shared/protocol';

/**
 * Local undo/redo for this user's own edits. Each entry holds the ops that reverse a
 * change, computed from the board just before the change was applied. Everything done
 * during one pointer gesture (draw, drag, resize) is one entry.
 */

type Entry = Op[];

interface HistoryState {
    undo: Entry[];
    redo: Entry[];
}

export const useHistory = create<HistoryState>()(() => ({ undo: [], redo: [] }));

const LIMIT = 200;
let replaying = false;
let gestureOpen = false;
let gestureEntry: Entry | null = null;

if (typeof window !== 'undefined') {
    window.addEventListener('pointerdown', () => {
        gestureOpen = true;
        gestureEntry = null;
    }, true);
    const end = () => {
        gestureOpen = false;
        gestureEntry = null;
    };
    window.addEventListener('pointerup', end, true);
    window.addEventListener('pointercancel', end, true);
}

/** The op that undoes `op`, given the shapes before it is applied. */
export function inverseOf(op: Op, shapes: Map<string, Shape>): Op | null {
    switch (op.kind) {
        case 'add': {
            const existed = op.shapes.map((s) => shapes.get(s.id)).filter((s): s is Shape => !!s);
            const created = op.shapes.filter((s) => !shapes.has(s.id)).map((s) => s.id);
            if (existed.length && !created.length) return { kind: 'add', shapes: existed };
            return created.length ? { kind: 'delete', ids: created } : null;
        }
        case 'update': {
            const patches: ShapePatch[] = [];
            for (const p of op.patches) {
                const prev = shapes.get(p.id) as unknown as Record<string, unknown> | undefined;
                if (!prev) continue;
                const changes: Record<string, unknown> = {};
                for (const key of Object.keys(p.changes)) changes[key] = prev[key] === undefined ? null : prev[key];
                patches.push({ id: p.id, changes: changes as ShapeChanges });
            }
            return patches.length ? { kind: 'update', patches } : null;
        }
        case 'append-points': {
            const prev = shapes.get(op.id);
            return prev && 'points' in prev ? { kind: 'update', patches: [{ id: op.id, changes: { points: prev.points } }] } : null;
        }
        case 'delete': {
            const removed = op.ids.map((id) => shapes.get(id)).filter((s): s is Shape => !!s);
            return removed.length ? { kind: 'add', shapes: removed } : null;
        }
        case 'clear':
            return shapes.size ? { kind: 'add', shapes: Array.from(shapes.values()) } : null;
    }
}

/** Called for every local op, before it is applied. */
export function recordOp(op: Op, shapes: Map<string, Shape>) {
    if (replaying) return;
    const inverse = inverseOf(op, shapes);
    if (!inverse) return;
    useHistory.setState((s) => {
        if (gestureOpen && gestureEntry && s.undo[s.undo.length - 1] === gestureEntry) {
            gestureEntry.push(inverse);
            return { redo: [] };
        }
        const entry: Entry = [inverse];
        if (gestureOpen) gestureEntry = entry;
        return { undo: [...s.undo, entry].slice(-LIMIT), redo: [] };
    });
}

function replay(entry: Entry, dispatch: (op: Op) => void, getShapes: () => Map<string, Shape>): Entry {
    const reverse: Entry = [];
    replaying = true;
    try {
        for (const op of [...entry].reverse()) {
            const inv = inverseOf(op, getShapes());
            dispatch(op);
            if (inv) reverse.push(inv);
        }
    } finally {
        replaying = false;
    }
    return reverse;
}

export function undo(dispatch: (op: Op) => void, getShapes: () => Map<string, Shape>): boolean {
    const { undo: stack } = useHistory.getState();
    const entry = stack[stack.length - 1];
    if (!entry) return false;
    const redoEntry = replay(entry, dispatch, getShapes);
    useHistory.setState((s) => ({ undo: s.undo.slice(0, -1), redo: [...s.redo, redoEntry] }));
    return true;
}

export function redo(dispatch: (op: Op) => void, getShapes: () => Map<string, Shape>): boolean {
    const { redo: stack } = useHistory.getState();
    const entry = stack[stack.length - 1];
    if (!entry) return false;
    const undoEntry = replay(entry, dispatch, getShapes);
    useHistory.setState((s) => ({ redo: s.redo.slice(0, -1), undo: [...s.undo, undoEntry] }));
    return true;
}

export function resetHistory() {
    gestureEntry = null;
    useHistory.setState({ undo: [], redo: [] });
}

/** Runs `fn` so that every op it dispatches becomes a single undo step. */
export function asOneStep(fn: () => void) {
    const wasOpen = gestureOpen;
    gestureOpen = true;
    gestureEntry = null;
    try {
        fn();
    } finally {
        gestureOpen = wasOpen;
        gestureEntry = null;
    }
}
