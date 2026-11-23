import { Maximize, Minus, Plus, Redo2, Share2, Sparkles, Undo2 } from 'lucide-react';
import { AnimatePresence, motion } from 'motion/react';
import { useEffect, useRef } from 'react';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { Kbd } from '@/components/ui/kbd';
import { MOD } from '@/lib/platform';
import { animateViewport, redoLast, undoLast, useBoard } from '@/board/store';
import { useHistory } from '@/board/history';
import { cn } from '@/lib/utils';
import { useAiActivityClock } from './aiActivity';
import { PresenceStack } from './presence';

const AI_ACTIVE_MS = 2500;

/** Top-right cluster: AI agent status and Share. */
export function ConnectionBadge({ onShare, onConnectAi }: { onShare: () => void; onConnectAi: () => void }) {
    const { activity, now } = useAiActivityClock(AI_ACTIVE_MS);
    const working = !!activity && now - activity.at < AI_ACTIVE_MS;
    return (
        <motion.div
            initial={{ y: -12, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            className="fixed right-[max(12px,env(safe-area-inset-right))] top-[max(12px,env(safe-area-inset-top))] z-30 flex items-center gap-2"
        >
            <PresenceStack />
            <Tooltip>
                <TooltipTrigger asChild>
                    <button
                        type="button"
                        onClick={onConnectAi}
                        aria-label="Connect your AI"
                        className={cn(
                            'chrome flex h-11 items-center gap-2 rounded-xl pl-2.5 pr-3 text-[13px] font-medium text-foreground/80 transition-colors hover:text-foreground',
                            working && 'border-claude/40',
                        )}
                    >
                        <span className={cn('relative flex h-5 w-5 items-center justify-center rounded-full transition-colors', working ? 'bg-claude text-white' : 'bg-secondary text-claude')}>
                            <Sparkles className="h-3 w-3" strokeWidth={2} />
                        </span>
                        <span className="hidden whitespace-nowrap sm:inline">Connect AI</span>
                    </button>
                </TooltipTrigger>
                <TooltipContent side="bottom">Let Claude, Cursor or any MCP client draw here</TooltipContent>
            </Tooltip>
            <button
                type="button"
                onClick={onShare}
                className="relative flex h-11 items-center gap-2 overflow-hidden rounded-xl bg-primary px-4 text-[13px] font-medium text-primary-foreground shadow-chrome transition-transform active:scale-[0.97]"
            >
                <Share2 className="h-4 w-4" strokeWidth={2} />
                Share
            </button>
        </motion.div>
    );
}

function RollingNumber({ value, suffix }: { value: number; suffix?: string }) {
    const prev = useRef(value);
    const dir = value >= prev.current ? 1 : -1;
    useEffect(() => {
        prev.current = value;
    }, [value]);
    return (
        <span className="relative inline-flex overflow-hidden tabular-nums">
            <AnimatePresence mode="popLayout" initial={false} custom={dir}>
                <motion.span
                    key={value}
                    custom={dir}
                    initial={{ y: `${dir * 100}%`, opacity: 0 }}
                    animate={{ y: '0%', opacity: 1 }}
                    exit={{ y: `${dir * -100}%`, opacity: 0 }}
                    transition={{ type: 'spring', visualDuration: 0.22, bounce: 0.1 }}
                >
                    {value}
                    {suffix}
                </motion.span>
            </AnimatePresence>
        </span>
    );
}

function ZoomButton({ label, hint, onClick, children, disabled }: { label: string; hint?: React.ReactNode; onClick: () => void; children: React.ReactNode; disabled?: boolean }) {
    return (
        <Tooltip>
            <TooltipTrigger asChild>
                <button
                    type="button"
                    aria-label={label}
                    onClick={disabled ? undefined : onClick}
                    aria-disabled={disabled || undefined}
                    className="flex h-8 w-8 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground active:scale-95 aria-disabled:cursor-default aria-disabled:opacity-35 aria-disabled:hover:bg-transparent aria-disabled:active:scale-100"
                >
                    {children}
                </button>
            </TooltipTrigger>
            <TooltipContent side="top">
                {label}
                {hint}
            </TooltipContent>
        </Tooltip>
    );
}

export function ZoomControls({ onFit }: { onFit: () => void }) {
    const viewport = useBoard((s) => s.viewport);
    const canUndo = useHistory((s) => s.undo.length > 0);
    const canRedo = useHistory((s) => s.redo.length > 0);
    const zoom = (factor: number | null) => {
        const state = useBoard.getState();
        const vp = state.viewport;
        const scale = factor === null ? 1 : Math.min(8, Math.max(0.1, vp.scale * factor));
        const cx = window.innerWidth / 2;
        const cy = window.innerHeight / 2;
        animateViewport({ scale, x: cx - ((cx - vp.x) / vp.scale) * scale, y: cy - ((cy - vp.y) / vp.scale) * scale }, 220);
    };
    return (
        <div className="chrome fixed bottom-[calc(max(12px,env(safe-area-inset-bottom))+64px)] left-[max(12px,env(safe-area-inset-left))] z-10 flex items-center gap-0.5 rounded-xl p-0.5 xl:bottom-[max(12px,env(safe-area-inset-bottom))]">
            <ZoomButton label="Undo" hint={<><Kbd>{MOD}</Kbd><Kbd>Z</Kbd></>} onClick={undoLast} disabled={!canUndo}>
                <Undo2 className="h-4 w-4" strokeWidth={1.75} />
            </ZoomButton>
            <ZoomButton label="Redo" hint={<><Kbd>{MOD}</Kbd><Kbd>⇧</Kbd><Kbd>Z</Kbd></>} onClick={redoLast} disabled={!canRedo}>
                <Redo2 className="h-4 w-4" strokeWidth={1.75} />
            </ZoomButton>
            <div className="mx-0.5 h-4 w-px bg-border" />
            <ZoomButton label="Zoom out" hint={<><Kbd>{MOD}</Kbd><Kbd>−</Kbd></>} onClick={() => zoom(1 / 1.2)}>
                <Minus className="h-4 w-4" strokeWidth={1.75} />
            </ZoomButton>
            <button
                type="button"
                className="h-8 min-w-[52px] rounded-lg px-1 text-center font-mono text-xs text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
                onClick={() => zoom(null)}
                title="Reset zoom"
                data-testid="zoom-level"
            >
                <RollingNumber value={Math.round(viewport.scale * 100)} suffix="%" />
            </button>
            <ZoomButton label="Zoom in" hint={<><Kbd>{MOD}</Kbd><Kbd>+</Kbd></>} onClick={() => zoom(1.2)}>
                <Plus className="h-4 w-4" strokeWidth={1.75} />
            </ZoomButton>
            <div className="mx-0.5 h-4 w-px bg-border" />
            <ZoomButton label="Zoom to fit" hint={<><Kbd>⇧</Kbd><Kbd>1</Kbd></>} onClick={onFit}>
                <Maximize className="h-[15px] w-[15px]" strokeWidth={1.75} />
            </ZoomButton>
        </div>
    );
}

export function NoticeToast() {
    const notice = useBoard((s) => s.notice);
    useEffect(() => {
        if (!notice) return;
        const t = setTimeout(() => {
            if (useBoard.getState().notice === notice) useBoard.setState({ notice: null });
        }, 4000);
        return () => clearTimeout(t);
    }, [notice]);
    return (
        <div className="pointer-events-none fixed bottom-[calc(max(12px,env(safe-area-inset-bottom))+120px)] left-1/2 z-50 -translate-x-1/2 xl:bottom-[calc(max(12px,env(safe-area-inset-bottom))+72px)]">
            <AnimatePresence>
                {notice && (
                    <motion.div
                        key={notice.at}
                        role="status"
                        initial={{ opacity: 0, y: 10, scale: 0.96 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: 6, scale: 0.98, transition: { duration: 0.14 } }}
                        className={cn(
                            'pointer-events-auto flex max-w-[calc(100vw-2rem)] items-center gap-2 rounded-xl px-3.5 py-2 text-[13px] shadow-lift',
                            notice.kind === 'error' ? 'bg-destructive text-destructive-foreground' : 'bg-primary text-primary-foreground',
                        )}
                    >
                        {notice.text}
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}
