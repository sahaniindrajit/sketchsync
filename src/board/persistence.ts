import { v4 as uuidv4 } from 'uuid';
import { DEFAULTS, isValidRoomId, type Op, type Shape } from '@/shared/protocol';

const boardKey = (roomId: string) => `sketchsync:board:${roomId}`;
const LAST_BOARD_KEY = 'sketchsync:lastBoardId';
const LEGACY_KEY = 'whiteboardData';

export interface PendingOp {
    opId: string;
    op: Op;
}

export interface StoredBoard {
    /** Last known server state. */
    confirmed: Shape[];
}

interface StoredBoardV2 extends StoredBoard {
    version: 2;
    savedAt: number;
    /** Written by the previous single-tab format; adopted once. */
    pending?: PendingOp[];
}

/** One tab's unconfirmed ops for a room. */
interface PendingRecord {
    tabId: string;
    savedAt: number;
    /** The tab shut the board down cleanly (navigation/unmount); others may adopt its ops. */
    closed: boolean;
    ops: PendingOp[];
}

const pendingPrefix = (roomId: string) => `sketchsync:pending:${roomId}:`;
const tabLock = (tabId: string) => `sketchsync:tab:${tabId}`;

function safeGet(key: string): string | null {
    try {
        return localStorage.getItem(key);
    } catch {
        return null;
    }
}

function safeSet(key: string, value: string): boolean {
    try {
        localStorage.setItem(key, value);
        return true;
    } catch {
        return false;
    }
}

const finite = (v: unknown) => typeof v === 'number' && Number.isFinite(v);
const str = (v: unknown) => typeof v === 'string';
const pointsOk = (v: unknown) => Array.isArray(v) && v.length % 2 === 0 && v.every(finite);

/** Cheap structural check so a corrupt cache can't crash the renderer. */
export function isRenderableShape(value: unknown): value is Shape {
    if (!value || typeof value !== 'object') return false;
    const s = value as Record<string, unknown>;
    if (!str(s.id) || !finite(s.x) || !finite(s.y) || !finite(s.z) || !str(s.strokeColor) || !str(s.fillColor)) return false;
    if (!finite(s.strokeWidth) || !finite(s.rotation) || !finite(s.opacity)) return false;
    switch (s.type) {
        case 'rect':
        case 'ellipse':
        case 'diamond':
            return finite(s.width) && finite(s.height) && (s.label === undefined || (typeof s.label === 'object' && s.label !== null && str((s.label as { text?: unknown }).text)));
        case 'image':
            return finite(s.width) && finite(s.height) && str(s.src);
        case 'line':
        case 'arrow':
        case 'freehand':
            return pointsOk(s.points);
        case 'text':
            return str(s.text) && finite(s.fontSize);
        case 'math':
            return str(s.latex) && finite(s.fontSize);
        default:
            return false;
    }
}

const isPendingOp = (p: unknown): p is PendingOp =>
    !!p && typeof p === 'object' && str((p as PendingOp).opId) && !!(p as PendingOp).op && str((p as PendingOp).op.kind);

export function loadBoard(roomId: string): StoredBoard {
    const raw = safeGet(boardKey(roomId));
    if (!raw) return { confirmed: [] };
    try {
        const parsed = JSON.parse(raw) as Partial<StoredBoardV2> & { shapes?: unknown[] };
        const confirmed = (Array.isArray(parsed.confirmed) ? parsed.confirmed : Array.isArray(parsed.shapes) ? parsed.shapes : []).filter(isRenderableShape);
        return { confirmed };
    } catch {
        return { confirmed: [] };
    }
}

/** Saves the confirmed board locally. Falls back to dropping images if storage is full. */
export function saveBoard(roomId: string, board: StoredBoard): 'saved' | 'saved-without-images' | 'failed' {
    const data = (b: StoredBoard): string => JSON.stringify({ version: 2, savedAt: Date.now(), ...b } satisfies StoredBoardV2);
    if (safeSet(boardKey(roomId), data(board))) return 'saved';
    if (safeSet(boardKey(roomId), data({ confirmed: board.confirmed.filter((s) => s.type !== 'image') }))) return 'saved-without-images';
    return 'failed';
}

const withoutImages = (op: Op): Op | null => {
    if (op.kind === 'add') {
        const shapes = op.shapes.filter((s) => s.type !== 'image');
        return shapes.length ? { kind: 'add', shapes } : null;
    }
    if (op.kind === 'update') {
        const patches = op.patches.map((p) => ({ id: p.id, changes: { ...p.changes, src: undefined } })).filter((p) => Object.values(p.changes).some((v) => v !== undefined));
        return patches.length ? { kind: 'update', patches } : null;
    }
    return op;
};

