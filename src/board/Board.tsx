import type Konva from 'konva';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Layer, Rect, Stage, Transformer } from 'react-konva';
import { getShapeBounds, isBindable, isLinear, resolveLinePoints, unionBoxes, type Box } from '@/shared/geometry';
import { sortByZ } from '@/shared/ops';
import type { EllipseShape, FreehandShape, ImageShape, LineShape, RectShape, DiamondShape, ShapePatch } from '@/shared/protocol';
import { browserMeasurer } from './measure';
import { fileToImageData, makeShape } from './shapeFactory';
import { ShapeNode } from './shapes/ShapeNode';
import { useBoard, type Tool } from './store';
import { TextEditor } from './TextEditor';
import { useAiActivityClock } from '@/components/aiActivity';

type Interaction =
    | { kind: 'create-box'; id: string; startX: number; startY: number }
    | { kind: 'create-line'; id: string; startX: number; startY: number; startBinding?: string }
    | { kind: 'draw'; id: string; originX: number; originY: number; lastX: number; lastY: number }
    | { kind: 'erase'; erased: Set<string> }
    | { kind: 'marquee'; startX: number; startY: number; additive: boolean }
    | { kind: 'pan'; startClientX: number; startClientY: number; startViewportX: number; startViewportY: number };

const MIN_SCALE = 0.1;
const MAX_SCALE = 8;

const TOOL_CURSORS: Record<Tool, string> = {
    select: 'default',
    hand: 'grab',
    rect: 'crosshair',
    ellipse: 'crosshair',
    diamond: 'crosshair',
    arrow: 'crosshair',
    line: 'crosshair',
    pencil: 'crosshair',
    text: 'text',
    math: 'text',
    eraser: 'cell',
};

const SHORTCUTS: Record<string, Tool> = {
    v: 'select',
    h: 'hand',
    r: 'rect',
    o: 'ellipse',
    d: 'diamond',
    a: 'arrow',
    l: 'line',
    p: 'pencil',
    t: 'text',
    m: 'math',
    e: 'eraser',
};

export interface BoardHandle {
    exportPng: () => Promise<string | null>;
    zoomToFit: (box?: Box) => void;
    addImage: (file: File) => Promise<void>;
}

function findShapeId(target: Konva.Node | null): string | null {
    let node: Konva.Node | null = target;
    while (node) {
        if (node.hasName('shape')) return node.id();
        node = node.getParent();
    }
    return null;
}

