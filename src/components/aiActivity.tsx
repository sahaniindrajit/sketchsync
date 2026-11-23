import { Crosshair, Sparkles } from 'lucide-react';
import { AnimatePresence, motion } from 'motion/react';
import { useEffect, useState } from 'react';
import { getShapeBounds, unionBoxes, type Box } from '@/shared/geometry';
import { browserMeasurer } from '@/board/measure';
import { useBoard } from '@/board/store';
import { cn } from '@/lib/utils';

const ACTIVE_MS = 2500;
const VISIBLE_MS = 7000;

/** Bounds of the shapes the AI touched most recently. */
// eslint-disable-next-line react-refresh/only-export-components
export function aiActivityBounds(): Box | null {
    const { aiActivity, shapes } = useBoard.getState();
    if (!aiActivity) return null;
    const touched = aiActivity.shapeIds.map((id) => shapes.get(id)).filter((s) => !!s);
    return unionBoxes(touched.map((s) => getShapeBounds(s!, (id) => shapes.get(id), browserMeasurer)));
}

/** Re-renders periodically while AI activity is recent. */
// eslint-disable-next-line react-refresh/only-export-components
export function useAiActivityClock(windowMs: number) {
    const activity = useBoard((s) => s.aiActivity);
    const [now, setNow] = useState(() => Date.now());
    useEffect(() => {
        if (!activity) return;
        const remaining = activity.at + windowMs - Date.now();
        if (remaining <= 0) return;
        const interval = setInterval(() => setNow(Date.now()), 250);
        const stop = setTimeout(() => {
            clearInterval(interval);
            setNow(Date.now());
        }, remaining + 50);
        return () => {
            clearInterval(interval);
            clearTimeout(stop);
        };
    }, [activity, windowMs]);
    return { activity, now };
}

export function AiActivityToast({ onJump }: { onJump: (box: Box) => void }) {
    const { activity, now } = useAiActivityClock(VISIBLE_MS);
    const visible = !!activity && now - activity.at <= VISIBLE_MS;
    const active = visible && now - activity!.at < ACTIVE_MS;
    const count = activity?.shapeIds.length ?? 0;
    return (
        <div className="pointer-events-none fixed bottom-[calc(max(12px,env(safe-area-inset-bottom))+120px)] left-1/2 z-40 -translate-x-1/2 lg:bottom-[calc(max(12px,env(safe-area-inset-bottom))+68px)]">
            <AnimatePresence>
                {visible && (
                    <motion.div
                        role="status"
                        data-testid="ai-activity"
                        initial={{ opacity: 0, y: 12, scale: 0.95 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: 8, scale: 0.97, transition: { duration: 0.15 } }}
                        className="chrome pointer-events-auto flex items-center gap-2.5 whitespace-nowrap rounded-full py-1.5 pl-1.5 pr-1.5 text-[13px] text-muted-foreground"
                    >
                        <span className={cn('flex h-7 w-7 items-center justify-center rounded-full bg-claude text-white', active && 'animate-ping2')}>
                            <Sparkles className="h-3.5 w-3.5" strokeWidth={2} />
                        </span>
                        <span>
                            <b className="font-semibold text-foreground">{activity!.name}</b>{' '}
                            <span className={cn(active && 'text-shimmer')}>
                                {active ? 'is editing the board…' : `edited ${count} ${count === 1 ? 'shape' : 'shapes'}`}
                            </span>
                        </span>
                        <button
                            type="button"
                            className="flex items-center gap-1.5 rounded-full bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground transition-transform active:scale-95"
                            onClick={() => {
                                const box = aiActivityBounds();
                                if (box) onJump(box);
                            }}
                        >
                            <Crosshair className="h-3.5 w-3.5" />
                            Show me
                        </button>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}