/** Saves this tab's unconfirmed ops. */
export function savePending(roomId: string, tabId: string, ops: PendingOp[], closed = false): boolean {
    const key = pendingPrefix(roomId) + tabId;
    if (ops.length === 0) {
        try {
            localStorage.removeItem(key);
        } catch {
            /* ignore */
        }
        return true;
    }
    const record = (list: PendingOp[]): string => JSON.stringify({ tabId, savedAt: Date.now(), closed, ops: list } satisfies PendingRecord);
    if (safeSet(key, record(ops))) return true;
    const slim = ops.flatMap((p) => {
        const op = withoutImages(p.op);
        return op ? [{ opId: p.opId, op }] : [];
    });
    return safeSet(key, record(slim));
}

async function heldLocks(): Promise<Set<string> | null> {
    const locks = typeof navigator !== 'undefined' ? (navigator as Navigator & { locks?: LockManager }).locks : undefined;
    if (!locks?.query) return null;
    const snapshot = await locks.query();
    return new Set([...(snapshot.held ?? []), ...(snapshot.pending ?? [])].map((l) => l.name ?? ''));
}

/** Holds a lock for this tab's lifetime so other tabs know its pending ops aren't orphaned. */
export function holdTabLock(tabId: string) {
    const locks = typeof navigator !== 'undefined' ? (navigator as Navigator & { locks?: LockManager }).locks : undefined;
    if (!locks?.request) return () => {};
    let release: () => void = () => {};
    const held = new Promise<void>((resolve) => (release = resolve));
    void locks.request(tabLock(tabId), () => held).catch(() => undefined);
    return release;
}

async function withAdoptLock<T>(roomId: string, fn: () => Promise<T> | T): Promise<T> {
    const locks = typeof navigator !== 'undefined' ? (navigator as Navigator & { locks?: LockManager }).locks : undefined;
    if (!locks?.request) return fn();
    return locks.request(`sketchsync:adopt:${roomId}`, () => fn()) as Promise<T>;
}

/**
 * Takes over unconfirmed ops left behind by tabs that are gone (closed, reloaded or crashed),
 * plus any from the previous single-tab cache format. Removes them from storage.
 */
export function adoptOrphanPending(roomId: string, ownTabId: string): Promise<PendingOp[]> {
    return withAdoptLock(roomId, async () => {
        const held = await heldLocks().catch(() => null);
        const adopted: { savedAt: number; ops: PendingOp[] }[] = [];
        const prefix = pendingPrefix(roomId);
        let keys: string[] = [];
        try {
            keys = Object.keys(localStorage).filter((k) => k.startsWith(prefix) && k !== prefix + ownTabId);
        } catch {
            return [];
        }
        for (const key of keys) {
            try {
                const record = JSON.parse(localStorage.getItem(key) ?? 'null') as PendingRecord | null;
                if (!record || !Array.isArray(record.ops)) {
                    localStorage.removeItem(key);
                    continue;
                }
                const orphaned = record.closed || (held !== null && !held.has(tabLock(record.tabId)));
                if (!orphaned) continue;
                adopted.push({ savedAt: record.savedAt ?? 0, ops: record.ops.filter(isPendingOp) });
                localStorage.removeItem(key);
            } catch {
                /* ignore unreadable records */
            }
        }
        // Previous cache format kept pending ops next to the board.
        try {
            const raw = localStorage.getItem(boardKey(roomId));
            const parsed = raw ? (JSON.parse(raw) as Partial<StoredBoardV2>) : null;
            if (parsed && Array.isArray(parsed.pending) && parsed.pending.length) {
                adopted.push({ savedAt: parsed.savedAt ?? 0, ops: parsed.pending.filter(isPendingOp) });
                delete parsed.pending;
                localStorage.setItem(boardKey(roomId), JSON.stringify(parsed));
            }
        } catch {
            /* ignore */
        }
        return adopted.sort((a, b) => a.savedAt - b.savedAt).flatMap((a) => a.ops);
    });
}

export function getLastBoardId(): string | null {
    const id = safeGet(LAST_BOARD_KEY);
    return id && isValidRoomId(id) ? id : null;
}

export function setLastBoardId(roomId: string) {
    safeSet(LAST_BOARD_KEY, roomId);
}

/** Creates a new board id, migrating the pre-rooms `whiteboardData` drawing into it once. */
export function createBoard(): string {
    const roomId = uuidv4();
    const legacy = migrateLegacyBoard();
    if (legacy.length) {
        saveBoard(roomId, { confirmed: legacy });
        try {
            localStorage.removeItem(LEGACY_KEY);
        } catch {
            /* ignore */
        }
    }
    setLastBoardId(roomId);
    return roomId;
}

