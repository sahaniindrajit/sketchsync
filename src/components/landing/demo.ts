import { inverseOf, recordOp } from '@/board/history';
import { usePresence } from '@/board/presence';
import { animateViewport, applyToStore, resetBoardState, useBoard, type Viewport } from '@/board/store';
import { DEFAULTS, type Op, type Shape } from '@/shared/protocol';

/**
 * The landing page is one big board, run by the real board store and canvas. These are its
 * contents, the camera stops, and the scripted AI / teammate, which go through the same paths
 * the app uses for server ops (so the AI cursor, outline, fade-in and Undo toast are the real ones).
 */

export interface Region {
    x: number;
    y: number;
    width: number;
    height: number;
}

/** Camera stops, in scroll order. */
export const REGIONS: Region[] = [
    { x: 0, y: 0, width: 1300, height: 760 }, // hero: your scribble + Claude's plan
    { x: 1700, y: 0, width: 1420, height: 620 }, // a wall of boards
    { x: 0, y: 1120, width: 1420, height: 760 }, // one connector, two boards
    { x: 1700, y: 1120, width: 1420, height: 760 }, // drawing together
    { x: 3500, y: 0, width: 1300, height: 760 }, // what's on the board
];

let z = 1;
const base = (id: string, type: Shape['type'], x: number, y: number, by = 'user:demo') => ({
    id,
    type,
    x,
    y,
    rotation: 0,
    opacity: 1,
    strokeColor: DEFAULTS.strokeColor,
    strokeWidth: 2,
    fillColor: 'transparent',
    z: z++,
    updatedAt: 0,
    createdBy: by,
});

export function rect(id: string, x: number, y: number, width: number, height: number, o: { label?: string; fill?: string; stroke?: string; radius?: number; size?: number; strokeWidth?: number; by?: string } = {}): Shape {
    return {
        ...base(id, 'rect', x, y, o.by),
        width,
        height,
        cornerRadius: o.radius ?? 10,
        fillColor: o.fill ?? 'transparent',
        strokeColor: o.stroke ?? DEFAULTS.strokeColor,
        strokeWidth: o.strokeWidth ?? 2,
        ...(o.label ? { label: { text: o.label, fontSize: o.size ?? 18 } } : {}),
    } as Shape;
}

export function ellipse(id: string, x: number, y: number, width: number, height: number, o: { label?: string; fill?: string; by?: string } = {}): Shape {
    return { ...base(id, 'ellipse', x, y, o.by), width, height, fillColor: o.fill ?? 'transparent', ...(o.label ? { label: { text: o.label, fontSize: 18 } } : {}) } as Shape;
}

export function diamond(id: string, x: number, y: number, width: number, height: number, o: { label?: string; fill?: string; by?: string } = {}): Shape {
    return { ...base(id, 'diamond', x, y, o.by), width, height, fillColor: o.fill ?? 'transparent', ...(o.label ? { label: { text: o.label, fontSize: 16 } } : {}) } as Shape;
}

export function text(id: string, x: number, y: number, value: string, o: { size?: number; bold?: boolean; color?: string; width?: number; by?: string } = {}): Shape {
    return {
        ...base(id, 'text', x, y, o.by),
        strokeColor: o.color ?? DEFAULTS.strokeColor,
        text: value,
        fontSize: o.size ?? 20,
        fontWeight: o.bold ? 'bold' : 'normal',
        align: 'left',
        ...(o.width ? { width: o.width } : {}),
    } as Shape;
}

/** An arrow attached to two shapes (the renderer routes it between their edges). */
export function arrow(id: string, from: Shape, to: Shape, o: { by?: string; label?: string } = {}): Shape {
    const c = (s: Shape) => ('height' in s ? { x: s.x + s.width / 2, y: s.y + s.height / 2 } : { x: s.x, y: s.y });
    const a = c(from);
    const b = c(to);
    return {
        ...base(id, 'arrow', a.x, a.y, o.by),
        points: [0, 0, b.x - a.x, b.y - a.y],
        startBinding: { shapeId: from.id },
        endBinding: { shapeId: to.id },
        ...(o.label ? { label: { text: o.label, fontSize: 14 } } : {}),
    } as Shape;
}

