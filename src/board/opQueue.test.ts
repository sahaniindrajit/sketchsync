import { describe, expect, it } from 'vitest';
import { canMerge, isUrgent, mergeOps } from './opQueue';

describe('op merging', () => {
    it('merges consecutive updates per shape (later fields win)', () => {
        const a = { kind: 'update', patches: [{ id: 'a', changes: { x: 1, y: 1 } }] } as const;
        const b = { kind: 'update', patches: [{ id: 'a', changes: { x: 2 } }, { id: 'b', changes: { x: 5 } }] } as const;
        expect(canMerge(a, b)).toBe(true);
        expect(mergeOps(a, b)).toEqual({ kind: 'update', patches: [{ id: 'a', changes: { x: 2, y: 1 } }, { id: 'b', changes: { x: 5 } }] });
    });

    it('concatenates point appends to the same stroke only', () => {
        const a = { kind: 'append-points', id: 's', points: [1, 1] } as const;
        expect(mergeOps(a, { kind: 'append-points', id: 's', points: [2, 2] })).toEqual({ kind: 'append-points', id: 's', points: [1, 1, 2, 2] });
        expect(canMerge(a, { kind: 'append-points', id: 't', points: [3, 3] })).toBe(false);
    });

    it('never merges structural ops or oversized batches', () => {
        expect(canMerge({ kind: 'delete', ids: ['a'] }, { kind: 'delete', ids: ['b'] })).toBe(false);
        expect(canMerge({ kind: 'update', patches: [] }, { kind: 'add', shapes: [] })).toBe(false);
        const many = { kind: 'update', patches: Array.from({ length: 400 }, (_, i) => ({ id: `s${i}`, changes: {} })) } as const;
        expect(canMerge(many, many)).toBe(false);
    });

    it('treats structural ops as urgent', () => {
        expect(isUrgent({ kind: 'add', shapes: [] })).toBe(true);
        expect(isUrgent({ kind: 'append-points', id: 'a', points: [] })).toBe(false);
    });
});