export function Board({ onReady }: { onReady?: (handle: BoardHandle) => void }) {
    const shapes = useBoard((s) => s.shapes);
    const tool = useBoard((s) => s.tool);
    const viewport = useBoard((s) => s.viewport);
    const selectedIds = useBoard((s) => s.selectedIds);
    const editing = useBoard((s) => s.editing);

    const stageRef = useRef<Konva.Stage>(null);
    const shapesLayerRef = useRef<Konva.Layer>(null);
    const transformerRef = useRef<Konva.Transformer>(null);
    const interaction = useRef<Interaction | null>(null);
    /** Recent pointer-down positions; Konva's dblclick ignores distance, so we check it ourselves. */
    const recentDowns = useRef<{ x: number; y: number; t: number }[]>([]);
    const [marquee, setMarquee] = useState<Box | null>(null);
    const [size, setSize] = useState({ width: window.innerWidth, height: window.innerHeight });
    const [spaceHeld, setSpaceHeld] = useState(false);
    const [panning, setPanning] = useState(false);
    // Konva caches text metrics; re-create text nodes once the web font is ready.
    const [fontEpoch, setFontEpoch] = useState(0);

    useEffect(() => {
        let cancelled = false;
        Promise.all([document.fonts.load('16px Inter'), document.fonts.load('bold 16px Inter')])
            .catch(() => undefined)
            .then(() => !cancelled && setFontEpoch(1));
        return () => {
            cancelled = true;
        };
    }, []);

    const sorted = useMemo(() => sortByZ(shapes.values()), [shapes]);
    const getShape = useCallback((id: string) => useBoard.getState().shapes.get(id), []);

    useEffect(() => {
        const onResize = () => setSize({ width: window.innerWidth, height: window.innerHeight });
        window.addEventListener('resize', onResize);
        return () => window.removeEventListener('resize', onResize);
    }, []);

    /* ---------- coordinates ---------- */

    const boardPointer = useCallback((): { x: number; y: number } | null => {
        const stage = stageRef.current;
        const pos = stage?.getPointerPosition();
        if (!stage || !pos) return null;
        const { viewport: vp } = useBoard.getState();
        return { x: (pos.x - vp.x) / vp.scale, y: (pos.y - vp.y) / vp.scale };
    }, []);

    const bindableAt = useCallback((x: number, y: number, excludeId?: string): string | undefined => {
        const all = sortByZ(useBoard.getState().shapes.values());
        for (let i = all.length - 1; i >= 0; i--) {
            const s = all[i];
            if (s.id === excludeId || !isBindable(s)) continue;
            const b = getShapeBounds(s, getShape, browserMeasurer);
            if (x >= b.x && x <= b.x + b.width && y >= b.y && y <= b.y + b.height) return s.id;
        }
        return undefined;
    }, [getShape]);

    const zoomToFit = useCallback((box?: Box) => {
        const state = useBoard.getState();
        const target =
            box ?? unionBoxes(Array.from(state.shapes.values()).map((s) => getShapeBounds(s, (id) => state.shapes.get(id), browserMeasurer)));
        if (!target) {
            state.setViewport({ x: 0, y: 0, scale: 1 });
            return;
        }
        // Keep content clear of the toolbar (top) and the style panel (left) on wide screens.
        const padLeft = window.innerWidth >= 768 ? 280 : 24;
        const padRight = window.innerWidth >= 768 ? 60 : 24;
        const padTop = 90;
        const padBottom = 80;
        const availW = Math.max(100, window.innerWidth - padLeft - padRight);
        const availH = Math.max(100, window.innerHeight - padTop - padBottom);
        const scale = Math.min(MAX_SCALE, Math.max(MIN_SCALE, Math.min(availW / Math.max(target.width, 1), availH / Math.max(target.height, 1), 1)));
        state.setViewport({
            scale,
            x: padLeft + availW / 2 - (target.x + target.width / 2) * scale,
            y: padTop + availH / 2 - (target.y + target.height / 2) * scale,
        });
    }, []);

    /* ---------- export / images ---------- */

    const exportPng = useCallback(async () => {
        const layer = shapesLayerRef.current;
        const state = useBoard.getState();
        const bounds = unionBoxes(Array.from(state.shapes.values()).map((s) => getShapeBounds(s, (id) => state.shapes.get(id), browserMeasurer)));
        if (!layer || !bounds) return null;
        const pad = 24;
        const vp = state.viewport;
        const pixelRatio = Math.min(2 / vp.scale, 8000 / Math.max((bounds.width + pad * 2) * vp.scale, 1));
        const rect = {
            x: (bounds.x - pad) * vp.scale + vp.x,
            y: (bounds.y - pad) * vp.scale + vp.y,
            width: (bounds.width + pad * 2) * vp.scale,
            height: (bounds.height + pad * 2) * vp.scale,
        };
        const content = layer.toCanvas({ ...rect, pixelRatio });
        const out = document.createElement('canvas');
        out.width = content.width;
        out.height = content.height;
        const ctx = out.getContext('2d')!;
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, out.width, out.height);
        ctx.drawImage(content, 0, 0);
        return out.toDataURL('image/png');
    }, []);

    const addImage = useCallback(async (file: File) => {
        const state = useBoard.getState();
        try {
            const { src, width, height } = await fileToImageData(file);
            const vp = state.viewport;
            const displayScale = Math.min(1, 480 / Math.max(width, height));
            const w = width * displayScale;
            const h = height * displayScale;
            const cx = (window.innerWidth / 2 - vp.x) / vp.scale;
            const cy = (window.innerHeight / 2 - vp.y) / vp.scale;
            const shape = makeShape<ImageShape>({ type: 'image', src, x: cx - w / 2, y: cy - h / 2, width: w, height: h, strokeWidth: 0, fillColor: 'transparent' });
            state.dispatch({ kind: 'add', shapes: [shape] });
            useBoard.setState({ tool: 'select', selectedIds: [shape.id] });
        } catch (err) {
            state.notify(err instanceof Error ? err.message : 'Could not add image', 'error');
        }
    }, []);

    useEffect(() => {
        onReady?.({ exportPng, zoomToFit, addImage });
    }, [onReady, exportPng, zoomToFit, addImage]);

    /* ---------- transformer ---------- */

    useEffect(() => {
        const tr = transformerRef.current;
        const stage = stageRef.current;
        if (!tr || !stage) return;
        const nodes = selectedIds
            .map((id) => {
                const shape = shapes.get(id);
                // Bound connectors follow their shapes; they can't be resized directly.
                if (!shape || (isLinear(shape) && (shape.startBinding || shape.endBinding))) return null;
                if (editing && 'shapeId' in editing && editing.shapeId === id) return null;
                return stage.findOne(`#${id}`);
            })
            .filter((n): n is Konva.Node => !!n);
        tr.nodes(tool === 'select' ? nodes : []);
        const textLike = selectedIds.some((id) => {
            const t = shapes.get(id)?.type;
            return t === 'text' || t === 'math' || t === 'image';
        });
        tr.keepRatio(textLike);
        tr.enabledAnchors(textLike ? ['top-left', 'top-right', 'bottom-left', 'bottom-right'] : ['top-left', 'top-center', 'top-right', 'middle-right', 'middle-left', 'bottom-left', 'bottom-center', 'bottom-right']);
        tr.getLayer()?.batchDraw();
    }, [selectedIds, shapes, tool, editing, fontEpoch]);

    /* ---------- pointer handling ---------- */

    const eraseAtPointer = useCallback((erased: Set<string>) => {
        const stage = stageRef.current;
        const pos = stage?.getPointerPosition();
        if (!stage || !pos) return;
        const hits = new Set<string>();
        // Sample a small neighbourhood so thin strokes are easy to hit.
        for (const [dx, dy] of [[0, 0], [4, 0], [-4, 0], [0, 4], [0, -4]]) {
            const id = findShapeId(stage.getIntersection({ x: pos.x + dx, y: pos.y + dy }));
            if (id && !erased.has(id)) hits.add(id);
        }
        if (hits.size) {
            hits.forEach((id) => erased.add(id));
            useBoard.getState().dispatch({ kind: 'delete', ids: Array.from(hits) });
        }
    }, []);

    const onPointerDown = useCallback(
        (e: Konva.KonvaEventObject<PointerEvent>) => {
            const state = useBoard.getState();
            const evt = e.evt;
            recentDowns.current = [...recentDowns.current.slice(-1), { x: evt.clientX, y: evt.clientY, t: Date.now() }];
            if (state.editing) return; // Blur of the editor commits it.
            if (evt.button === 2) return;
            const pos = boardPointer();
            if (!pos) return;

            if (evt.button === 1 || spaceHeld || state.tool === 'hand') {
                interaction.current = { kind: 'pan', startClientX: evt.clientX, startClientY: evt.clientY, startViewportX: state.viewport.x, startViewportY: state.viewport.y };
                setPanning(true);
                return;
            }

            const targetId = findShapeId(e.target);
            switch (state.tool) {
                case 'select': {
                    if (e.target.getParent()?.getClassName() === 'Transformer') return;
                    if (targetId) {
                        if (evt.shiftKey) {
                            state.setSelection(state.selectedIds.includes(targetId) ? state.selectedIds.filter((id) => id !== targetId) : [...state.selectedIds, targetId]);
                        } else if (!state.selectedIds.includes(targetId)) {
                            state.setSelection([targetId]);
                        }
                        return;
                    }
                    if (!evt.shiftKey) state.setSelection([]);
                    interaction.current = { kind: 'marquee', startX: pos.x, startY: pos.y, additive: evt.shiftKey };
                    setMarquee({ x: pos.x, y: pos.y, width: 0, height: 0 });
                    return;
                }
                case 'rect':
                case 'ellipse':
                case 'diamond': {
                    const shape = makeShape<RectShape | EllipseShape | DiamondShape>({
                        type: state.tool,
                        x: pos.x,
                        y: pos.y,
                        width: 0,
                        height: 0,
                        ...(state.tool === 'rect' ? { cornerRadius: 6 } : {}),
                    } as never);
                    state.dispatch({ kind: 'add', shapes: [shape] });
                    interaction.current = { kind: 'create-box', id: shape.id, startX: pos.x, startY: pos.y };
                    return;
                }
                case 'arrow':
                case 'line': {
                    const startBinding = bindableAt(pos.x, pos.y);
                    const shape = makeShape<LineShape>({
                        type: state.tool,
                        x: pos.x,
                        y: pos.y,
                        points: [0, 0, 0, 0],
                        fillColor: 'transparent',
                    });
                    state.dispatch({ kind: 'add', shapes: [shape] });
                    interaction.current = { kind: 'create-line', id: shape.id, startX: pos.x, startY: pos.y, startBinding };
                    return;
                }
                case 'pencil': {
                    const shape = makeShape<FreehandShape>({ type: 'freehand', x: pos.x, y: pos.y, points: [0, 0], fillColor: 'transparent' });
                    state.dispatch({ kind: 'add', shapes: [shape] });
                    interaction.current = { kind: 'draw', id: shape.id, originX: pos.x, originY: pos.y, lastX: pos.x, lastY: pos.y };
                    return;
                }
                case 'text': {
                    const existing = targetId ? state.shapes.get(targetId) : undefined;
                    if (existing?.type === 'text') state.setEditing({ kind: 'text', shapeId: existing.id });
                    else state.setEditing({ kind: 'new-text', x: pos.x, y: pos.y });
                    return;
                }
                case 'math': {
                    const existing = targetId ? state.shapes.get(targetId) : undefined;
                    if (existing?.type === 'math') state.setEditing({ kind: 'math', shapeId: existing.id });
                    else state.setEditing({ kind: 'new-math', x: pos.x, y: pos.y });
                    return;
                }
                case 'eraser': {
                    const erased = new Set<string>();
                    interaction.current = { kind: 'erase', erased };
                    eraseAtPointer(erased);
                    return;
                }
            }
        },
        [bindableAt, boardPointer, eraseAtPointer, spaceHeld],
    );

    const onPointerMove = useCallback(
        (e: Konva.KonvaEventObject<PointerEvent>) => {
            const current = interaction.current;
            if (!current) return;
            const state = useBoard.getState();
            if (current.kind === 'pan') {
                state.setViewport({
                    ...state.viewport,
                    x: current.startViewportX + e.evt.clientX - current.startClientX,
                    y: current.startViewportY + e.evt.clientY - current.startClientY,
                });
                return;
            }
            const pos = boardPointer();
            if (!pos) return;
            switch (current.kind) {
                case 'create-box': {
                    let w = pos.x - current.startX;
                    let h = pos.y - current.startY;
                    if (e.evt.shiftKey) {
                        const side = Math.max(Math.abs(w), Math.abs(h));
                        w = Math.sign(w || 1) * side;
                        h = Math.sign(h || 1) * side;
                    }
                    state.dispatch({
                        kind: 'update',
                        patches: [{ id: current.id, changes: { x: Math.min(current.startX, current.startX + w), y: Math.min(current.startY, current.startY + h), width: Math.abs(w), height: Math.abs(h) } }],
                    });
                    return;
                }
                case 'create-line': {
                    let dx = pos.x - current.startX;
                    let dy = pos.y - current.startY;
                    if (e.evt.shiftKey) {
                        const angle = Math.round(Math.atan2(dy, dx) / (Math.PI / 12)) * (Math.PI / 12);
                        const len = Math.hypot(dx, dy);
                        dx = Math.cos(angle) * len;
                        dy = Math.sin(angle) * len;
                    }
                    state.dispatch({ kind: 'update', patches: [{ id: current.id, changes: { points: [0, 0, dx, dy] } }] });
                    return;
                }
                case 'draw': {
                    const minDist = 1.5 / state.viewport.scale;
                    if (Math.hypot(pos.x - current.lastX, pos.y - current.lastY) < minDist) return;
                    current.lastX = pos.x;
                    current.lastY = pos.y;
                    const round = (v: number) => Math.round(v * 100) / 100;
                    state.dispatch({ kind: 'append-points', id: current.id, points: [round(pos.x - current.originX), round(pos.y - current.originY)] });
                    return;
                }
                case 'erase':
                    eraseAtPointer(current.erased);
                    return;
                case 'marquee':
                    setMarquee({
                        x: Math.min(current.startX, pos.x),
                        y: Math.min(current.startY, pos.y),
                        width: Math.abs(pos.x - current.startX),
                        height: Math.abs(pos.y - current.startY),
                    });
                    return;
            }
        },
        [boardPointer, eraseAtPointer],
    );

    const finishInteraction = useCallback(() => {
        const current = interaction.current;
        interaction.current = null;
        if (!current) return;
        const state = useBoard.getState();
        switch (current.kind) {
            case 'pan':
                setPanning(false);
                return;
            case 'create-box': {
                const shape = state.shapes.get(current.id);
                if (shape && 'width' in shape && 'height' in shape && Math.abs(shape.width ?? 0) < 4 && Math.abs(shape.height) < 4) {
                    state.dispatch({ kind: 'delete', ids: [current.id] });
                }
                return;
            }
            case 'create-line': {
                const shape = state.shapes.get(current.id);
                if (!shape || !isLinear(shape)) return;
                const [, , dx, dy] = shape.points;
                if (Math.hypot(dx, dy) < 4) {
                    state.dispatch({ kind: 'delete', ids: [current.id] });
                    return;
                }
                const endBinding = bindableAt(shape.x + dx, shape.y + dy, current.startBinding);
                const changes: ShapePatch['changes'] = {};
                if (current.startBinding) changes.startBinding = { shapeId: current.startBinding };
                if (endBinding) changes.endBinding = { shapeId: endBinding };
                if (Object.keys(changes).length) state.dispatch({ kind: 'update', patches: [{ id: current.id, changes }] });
                return;
            }
            case 'marquee': {
                setMarquee(null);
                const box = marqueeRef.current;
                if (!box || (box.width < 2 && box.height < 2)) return;
                const inside = sortByZ(state.shapes.values())
                    .filter((s) => {
                        const b = getShapeBounds(s, (id) => state.shapes.get(id), browserMeasurer);
                        return b.x >= box.x && b.y >= box.y && b.x + b.width <= box.x + box.width && b.y + b.height <= box.y + box.height;
                    })
                    .map((s) => s.id);
                state.setSelection(current.additive ? Array.from(new Set([...state.selectedIds, ...inside])) : inside);
                return;
            }
            default:
                return;
        }
    }, [bindableAt]);

    const marqueeRef = useRef<Box | null>(null);
    marqueeRef.current = marquee;

    useEffect(() => {
        window.addEventListener('pointerup', finishInteraction);
        window.addEventListener('pointercancel', finishInteraction);
        return () => {
            window.removeEventListener('pointerup', finishInteraction);
            window.removeEventListener('pointercancel', finishInteraction);
        };
    }, [finishInteraction]);

    const onDblClick = useCallback(
        (e: Konva.KonvaEventObject<MouseEvent | TouchEvent>) => {
            const state = useBoard.getState();
            if (state.tool !== 'select' && state.tool !== 'text' && state.tool !== 'math') return;
            const [a, b] = recentDowns.current;
            if (!a || !b || Math.hypot(a.x - b.x, a.y - b.y) > 8 || b.t - a.t > 500) return;
            if (e.target.getParent()?.getClassName() === 'Transformer') return;
            const id = findShapeId(e.target);
            const shape = id ? state.shapes.get(id) : undefined;
            if (shape?.type === 'text') state.setEditing({ kind: 'text', shapeId: shape.id });
            else if (shape?.type === 'math') state.setEditing({ kind: 'math', shapeId: shape.id });
            else if (shape && (shape.type === 'rect' || shape.type === 'ellipse' || shape.type === 'diamond' || isLinear(shape))) {
                state.setEditing({ kind: 'label', shapeId: shape.id });
            } else if (!shape) {
                const pos = boardPointer();
                if (pos) state.setEditing({ kind: 'new-text', x: pos.x, y: pos.y });
            }
        },
        [boardPointer],
    );

    const onWheel = useCallback((e: Konva.KonvaEventObject<WheelEvent>) => {
        e.evt.preventDefault();
        const state = useBoard.getState();
        const vp = state.viewport;
        if (e.evt.ctrlKey || e.evt.metaKey) {
            const pointer = stageRef.current?.getPointerPosition() ?? { x: window.innerWidth / 2, y: window.innerHeight / 2 };
            const scale = Math.min(MAX_SCALE, Math.max(MIN_SCALE, vp.scale * Math.exp(-e.evt.deltaY * 0.01)));
            const bx = (pointer.x - vp.x) / vp.scale;
            const by = (pointer.y - vp.y) / vp.scale;
            state.setViewport({ scale, x: pointer.x - bx * scale, y: pointer.y - by * scale });
        } else {
            state.setViewport({ ...vp, x: vp.x - e.evt.deltaX, y: vp.y - e.evt.deltaY });
        }
    }, []);

    /* ---------- dragging & transforming shapes ---------- */

    const dragPatches = useCallback((stage: Konva.Stage, draggedId: string): ShapePatch[] => {
        const state = useBoard.getState();
        const ids = state.selectedIds.includes(draggedId) ? state.selectedIds : [draggedId];
        const patches: ShapePatch[] = [];
        for (const id of ids) {
            const shape = state.shapes.get(id);
            const node = stage.findOne(`#${id}`);
            if (!shape || !node) continue;
            if (isLinear(shape) && (shape.startBinding || shape.endBinding)) continue;
            if (node.x() !== shape.x || node.y() !== shape.y) patches.push({ id, changes: { x: node.x(), y: node.y() } });
        }
        return patches;
    }, []);

    const onShapeDragMove = useCallback(
        (e: Konva.KonvaEventObject<DragEvent>) => {
            const stage = stageRef.current;
            if (!stage) return;
            const patches = dragPatches(stage, e.target.id());
            if (patches.length) useBoard.getState().dispatch({ kind: 'update', patches });
        },
        [dragPatches],
    );

    const onShapeDragEnd = useCallback(
        (e: Konva.KonvaEventObject<DragEvent>) => {
            const stage = stageRef.current;
            if (!stage) return;
            const state = useBoard.getState();
            const patches = dragPatches(stage, e.target.id());
            const ids = state.selectedIds.includes(e.target.id()) ? state.selectedIds : [e.target.id()];
            // Dragging a connector detaches it from its shapes.
            for (const id of ids) {
                const shape = state.shapes.get(id);
                const node = stage.findOne(`#${id}`);
                if (!shape || !node || !isLinear(shape) || !(shape.startBinding || shape.endBinding)) continue;
                if (node.x() === 0 && node.y() === 0) continue;
                const abs = resolveLinePoints(shape, (sid) => state.shapes.get(sid));
                const x = abs[0] + node.x();
                const y = abs[1] + node.y();
                patches.push({
                    id,
                    changes: { x, y, points: abs.map((v, i) => v - (i % 2 === 0 ? abs[0] : abs[1])), startBinding: null, endBinding: null },
                });
            }
            if (patches.length) state.dispatch({ kind: 'update', patches });
        },
        [dragPatches],
    );

    const onShapeTransformEnd = useCallback((e: Konva.KonvaEventObject<Event>) => {
        const node = e.target;
        const state = useBoard.getState();
        const shape = state.shapes.get(node.id());
        if (!shape) return;
        const sx = node.scaleX();
        const sy = node.scaleY();
        node.scaleX(1);
        node.scaleY(1);
        const round = (v: number) => Math.round(v * 100) / 100;
        const base = { x: round(node.x()), y: round(node.y()), rotation: round(node.rotation()) };
        let changes: ShapePatch['changes'];
        switch (shape.type) {
            case 'rect':
            case 'ellipse':
            case 'diamond':
            case 'image':
                changes = { ...base, width: Math.max(2, round(shape.width * sx)), height: Math.max(2, round(shape.height * sy)) };
                break;
            case 'text':
                changes = { ...base, fontSize: Math.min(400, Math.max(4, shape.fontSize * sy)), ...(shape.width ? { width: shape.width * sx } : {}) };
                break;
            case 'math':
                changes = { ...base, fontSize: Math.min(400, Math.max(4, shape.fontSize * sy)) };
                break;
            case 'freehand':
            case 'line':
            case 'arrow':
                changes = { ...base, points: shape.points.map((v, i) => Math.round(v * (i % 2 === 0 ? sx : sy) * 100) / 100) };
                break;
        }
        state.dispatch({ kind: 'update', patches: [{ id: shape.id, changes }] });
    }, []);

    /* ---------- keyboard ---------- */

    useEffect(() => {
        const isTyping = (target: EventTarget | null) =>
            target instanceof HTMLElement && (target.isContentEditable || ['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName));
        const onKeyDown = (e: KeyboardEvent) => {
            if (isTyping(e.target)) return;
            const state = useBoard.getState();
            if (e.code === 'Space') {
                setSpaceHeld(true);
                e.preventDefault();
                return;
            }
            if ((e.key === 'Delete' || e.key === 'Backspace') && state.selectedIds.length) {
                e.preventDefault();
                state.dispatch({ kind: 'delete', ids: state.selectedIds });
                return;
            }
            if (e.key === 'Escape') {
                state.setSelection([]);
                return;
            }
            if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'a') {
                e.preventDefault();
                useBoard.setState({ tool: 'select', selectedIds: Array.from(state.shapes.keys()) });
                return;
            }
            if ((e.ctrlKey || e.metaKey) && (e.key === '=' || e.key === '+' || e.key === '-' || e.key === '0')) {
                e.preventDefault();
                const vp = state.viewport;
                const scale = e.key === '0' ? 1 : Math.min(MAX_SCALE, Math.max(MIN_SCALE, vp.scale * (e.key === '-' ? 1 / 1.2 : 1.2)));
                const cx = window.innerWidth / 2;
                const cy = window.innerHeight / 2;
                state.setViewport({ scale, x: cx - ((cx - vp.x) / vp.scale) * scale, y: cy - ((cy - vp.y) / vp.scale) * scale });
                return;
            }
            if (e.shiftKey && e.key === '!') {
                zoomToFit();
                return;
            }
            if (!e.ctrlKey && !e.metaKey && !e.altKey && SHORTCUTS[e.key.toLowerCase()]) {
                state.setTool(SHORTCUTS[e.key.toLowerCase()]);
            }
        };
        const onKeyUp = (e: KeyboardEvent) => {
            if (e.code === 'Space') setSpaceHeld(false);
        };
        window.addEventListener('keydown', onKeyDown);
        window.addEventListener('keyup', onKeyUp);
        return () => {
            window.removeEventListener('keydown', onKeyDown);
            window.removeEventListener('keyup', onKeyUp);
        };
    }, [zoomToFit]);

    /* ---------- render ---------- */

    // Briefly outline shapes the AI just added or changed.
    const { activity: aiActivity, now: aiNow } = useAiActivityClock(2500);
    const aiHighlights =
        aiActivity && aiNow - aiActivity.at < 2500
            ? aiActivity.shapeIds
                  .map((id) => shapes.get(id))
                  .filter((s) => !!s)
                  .map((s) => ({ id: s!.id, box: getShapeBounds(s!, (id) => shapes.get(id), browserMeasurer) }))
            : [];

    const hiddenId = editing && (editing.kind === 'text' || editing.kind === 'math') ? editing.shapeId : null;
    const labelHiddenId = editing && editing.kind === 'label' ? editing.shapeId : null;
    const cursor = panning ? 'grabbing' : spaceHeld ? 'grab' : TOOL_CURSORS[tool];

    return (
        <div className="absolute inset-0 overflow-hidden bg-white" style={{ cursor, touchAction: 'none' }} data-testid="board">
            <Stage
                ref={stageRef}
                width={size.width}
                height={size.height}
                x={viewport.x}
                y={viewport.y}
                scaleX={viewport.scale}
                scaleY={viewport.scale}
                onPointerDown={onPointerDown}
                onPointerMove={onPointerMove}
                onDblClick={onDblClick}
                onDblTap={onDblClick}
                onWheel={onWheel}
                onContextMenu={(e) => e.evt.preventDefault()}
            >
                <Layer ref={shapesLayerRef} key={fontEpoch}>
                    {sorted.map((shape) => (
                        <ShapeNode
                            key={shape.id}
                            shape={shape}
                            startTarget={isLinear(shape) && shape.startBinding ? shapes.get(shape.startBinding.shapeId) : undefined}
                            endTarget={isLinear(shape) && shape.endBinding ? shapes.get(shape.endBinding.shapeId) : undefined}
                            draggable={tool === 'select' && !spaceHeld}
                            hidden={shape.id === hiddenId}
                            hideLabel={shape.id === labelHiddenId}
                            onDragMove={onShapeDragMove}
                            onDragEnd={onShapeDragEnd}
                            onTransformEnd={onShapeTransformEnd}
                        />
                    ))}
                </Layer>
                <Layer>
                    <Transformer
                        ref={transformerRef}
                        rotateEnabled
                        flipEnabled={false}
                        ignoreStroke
                        anchorSize={9}
                        borderStroke="#6366f1"
                        anchorStroke="#6366f1"
                        anchorCornerRadius={2}
                        boundBoxFunc={(oldBox, newBox) => (Math.abs(newBox.width) < 5 || Math.abs(newBox.height) < 5 ? oldBox : newBox)}
                    />
                    {aiHighlights.map(({ id, box }) => (
                        <Rect
                            key={`ai-${id}`}
                            x={box.x - 6 / viewport.scale}
                            y={box.y - 6 / viewport.scale}
                            width={box.width + 12 / viewport.scale}
                            height={box.height + 12 / viewport.scale}
                            stroke="#818cf8"
                            strokeWidth={2 / viewport.scale}
                            dash={[6 / viewport.scale, 4 / viewport.scale]}
                            cornerRadius={4 / viewport.scale}
                            opacity={Math.max(0, 1 - (aiNow - aiActivity!.at) / 2500)}
                            listening={false}
                        />
                    ))}
                    {marquee && (
                        <Rect
                            x={marquee.x}
                            y={marquee.y}
                            width={marquee.width}
                            height={marquee.height}
                            fill="rgba(99,102,241,0.08)"
                            stroke="#6366f1"
                            strokeWidth={1 / viewport.scale}
                            listening={false}
                        />
                    )}
                </Layer>
            </Stage>
            {editing && <TextEditor editing={editing} />}
        </div>
    );
}