export function freehand(id: string, x: number, y: number, points: number[], o: { color?: string; width?: number; by?: string } = {}): Shape {
    return { ...base(id, 'freehand', x, y, o.by), points, strokeColor: o.color ?? DEFAULTS.strokeColor, strokeWidth: o.width ?? 3 } as Shape;
}

function math(id: string, x: number, y: number, latex: string, size = 34): Shape {
    return { ...base(id, 'math', x, y), latex, fontSize: size, displayMode: true } as Shape;
}

const MUTED = '#868e96';
const CARD = { fill: '#ffffff', stroke: '#dee2e6', radius: 16, strokeWidth: 1.5 };

/** One "board" on the boards wall: a card with a tiny drawing and its name. */
function card(i: number, title: string, meta: string, draw: (x: number, y: number) => Shape[]): Shape[] {
    const col = i % 3;
    const row = Math.floor(i / 3);
    const x = 1720 + col * 470;
    const y = 20 + row * 300;
    return [rect(`card-${i}`, x, y, 430, 270, CARD), ...draw(x + 24, y + 22), text(`card-${i}-t`, x + 24, y + 196, title, { size: 21, bold: true }), text(`card-${i}-m`, x + 24, y + 228, meta, { size: 15, color: MUTED })];
}

/** Onboarding steps, scattered at first; the AI tidies them into a column. */
const ONBOARDING = ['Sign in', 'Create a board', 'Invite your team', 'Connect your AI'];
const MESSY = [
    [800, 1230],
    [1150, 1300],
    [860, 1470],
    [1170, 1560],
];
export const TIDY = ONBOARDING.map((_, i) => [960, 1210 + i * 135]);

