import { Bot, Crosshair } from 'lucide-react';
import { useEffect, useState } from 'react';
import { getShapeBounds, unionBoxes, type Box } from '@/shared/geometry';
import { browserMeasurer } from '@/board/measure';
import { useBoard } from '@/board/store';

const ACTIVE_MS = 2500;
const VISIBLE_MS = 7000;

/** Bounds of the shapes the AI touched most recently. */
export function aiActivityBounds(): Box | null {
    const { aiActivity, shapes } = useBoard.getState();
    if (!aiActivity) return null;
    const touched = aiActivity.shapeIds.map((id) => shapes.get(id)).filter((s) => !!s);
    return unionBoxes(touched.map((s) => getShapeBounds(s!, (id) => shapes.get(id), browserMeasurer)));
}

/** Re-renders periodically while AI activity is recent. */
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
    if (!activity || now - activity.at > VISIBLE_MS) return null;
    const active = now - activity.at < ACTIVE_MS;
    return (
        <div
            role="status"
            data-testid="ai-activity"
            className="fixed bottom-16 left-1/2 z-40 flex -translate-x-1/2 items-center gap-3 rounded-full border border-indigo-100 bg-white py-1.5 pl-3 pr-1.5 text-sm text-gray-700 shadow-lg"
        >
            <span className={`flex h-6 w-6 items-center justify-center rounded-full bg-indigo-100 text-indigo-600 ${active ? 'animate-pulse' : ''}`}>
                <Bot className="h-4 w-4" />
            </span>
            <span>
                <b className="font-medium">{activity.name}</b> {active ? 'is editing the board…' : 'edited the board'}
            </span>
            <button
                className="flex items-center gap-1 rounded-full bg-indigo-500 px-2.5 py-1 text-xs font-medium text-white hover:bg-indigo-600"
                onClick={() => {
                    const box = aiActivityBounds();
                    if (box) onJump(box);
                }}
            >
                <Crosshair className="h-3.5 w-3.5" />
                Show
            </button>
        </div>
    );
}
