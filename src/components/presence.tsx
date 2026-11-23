import { Sparkles } from 'lucide-react';
import { AnimatePresence, motion } from 'motion/react';
import { useState } from 'react';
import { assignColors, initials, usePresence, type Peer } from '@/board/presence';
import { useBoard } from '@/board/store';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';
import { useAiActivityClock } from './aiActivity';

/**
 * Other people's pointers. They spring in board coordinates inside a layer that follows the
 * camera directly, so they stay glued to the content while you pan or zoom.
 */
export function PeerCursors() {
    const peers = usePresence((s) => s.peers);
    const me = usePresence((s) => s.me);
    const viewport = useBoard((s) => s.viewport);
    const list = Object.values(peers);
    const colors = assignColors(me, list);
    const visible = list.filter((p): p is Peer & { x: number; y: number } => p.x !== null && p.y !== null);
    return (
        <div className="pointer-events-none absolute inset-0 z-[6] overflow-hidden" aria-hidden>
            <div className="absolute left-0 top-0 origin-top-left" style={{ transform: `translate(${viewport.x}px, ${viewport.y}px) scale(${viewport.scale})` }}>
                <AnimatePresence>
                    {visible.map((p) => (
                        <motion.div
                            key={p.id}
                            className="absolute left-0 top-0"
                            initial={{ opacity: 0, x: p.x, y: p.y }}
                            animate={{ opacity: 1, x: p.x, y: p.y }}
                            exit={{ opacity: 0, transition: { duration: 0.2 } }}
                            transition={{ type: 'spring', visualDuration: 0.16, bounce: 0 }}
                        >
                            <div className="flex origin-top-left items-start" style={{ transform: `scale(${1 / viewport.scale})` }}>
                                <svg width="16" height="20" viewBox="0 0 16 22">
                                    <path d="M0 0 L0 18 L4.8 13.5 L8 20.5 L11 19.2 L7.9 12.4 L14.3 12.2 Z" fill={colors[p.id]} stroke="white" strokeWidth="1.4" strokeLinejoin="round" />
                                </svg>
                                <span className="mt-[18px] whitespace-nowrap rounded-md px-1.5 py-0.5 text-[11.5px] font-semibold text-white shadow-chrome" style={{ backgroundColor: colors[p.id] }}>
                                    {p.name}
                                </span>
                            </div>
                        </motion.div>
                    ))}
                </AnimatePresence>
            </div>
        </div>
    );
}

function Avatar({ color, label, className, children }: { color: string; label: string; className?: string; children: React.ReactNode }) {
    return (
        <Tooltip>
            <TooltipTrigger asChild>
                <motion.span
                    layout
                    initial={{ scale: 0.6, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    exit={{ scale: 0.6, opacity: 0 }}
                    className={cn('relative -ml-1.5 flex h-8 w-8 items-center justify-center rounded-full text-[11px] font-semibold text-white ring-2 ring-[hsl(var(--chrome))] first:ml-0', className)}
                    style={{ backgroundColor: color }}
                    aria-label={label}
                    tabIndex={0}
                >
                    {children}
                </motion.span>
            </TooltipTrigger>
            <TooltipContent side="bottom">{label}</TooltipContent>
        </Tooltip>
    );
}

/** Everyone on the board: you, other people, and an AI while it is working. Holds the connection state. */
export function PresenceStack() {
    const me = usePresence((s) => s.me);
    const rename = usePresence((s) => s.rename);
    const peerMap = usePresence((s) => s.peers);
    const peers = Object.values(peerMap);
    const colors = assignColors(me, peers);
    const connection = useBoard((s) => s.connection);
    const error = useBoard((s) => s.connectionError);
    const { activity, now } = useAiActivityClock(8000);
    const aiHere = !!activity && now - activity.at < 8000;
    const [editing, setEditing] = useState(false);
    const shown = peers.slice(0, 3);
    const extra = peers.length - shown.length;
    const status = {
        online: ['bg-success', peers.length ? `Live · ${peers.length + 1} here` : 'Live'],
        connecting: ['bg-warning animate-pulse', 'Connecting…'],
        offline: ['bg-muted-foreground', 'Offline · saved locally'],
        error: ['bg-destructive', error ?? 'Connection error'],
    } as const;
    const [dot, text] = status[connection];

    return (
        <div className="chrome flex h-11 items-center gap-2 rounded-xl pl-1.5 pr-1.5">
            <div className="flex items-center">
                <AnimatePresence initial={false}>
                    {aiHere && (
                        <Avatar key="ai" color="hsl(var(--claude))" label={`${activity!.name} (AI)`} className={cn(now - activity!.at < 2500 && 'ai-ping')}>
                            <Sparkles className="h-3.5 w-3.5" strokeWidth={2.2} />
                        </Avatar>
                    )}
                    {shown.map((p) => (
                        <Avatar key={p.id} color={colors[p.id]} label={p.name}>
                            {initials(p.name)}
                        </Avatar>
                    ))}
                    {extra > 0 && (
                        <Avatar key="more" color="hsl(var(--muted-foreground))" label={`${extra} more`}>
                            +{extra}
                        </Avatar>
                    )}
                </AnimatePresence>
                <Tooltip>
                    <TooltipTrigger asChild>
                        <button
                            type="button"
                            onClick={() => setEditing(true)}
                            aria-label={`You: ${me.name}. Change your name`}
                            className={cn('relative -ml-1.5 flex h-8 w-8 items-center justify-center rounded-full text-[11px] font-semibold text-white ring-2 ring-[hsl(var(--chrome))]', !(aiHere || shown.length) && 'ml-0')}
                            style={{ backgroundColor: me.color }}
                        >
                            {initials(me.name)}
                            <span
                                className={cn('absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 rounded-full ring-2 ring-[hsl(var(--chrome))]', dot)}
                                data-testid="connection-status"
                                data-status={connection}
                                role="status"
                                aria-label={text}
                            />
                        </button>
                    </TooltipTrigger>
                    <TooltipContent side="bottom">
                        {me.name} (you) · {text}
                    </TooltipContent>
                </Tooltip>
            </div>
            <AnimatePresence initial={false}>
                {editing && (
                    <motion.form
                        initial={{ width: 0, opacity: 0 }}
                        animate={{ width: 140, opacity: 1 }}
                        exit={{ width: 0, opacity: 0 }}
                        className="overflow-hidden"
                        onSubmit={(e) => {
                            e.preventDefault();
                            rename(new FormData(e.currentTarget).get('name') as string);
                            setEditing(false);
                        }}
                    >
                        <input
                            name="name"
                            autoFocus
                            defaultValue={me.name}
                            maxLength={32}
                            aria-label="Your name"
                            onBlur={(e) => {
                                rename(e.currentTarget.value);
                                setEditing(false);
                            }}
                            onKeyDown={(e) => e.key === 'Escape' && setEditing(false)}
                            className="h-8 w-[136px] rounded-md border border-input bg-card px-2 text-[13px] outline-none focus:border-ring"
                        />
                    </motion.form>
                )}
            </AnimatePresence>
        </div>
    );
}