export function initialShapes(): Shape[] {
    z = 1;
    const shapes: Shape[] = [];
    // Hero: an invitation to draw.
    shapes.push(text('hint', 110, 290, 'Draw anything here.', { size: 36, color: MUTED }));
    shapes.push(freehand('hint-line', 112, 346, [0, 0, 50, 5, 110, 2, 170, 7, 240, 3, 320, 6], { color: MUTED, width: 2.5 }));

    // A wall of boards.
    const wall: [string, string, (x: number, y: number) => Shape[]][] = [
        ['Q3 planning', 'Edited 2 min ago', (x, y) => [rect('w0a', x, y + 20, 110, 64, { label: 'Launch', fill: '#a5d8ff', size: 15 }), rect('w0b', x + 135, y + 20, 110, 64, { label: 'Accounts', fill: '#b2f2bb', size: 15 }), rect('w0c', x + 270, y + 20, 110, 64, { label: 'AI', fill: '#ffec99', size: 15 })]],
        ['Onboarding', 'Shared with 3 people', (x, y) => { const a = ellipse('w1a', x, y + 30, 120, 60, { label: 'Start', fill: '#b2f2bb' }); const b = rect('w1b', x + 230, y + 30, 140, 60, { label: 'First board', size: 15 }); return [a, b, arrow('w1c', a, b)]; }],
        ['System design', 'Edited yesterday', (x, y) => { const a = rect('w2a', x, y + 10, 100, 54, { label: 'Web', size: 15 }); const b = rect('w2b', x + 140, y + 10, 100, 54, { label: 'API', size: 15, fill: '#a5d8ff' }); const c = rect('w2c', x + 280, y + 10, 100, 54, { label: 'Postgres', size: 14 }); const d = rect('w2d', x + 140, y + 100, 100, 50, { label: 'MCP', size: 15, fill: '#ffd8a8' }); return [a, b, c, d, arrow('w2e', a, b), arrow('w2f', b, c), arrow('w2g', b, d)]; }],
        ['Sprint retro', 'Edited 3 days ago', (x, y) => [rect('w3a', x, y + 10, 84, 70, { fill: '#ffec99', radius: 4 }), rect('w3b', x + 96, y + 10, 84, 70, { fill: '#ffec99', radius: 4 }), rect('w3c', x + 210, y + 10, 84, 70, { fill: '#ffc9c9', radius: 4 }), rect('w3d', x + 306, y + 10, 84, 70, { fill: '#ffc9c9', radius: 4 }), rect('w3e', x, y + 92, 84, 60, { fill: '#ffec99', radius: 4 })]],
        ['Hiring loop', 'View only', (x, y) => { const a = diamond('w4a', x + 130, y, 130, 90, { label: 'Fit?' }); const b = rect('w4b', x, y + 110, 110, 46, { label: 'Pass', size: 15 }); const c = rect('w4c', x + 280, y + 110, 110, 46, { label: 'Onsite', size: 15, fill: '#b2f2bb' }); return [a, b, c, arrow('w4d', a, b), arrow('w4e', a, c)]; }],
        ['Linear algebra', 'Edited last week', (x, y) => [math('w5a', x + 10, y + 30, 'A\\mathbf{x} = \\lambda\\mathbf{x}', 30)]],
    ];
    wall.forEach(([t, m, d], i) => shapes.push(...card(i, t, m, d)));

    // One connector, two boards.
    shapes.push(text('q3-title', 20, 1140, 'Q3 planning', { size: 26, bold: true }));
    shapes.push(rect('q3-frame', 20, 1190, 640, 640, { stroke: '#ced4da', radius: 18, strokeWidth: 1.5 }));
    ['Launch v3', 'Accounts', 'Personal MCP'].forEach((t, i) => shapes.push(rect(`q3-${i}`, 50 + i * 200, 1230, 180, 80, { label: t, fill: '#a5d8ff', size: 17 })));
    shapes.push(text('ob-title', 760, 1140, 'Onboarding', { size: 26, bold: true }));
    shapes.push(rect('ob-frame', 760, 1190, 640, 640, { stroke: '#ced4da', radius: 18, strokeWidth: 1.5 }));
    const steps = ONBOARDING.map((t, i) => rect(`ob-${i}`, MESSY[i][0], MESSY[i][1], 200, 72, { label: t, size: 17, fill: i === 3 ? '#ffd8a8' : 'transparent' }));
    shapes.push(...steps);
    steps.slice(1).forEach((s, i) => shapes.push(arrow(`ob-a${i}`, steps[i], s)));

    // Drawing together.
    shapes.push(text('retro-title', 1720, 1140, 'Sprint retro', { size: 26, bold: true }));
    shapes.push(rect('retro-frame', 1720, 1190, 1380, 660, { stroke: '#ced4da', radius: 18, strokeWidth: 1.5 }));
    shapes.push(text('retro-good', 1770, 1230, 'Went well', { size: 22, bold: true }));
    shapes.push(text('retro-bad', 2440, 1230, 'To improve', { size: 22, bold: true }));
    ['Boards home shipped', 'AI undo works', 'Fewer meetings'].forEach((t, i) => shapes.push(rect(`retro-g${i}`, 1770 + (i % 2) * 300, 1290 + Math.floor(i / 2) * 200, 260, 160, { label: t, fill: '#ffec99', radius: 4, size: 19 })));
    ['Slow cold starts', 'Docs for self-hosting'].forEach((t, i) => shapes.push(rect(`retro-b${i}`, 2440 + i * 300, 1290, 260, 160, { label: t, fill: '#ffc9c9', radius: 4, size: 19 })));

    // What's on the board.
    shapes.push(math('cap-math', 3540, 60, 'e^{i\\pi} + 1 = 0', 44));
    shapes.push(math('cap-math2', 3540, 200, '\\int_0^1 x^2\\,dx = \\tfrac{1}{3}', 34));
    const c1 = ellipse('cap-a', 4200, 60, 170, 70, { label: 'Request', fill: '#b2f2bb' });
    const c2 = diamond('cap-b', 4195, 200, 180, 110, { label: 'Signed in?', fill: '#ffec99' });
    const c3 = rect('cap-c', 4450, 220, 170, 70, { label: 'Open board', fill: '#a5d8ff' });
    const c4 = rect('cap-d', 4200, 400, 170, 70, { label: 'Ask to sign in' });
    shapes.push(c1, c2, c3, c4, arrow('cap-e', c1, c2), arrow('cap-f', c2, c3, { label: 'yes' }), arrow('cap-g', c2, c4, { label: 'no' }));
    shapes.push(text('cap-note', 3540, 420, 'Text wraps where you want it,\nand stays crisp at any zoom.', { size: 24 }));
    shapes.push(freehand('cap-ul', 3540, 500, [0, 0, 60, 6, 130, 2, 200, 8, 280, 3, 340, 7], { color: '#e8590c', width: 3 }));
    return shapes;
}

