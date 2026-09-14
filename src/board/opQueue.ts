import { opBytes } from '@/shared/ops';
import { LIMITS, type Op, type ShapePatch } from '@/shared/protocol';

/**
 * Whether `next` can be folded into `prev` without changing the result:
 * consecutive updates merge per shape, consecutive point appends to the same
 * stroke concatenate. Callers only merge into the newest unsent op, so
 * ordering is preserved.
 */
export function canMerge(prev: Op, next: Op): boolean {
    const sameKind =
        (prev.kind === 'update' && next.kind === 'update' && prev.patches.length + next.patches.length <= 500) ||
        (prev.kind === 'append-points' && next.kind === 'append-points' && prev.id === next.id);
    return sameKind && opBytes(prev) + opBytes(next) <= LIMITS.targetOpBytes;
}

export function mergeOps(prev: Op, next: Op): Op {
    if (prev.kind === 'update' && next.kind === 'update') return { kind: 'update', patches: mergePatches(prev.patches, next.patches) };
    if (prev.kind === 'append-points' && next.kind === 'append-points') return { kind: 'append-points', id: prev.id, points: prev.points.concat(next.points) };
    throw new Error(`Cannot merge ${prev.kind} into ${next.kind}`);
}

function mergePatches(a: ShapePatch[], b: ShapePatch[]): ShapePatch[] {
    const byId = new Map<string, ShapePatch>();
    for (const p of a) byId.set(p.id, { id: p.id, changes: { ...p.changes } });
    for (const p of b) {
        const existing = byId.get(p.id);
        if (existing) existing.changes = { ...existing.changes, ...p.changes };
        else byId.set(p.id, { id: p.id, changes: { ...p.changes } });
    }
    return Array.from(byId.values());
}

/** Ops that should reach the server right away instead of waiting for the throttle. */
export function isUrgent(op: Op): boolean {
    return op.kind === 'add' || op.kind === 'delete' || op.kind === 'clear';
}