type LegacyColor = { fillColor?: string };
type LegacyStroke = { strokeColor?: string };
type LegacyWidth = { strokeWidth?: number };
interface LegacyData {
    arrow?: { id: string; points: number[]; color?: LegacyColor; strokeColor?: LegacyStroke; strokeWidth?: LegacyWidth }[];
    rect?: { id: string; x: number; y: number; width: number; height: number; color?: LegacyColor; strokeColor?: LegacyStroke; strokeWidth?: LegacyWidth }[];
    circle?: { id: string; x: number; y: number; radius: number; color?: LegacyColor; strokeColor?: LegacyStroke; strokeWidth?: LegacyWidth }[];
    scribble?: { id: string; points: number[]; strokeColor?: LegacyStroke; strokeWidth?: LegacyWidth }[];
    text?: { id: string; x?: number; y?: number; text: string }[];
}

const num = (v: unknown, fallback = 0) => (typeof v === 'number' && Number.isFinite(v) ? v : fallback);
const hex = (v: unknown, fallback: string) => (typeof v === 'string' && /^#([0-9a-fA-F]{3}|[0-9a-fA-F]{4}|[0-9a-fA-F]{6}|[0-9a-fA-F]{8})$/.test(v) ? v : fallback);

/** Converts the old `whiteboardData` format. Exported for tests. */
export function convertLegacy(data: LegacyData): Shape[] {
    const shapes: Shape[] = [];
    let z = 1;
    const base = (id: string) => ({
        id,
        rotation: 0,
        opacity: 1,
        z: z++,
        updatedAt: Date.now(),
        createdBy: 'user:legacy',
    });
    for (const r of data.rect ?? []) {
        const x = r.width < 0 ? r.x + r.width : r.x;
        const y = r.height < 0 ? r.y + r.height : r.y;
        shapes.push({
            ...base(r.id),
            type: 'rect',
            x: num(x),
            y: num(y),
            width: Math.abs(num(r.width)),
            height: Math.abs(num(r.height)),
            strokeColor: hex(r.strokeColor?.strokeColor, DEFAULTS.strokeColor),
            strokeWidth: num(r.strokeWidth?.strokeWidth, 2),
            fillColor: legacyFill(r.color?.fillColor),
        });
    }
    for (const c of data.circle ?? []) {
        const radius = Math.abs(num(c.radius));
        shapes.push({
            ...base(c.id),
            type: 'ellipse',
            x: num(c.x) - radius,
            y: num(c.y) - radius,
            width: radius * 2,
            height: radius * 2,
            strokeColor: hex(c.strokeColor?.strokeColor, DEFAULTS.strokeColor),
            strokeWidth: num(c.strokeWidth?.strokeWidth, 2),
            fillColor: legacyFill(c.color?.fillColor),
        });
    }
    for (const a of data.arrow ?? []) {
        if (!Array.isArray(a.points) || a.points.length < 4) continue;
        const [x0, y0] = a.points;
        shapes.push({
            ...base(a.id),
            type: 'arrow',
            x: num(x0),
            y: num(y0),
            points: a.points.map((v, i) => num(v) - (i % 2 === 0 ? num(x0) : num(y0))),
            strokeColor: hex(a.strokeColor?.strokeColor, DEFAULTS.strokeColor),
            strokeWidth: num(a.strokeWidth?.strokeWidth, 2),
            fillColor: 'transparent',
        });
    }
    for (const s of data.scribble ?? []) {
        if (!Array.isArray(s.points) || s.points.length < 2) continue;
        const [x0, y0] = s.points;
        shapes.push({
            ...base(s.id),
            type: 'freehand',
            x: num(x0),
            y: num(y0),
            points: s.points.map((v, i) => num(v) - (i % 2 === 0 ? num(x0) : num(y0))),
            strokeColor: hex(s.strokeColor?.strokeColor, DEFAULTS.strokeColor),
            strokeWidth: num(s.strokeWidth?.strokeWidth, 2),
            fillColor: 'transparent',
        });
    }
    for (const t of data.text ?? []) {
        if (typeof t.text !== 'string' || !t.text) continue;
        shapes.push({
            ...base(t.id),
            type: 'text',
            x: num(t.x),
            y: num(t.y),
            text: t.text,
            fontSize: 20,
            fontWeight: 'normal',
            align: 'left',
            strokeColor: DEFAULTS.strokeColor,
            strokeWidth: 0,
            fillColor: 'transparent',
        });
    }
    return shapes;
}

// The old default fill was white, which hid everything behind shapes.
const legacyFill = (fill: string | undefined) => (fill && fill.toUpperCase() !== '#FFFFFF' ? hex(fill, 'transparent') : 'transparent');

function migrateLegacyBoard(): Shape[] {
    const raw = safeGet(LEGACY_KEY);
    if (!raw) return [];
    try {
        return convertLegacy(JSON.parse(raw) as LegacyData);
    } catch {
        return [];
    }
}