/** Puts the landing board into the store. Edits stay local to this page. */
export function startDemoBoard() {
    resetBoardState('demo', new Map(initialShapes().map((s) => [s.id, s])));
    useBoard.setState({
        tool: 'pencil',
        role: 'editor',
        connection: 'online',
        dispatch: (op) => {
            recordOp(op, useBoard.getState().shapes);
            applyToStore(op);
        },
    });
    usePresence.setState({ peers: {}, send: () => {}, announce: () => {} });
}

export function stopDemoBoard() {
    resetBoardState(null, new Map());
    useBoard.setState({ dispatch: () => {}, connection: 'connecting' });
    usePresence.setState({ peers: {} });
}

/** Applies an op as if an AI client sent it through the server (same bookkeeping as RoomSync). */
export function aiApply(op: Op, name = 'Claude') {
    const shapes = useBoard.getState().shapes;
    const inverse = inverseOf(op, shapes);
    const ids = op.kind === 'add' ? op.shapes.map((s) => s.id) : op.kind === 'update' ? op.patches.map((p) => p.id) : [];
    const added = op.kind === 'add' ? op.shapes.filter((x) => x.type !== 'arrow' && x.type !== 'line').length : 0;
    const connectors = op.kind === 'add' ? op.shapes.length - added : 0;
    const prev = useBoard.getState().aiActivity;
    const same = prev && prev.name === name && Date.now() - prev.at < 4000;
    useBoard.setState({
        aiActivity: {
            name,
            shapeIds: same ? Array.from(new Set([...prev.shapeIds, ...ids])) : ids,
            at: Date.now(),
            undo: [...(same ? prev.undo : []), ...(inverse ? [inverse] : [])],
            lastIds: ids,
            added: (same ? prev.added : 0) + added,
            connectors: (same ? prev.connectors : 0) + connectors,
        },
    });
    applyToStore(op);
}

/** Runs steps on a timeline; returns a cancel function. */
export function timeline(steps: [number, () => void][]): () => void {
    const timers = steps.map(([at, fn]) => setTimeout(fn, at));
    return () => timers.forEach(clearTimeout);
}

const AI = 'ai:Claude';

/** Claude answers the visitor's scribble with a small plan. */
export function heroScript(): () => void {
    const idea = ellipse('ai-idea', 760, 120, 200, 76, { label: 'Your sketch', fill: '#b2f2bb', by: AI });
    const plan = rect('ai-plan', 760, 300, 200, 76, { label: 'Claude adds to it', fill: '#a5d8ff', by: AI });
    const ship = rect('ai-ship', 760, 480, 200, 76, { label: 'Everyone sees it live', fill: '#ffec99', by: AI });
    return timeline([
        [0, () => aiApply({ kind: 'add', shapes: [idea] })],
        [450, () => aiApply({ kind: 'add', shapes: [plan, arrow('ai-a1', idea, plan, { by: AI })] })],
        [900, () => aiApply({ kind: 'add', shapes: [ship, arrow('ai-a2', plan, ship, { by: AI })] })],
    ]);
}

