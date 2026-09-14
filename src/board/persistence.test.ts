import { beforeEach, describe, expect, it } from 'vitest';
import { isValidRoomId } from '@/shared/protocol';
import { adoptOrphanPending, convertLegacy, createBoard, getLastBoardId, isRenderableShape, loadBoard, saveBoard, savePending } from './persistence';

describe('persistence', () => {
    beforeEach(() => localStorage.clear());

    const rect = { id: 'x', type: 'rect', x: 0, y: 0, width: 1, height: 1, z: 1, rotation: 0, opacity: 1, strokeColor: '#000', strokeWidth: 1, fillColor: 'transparent', updatedAt: 0, createdBy: 'user:a' };

    it('round-trips the confirmed board per room', () => {
        saveBoard('room-a', { confirmed: [rect as never] });
        expect(loadBoard('room-a')).toEqual({ confirmed: [rect] });
        expect(loadBoard('room-b')).toEqual({ confirmed: [] });
    });

    it('reads the previous cache format and ignores corrupt data', () => {
        localStorage.setItem('sketchsync:board:v1', JSON.stringify({ version: 1, shapes: [rect] }));
        expect(loadBoard('v1').confirmed).toHaveLength(1);
        localStorage.setItem('sketchsync:board:bad', '{nope');
        expect(loadBoard('bad')).toEqual({ confirmed: [] });
    });

    it('drops malformed cached shapes instead of crashing the renderer', () => {
        localStorage.setItem('sketchsync:board:mixed', JSON.stringify({ version: 2, confirmed: [rect, { ...rect, id: 'f', type: 'freehand' }, { ...rect, id: 'n', x: 'NaN' }] }));
        expect(loadBoard('mixed')).toEqual({ confirmed: [rect] });
        expect(isRenderableShape({ ...rect, type: 'freehand', points: [0, 0, 1] })).toBe(false);
        expect(isRenderableShape({ ...rect, type: 'freehand', points: [0, 0, 1, 1] })).toBe(true);
    });

    it('keeps pending ops per tab and only adopts ones from closed tabs', async () => {
        const op = { opId: 'c:1', op: { kind: 'clear' as const } };
        savePending('room', 'tab-open', [op]);
        savePending('room', 'tab-closed', [{ opId: 'd:1', op: { kind: 'delete' as const, ids: ['x'] } }], true);
        // Without the Web Locks API we can't tell if an open tab is alive, so it's left alone.
        expect(await adoptOrphanPending('room', 'me')).toEqual([{ opId: 'd:1', op: { kind: 'delete', ids: ['x'] } }]);
        expect(localStorage.getItem('sketchsync:pending:room:tab-closed')).toBeNull();
        expect(localStorage.getItem('sketchsync:pending:room:tab-open')).not.toBeNull();
        // Saving an empty list removes the record.
        savePending('room', 'tab-open', []);
        expect(localStorage.getItem('sketchsync:pending:room:tab-open')).toBeNull();
    });

    it('adopts pending ops from the previous single-tab format once', async () => {
        localStorage.setItem('sketchsync:board:old', JSON.stringify({ version: 2, confirmed: [rect], pending: [{ opId: 'a:1', op: { kind: 'clear' } }] }));
        expect(await adoptOrphanPending('old', 'me')).toEqual([{ opId: 'a:1', op: { kind: 'clear' } }]);
        expect(await adoptOrphanPending('old', 'me')).toEqual([]);
        expect(loadBoard('old').confirmed).toHaveLength(1);
    });

    it('drops images from pending ops when storage is full, keeping other shapes', () => {
        const original = Storage.prototype.setItem;
        let calls = 0;
        Storage.prototype.setItem = function (key: string, value: string) {
            calls++;
            if (value.includes('data:image')) throw new DOMException('full', 'QuotaExceededError');
            return original.call(this, key, value);
        };
        try {
            const image = { ...rect, id: 'img', type: 'image', src: 'data:image/png;base64,AAAA' };
            expect(savePending('q', 'tab', [{ opId: 'c:1', op: { kind: 'add', shapes: [rect as never, image as never] } }])).toBe(true);
            const saved = JSON.parse(localStorage.getItem('sketchsync:pending:q:tab')!);
            expect(saved.ops[0].op.shapes.map((s: { id: string }) => s.id)).toEqual(['x']);
            expect(calls).toBe(2);
        } finally {
            Storage.prototype.setItem = original;
        }
    });

    it('converts the legacy whiteboardData format', () => {
        const shapes = convertLegacy({
            rect: [
                { id: 'r', x: 100, y: 100, width: -50, height: 20, color: { fillColor: '#FFFFFF' }, strokeColor: { strokeColor: '#FF0000' }, strokeWidth: { strokeWidth: 4 } },
                { id: 'r2', x: 0, y: 0, width: 5, height: 5, strokeColor: { strokeColor: '#12345' } },
            ],
            circle: [{ id: 'c', x: 50, y: 50, radius: 10, color: { fillColor: '#ADD8E6' } }],
            arrow: [{ id: 'a', points: [10, 10, 30, 40] }],
            scribble: [{ id: 's', points: [5, 5, 6, 7, 8, 9] }],
            text: [{ id: 't', x: 1, y: 2, text: 'hello' }],
        });
        const byId = Object.fromEntries(shapes.map((s) => [s.id, s]));
        expect(byId.r).toMatchObject({ type: 'rect', x: 50, y: 100, width: 50, height: 20, strokeColor: '#FF0000', strokeWidth: 4, fillColor: 'transparent' });
        expect(byId.r2).toMatchObject({ strokeColor: '#1e1e1e' });
        expect(byId.c).toMatchObject({ type: 'ellipse', x: 40, y: 40, width: 20, height: 20, fillColor: '#ADD8E6' });
        expect(byId.a).toMatchObject({ type: 'arrow', x: 10, y: 10, points: [0, 0, 20, 30] });
        expect(byId.s).toMatchObject({ type: 'freehand', x: 5, y: 5, points: [0, 0, 1, 2, 3, 4] });
        expect(byId.t).toMatchObject({ type: 'text', text: 'hello', fontSize: 20 });
    });

    it('migrates the legacy board into the first created board only', () => {
        localStorage.setItem('whiteboardData', JSON.stringify({ rect: [{ id: 'r', x: 0, y: 0, width: 10, height: 10 }] }));
        const first = createBoard();
        expect(isValidRoomId(first)).toBe(true);
        expect(getLastBoardId()).toBe(first);
        expect(loadBoard(first).confirmed).toHaveLength(1);
        expect(localStorage.getItem('whiteboardData')).toBeNull();
        expect(loadBoard(createBoard()).confirmed).toEqual([]);
    });
});