/** The MCP stop: a risks section on one board, then a tidy-up on another, from one request. */
export function mcpScript(onStep: (step: number) => void): () => void {
    const risks = rect('q3-risks', 50, 1360, 580, 300, { fill: '#fff3bf', radius: 6, by: AI, stroke: '#f08c00' });
    const lines = ['Risks', '• Free hosting sleeps: first load is slow', '• Some MCP apps lack OAuth', '• Boards only cached in old browsers'].map((t, i) =>
        text(`q3-r${i}`, 76, 1385 + i * 52 + (i ? 14 : 0), t, { size: i ? 20 : 24, bold: i === 0, by: AI }),
    );
    const steps: [number, () => void][] = [
        [300, () => onStep(1)],
        [1100, () => onStep(2)],
        [1700, () => onStep(3)],
        [2100, () => aiApply({ kind: 'add', shapes: [risks, lines[0]] })],
        [2500, () => aiApply({ kind: 'add', shapes: lines.slice(1) })],
        [3300, () => onStep(4)],
        [3900, () => onStep(5)],
    ];
    // Glide the scattered steps into a column in a few frames.
    const frames = 8;
    for (let f = 1; f <= frames; f++) {
        steps.push([
            4300 + f * 70,
            () => {
                const t = 1 - Math.pow(1 - f / frames, 3);
                aiApply({
                    kind: 'update',
                    patches: ONBOARDING.map((_, i) => ({ id: `ob-${i}`, changes: { x: MESSY[i][0] + (TIDY[i][0] - MESSY[i][0]) * t, y: MESSY[i][1] + (TIDY[i][1] - MESSY[i][1]) * t } })),
                });
            },
        ]);
    }
    steps.push([5100, () => onStep(6)]);
    return timeline(steps);
}

/** The MCP stop's starting state (so it can replay). */
export function resetMcpStop() {
    const { shapes } = useBoard.getState();
    const next = new Map(shapes);
    for (const id of ['q3-risks', 'q3-r0', 'q3-r1', 'q3-r2', 'q3-r3']) next.delete(id);
    ONBOARDING.forEach((_, i) => {
        const s = next.get(`ob-${i}`);
        if (s) next.set(s.id, { ...s, x: MESSY[i][0], y: MESSY[i][1] });
    });
    useBoard.setState({ shapes: next });
}

/** A teammate circles a sticky note and adds one. */
export function togetherScript(): () => void {
    const peer = (x: number | null, y: number | null) =>
        usePresence.setState({ peers: x === null ? {} : { teammate: { id: 'teammate', name: 'Teammate', color: '#2f9e44', x, y: y!, at: Date.now() } } });
    const cx = 1900;
    const cy = 1370;
    const pts: number[] = [];
    const steps: [number, () => void][] = [[0, () => peer(2300, 1700)], [500, () => peer(cx + 150, cy)]];
    const n = 28;
    for (let i = 0; i <= n; i++) {
        steps.push([
            900 + i * 40,
            () => {
                const a = (i / n) * Math.PI * 2.1 - Math.PI / 2;
                const px = Math.cos(a) * 165;
                const py = Math.sin(a) * 105;
                pts.push(Math.round(px), Math.round(py));
                peer(cx + px, cy + py);
                const shape = freehand('peer-circle', cx, cy, [...pts], { color: '#2f9e44', width: 4, by: 'user:teammate' });
                applyToStore({ kind: 'add', shapes: [shape] });
            },
        ]);
    }
    steps.push([2400, () => peer(2470, 1560)]);
    steps.push([2900, () => applyToStore({ kind: 'add', shapes: [rect('retro-b2', 2440, 1490, 260, 160, { label: 'Keep doing this', fill: '#b2f2bb', radius: 4, size: 19, by: 'user:teammate' })] })]);
    steps.push([3600, () => peer(2600, 1720)]);
    return timeline(steps);
}

export function resetTogetherStop() {
    const next = new Map(useBoard.getState().shapes);
    next.delete('peer-circle');
    next.delete('retro-b2');
    useBoard.setState({ shapes: next });
    usePresence.setState({ peers: {} });
}

/** Viewport that shows `region` inside the part of the screen the canvas owns at this width. */
export function fitRegion(region: Region, w = window.innerWidth, h = window.innerHeight): Viewport {
    const wide = w >= 1024;
    const area = wide ? { x: w * 0.44, y: 96, width: w * 0.56 - 40, height: h - 150 } : { x: 12, y: 76, width: w - 24, height: h * 0.42 - 70 };
    const scale = Math.min(1.1, area.width / region.width, area.height / region.height);
    return {
        scale,
        x: area.x + (area.width - region.width * scale) / 2 - region.x * scale,
        y: area.y + (area.height - region.height * scale) / 2 - region.y * scale,
    };
}

export function goToStop(stop: number, ms = 900) {
    animateViewport(fitRegion(REGIONS[Math.max(0, Math.min(REGIONS.length - 1, stop))]), ms);
}
