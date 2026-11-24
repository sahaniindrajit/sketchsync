import * as Dialog from '@radix-ui/react-dialog';
import { Check, Copy, Link2, Sparkles, X } from 'lucide-react';
import { assignColors, initials, usePresence } from '@/board/presence';
import { useBoard } from '@/board/store';
import { AnimatePresence, motion } from 'motion/react';
import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { boardUrl } from '@/config';
import { cn } from '@/lib/utils';
import { Link } from 'react-router-dom';
import { api, useAccount, type BoardInfo } from '@/lib/account';
import { Collaborators } from './collaborators';

export type ShareTab = 'collaborate' | 'ai';

/** Who is on the board right now, including you and any AI that is drawing. */
function PeopleHere() {
    const me = usePresence((s) => s.me);
    const peers = Object.values(usePresence((s) => s.peers));
    const colors = assignColors(me, peers);
    const ai = useBoard((s) => s.aiActivity);
    const rows = [
        { id: 'me', name: me.name, color: me.color, note: 'you' },
        ...peers.map((p) => ({ id: p.id, name: p.name, color: colors[p.id], note: 'editing' })),
        ...(ai && Date.now() - ai.at < 60_000 ? [{ id: 'ai', name: ai.name, color: 'hsl(var(--claude))', note: 'AI' }] : []),
    ];
    return (
        <div className="space-y-2 border-t border-border/70 pt-4">
            <p className="text-[12px] font-medium text-muted-foreground">On this board now</p>
            <ul className="space-y-1.5">
                {rows.map((r) => (
                    <li key={r.id} className="flex items-center gap-2.5 text-[13px]">
                        <span className="flex h-6 w-6 items-center justify-center rounded-full text-[10px] font-semibold text-white" style={{ backgroundColor: r.color }}>
                            {r.id === 'ai' ? <Sparkles className="h-3 w-3" /> : initials(r.name)}
                        </span>
                        <span className="flex-1 font-medium">{r.name}</span>
                        <span className="text-[12px] text-muted-foreground">{r.note}</span>
                    </li>
                ))}
            </ul>
            {rows.length === 1 && <p className="text-[12px] text-muted-foreground">Send the link above and they'll appear here as they join.</p>}
        </div>
    );
}

/** Animates its height to fit whatever it contains. */
function AutoHeight({ children }: { children: React.ReactNode }) {
    const ref = useRef<HTMLDivElement>(null);
    const [height, setHeight] = useState<number | 'auto'>('auto');
    useLayoutEffect(() => {
        const el = ref.current;
        if (!el) return;
        const ro = new ResizeObserver(() => setHeight(el.offsetHeight));
        ro.observe(el);
        return () => ro.disconnect();
    }, []);
    return (
        <motion.div initial={false} animate={{ height }} transition={{ type: 'spring', visualDuration: 0.3, bounce: 0 }} className="relative overflow-hidden">
            <div ref={ref}>{children}</div>
        </motion.div>
    );
}

export function CopyButton({ value, label, dense, className }: { value: string; label: string; dense?: boolean; className?: string }) {
    const [copied, setCopied] = useState(false);
    useEffect(() => {
        if (!copied) return;
        const t = setTimeout(() => setCopied(false), 1500);
        return () => clearTimeout(t);
    }, [copied]);
    return (
        <button
            type="button"
            aria-label={copied ? 'Copied' : label}
            title={copied ? 'Copied' : label}
            onClick={async () => {
                try {
                    await navigator.clipboard.writeText(value);
                    setCopied(true);
                } catch {
                    /* clipboard unavailable (e.g. insecure context) */
                }
            }}
            className={cn(
                'relative flex shrink-0 items-center justify-center gap-1.5 overflow-hidden rounded-md font-medium transition-[background-color,transform] active:scale-95',
                dense ? 'h-8 w-8 text-muted-foreground hover:bg-secondary hover:text-foreground' : 'h-9 min-w-[84px] bg-primary px-3 text-[13px] text-primary-foreground',
                copied && !dense && 'bg-success text-white',
                copied && dense && 'text-success',
                className,
            )}
        >
            <AnimatePresence mode="popLayout" initial={false}>
                <motion.span
                    key={copied ? 'y' : 'n'}
                    initial={{ opacity: 0, scale: 0.6, filter: 'blur(2px)' }}
                    animate={{ opacity: 1, scale: 1, filter: 'blur(0px)' }}
                    exit={{ opacity: 0, scale: 0.6, filter: 'blur(2px)' }}
                    transition={{ type: 'spring', visualDuration: 0.2, bounce: 0.3 }}
                    className="flex items-center gap-1.5"
                >
                    {copied ? <Check className="h-3.5 w-3.5" strokeWidth={2.5} /> : <Copy className="h-3.5 w-3.5" />}
                    {!dense && <span>{copied ? 'Copied' : 'Copy'}</span>}
                </motion.span>
            </AnimatePresence>
        </button>
    );
}

export function CopyField({ value, label, testId, dense, copyLabel = 'Copy', icon }: { value: string; label: string; testId?: string; dense?: boolean; copyLabel?: string; icon?: React.ReactNode }) {
    return (
        <div className={cn('flex items-center gap-1 rounded-lg border border-border bg-secondary/50 p-1 transition-colors focus-within:border-ring', dense && 'rounded-md')}>
            {icon && <span className="pl-1.5 text-muted-foreground">{icon}</span>}
            <input
                value={value}
                readOnly
                aria-label={label}
                className={cn('min-w-0 flex-1 bg-transparent px-1.5 font-mono text-foreground outline-none [mask-image:linear-gradient(90deg,#000_82%,transparent)] focus:[mask-image:none]', dense ? 'h-7 text-[11px]' : 'h-8 text-xs')}
                onFocus={(e) => e.target.select()}
                data-testid={testId}
                spellCheck={false}
            />
            <CopyButton value={value} label={copyLabel} dense={dense} />
        </div>
    );
}

const tabs = [
    ['collaborate', 'Collaborate', Link2],
    ['ai', 'Connect your AI', Sparkles],
] as const;

const LINK_COPY = {
    edit: 'Anyone with the link can view and edit in real time. No account needed.',
    view: 'Anyone with the link can view. Only people you add can edit.',
    off: 'Only people you add can open this board.',
} as const;

/** Collaborate tab: the link, who has access, and (for saved boards) sharing settings. */
function CollaboratePanel({ roomId, board, onBoardChange }: { roomId: string; board?: BoardInfo | null; onBoardChange?: (b: BoardInfo) => void }) {
    const status = useAccount((s) => s.status);
    const enabled = useAccount((s) => s.enabled);
    const [saving, setSaving] = useState(false);
    const saved = !!board?.owner;
    return (
        <div className="space-y-4">
            <div className="space-y-1">
                <h2 className="text-[15px] font-semibold tracking-tightish">Share this board</h2>
                <p className="text-[13px] leading-relaxed text-muted-foreground">{LINK_COPY[board?.linkAccess ?? 'edit']}</p>
            </div>
            <CopyField value={boardUrl(roomId)} label="Board link" testId="board-link" icon={<Link2 className="h-3.5 w-3.5" />} />
            {board && saved && onBoardChange ? (
                <Collaborators board={board} onChange={onBoardChange} />
            ) : enabled && board && !saved ? (
                <div className="flex items-center gap-3 rounded-xl bg-secondary/60 p-3 text-[12.5px] text-muted-foreground">
                    <span className="flex-1">
                        {status === 'signed-in' ? 'Save it to your account to invite people by email and choose who can edit.' : 'Sign in to save this board, invite people by email and choose who can edit.'}
                    </span>
                    {status === 'signed-in' ? (
                        <button
                            type="button"
                            disabled={saving}
                            onClick={async () => {
                                setSaving(true);
                                try {
                                    await api('/boards/import', { method: 'POST', body: { ids: [roomId] } });
                                    const r = await api<{ board: BoardInfo }>(`/boards/${roomId}`);
                                    onBoardChange?.(r.board);
                                } catch {
                                    useBoard.getState().notify('Could not save this board', 'error');
                                } finally {
                                    setSaving(false);
                                }
                            }}
                            className="h-8 shrink-0 rounded-md bg-primary px-3 text-[12.5px] font-medium text-primary-foreground"
                        >
                            {saving ? 'Saving…' : 'Save board'}
                        </button>
                    ) : (
                        <Link to={`/signin?next=${encodeURIComponent(`/board/${roomId}`)}`} className="h-8 shrink-0 rounded-md bg-primary px-3 text-[12.5px] font-medium leading-8 text-primary-foreground">
                            Sign in
                        </Link>
                    )}
                </div>
            ) : null}
            <PeopleHere />
        </div>
    );
}

export function ShareDialog({
    roomId,
    tab,
    onTab,
    onClose,
    aiPanel,
    board,
    onBoardChange,
}: {
    roomId: string;
    tab: ShareTab;
    onTab: (tab: ShareTab) => void;
    onClose: () => void;
    aiPanel?: React.ReactNode;
    board?: BoardInfo | null;
    onBoardChange?: (b: BoardInfo) => void;
}) {
    return (
        <Dialog.Root open onOpenChange={(o) => !o && onClose()}>
            <Dialog.Portal forceMount>
                <Dialog.Overlay asChild forceMount>
                    <motion.div
                        className="fixed inset-0 z-[60] bg-[hsl(225_15%_6%/0.28)] backdrop-blur-[3px]"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0, transition: { duration: 0.15 } }}
                    />
                </Dialog.Overlay>
                <div className="pointer-events-none fixed inset-0 z-[61] flex items-end justify-center sm:items-start sm:p-4 sm:pt-[max(1rem,14vh)]">
                    <Dialog.Content
                        asChild
                        forceMount
                        aria-describedby={undefined}
                        onCloseAutoFocus={(e) => {
                            e.preventDefault();
                            (document.getElementById('share-button') as (HTMLElement & { focus(o?: { focusVisible?: boolean }): void }) | null)?.focus({ focusVisible: false });
                        }}
                    >
                        <motion.div
                            initial={{ opacity: 0, scale: 0.96, y: 8 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.97, y: 4, transition: { duration: 0.14 } }}
                            transition={{ type: 'spring', visualDuration: 0.3, bounce: 0.18 }}
                            className="pointer-events-auto max-h-[88vh] w-full max-w-[460px] overflow-y-auto rounded-t-2xl border border-border bg-popover pb-[env(safe-area-inset-bottom)] text-popover-foreground shadow-lift outline-none sm:rounded-2xl sm:pb-0"
                        >
                            <Dialog.Title className="sr-only">Share board</Dialog.Title>
                            <div className="flex items-center gap-2 border-b border-border/70 p-2">
                                <div
                                    className="flex flex-1 gap-0.5 rounded-xl bg-secondary p-1"
                                    role="tablist"
                                    aria-label="Share options"
                                    onKeyDown={(e) => {
                                        if (e.key !== 'ArrowLeft' && e.key !== 'ArrowRight') return;
                                        e.preventDefault();
                                        const next = tab === 'collaborate' ? 'ai' : 'collaborate';
                                        onTab(next);
                                        requestAnimationFrame(() => document.getElementById(`share-tab-${next}`)?.focus());
                                    }}
                                >
                                    {tabs.map(([id, label, Icon]) => (
                                        <button
                                            key={id}
                                            id={`share-tab-${id}`}
                                            role="tab"
                                            aria-selected={tab === id}
                                            aria-controls="share-panel"
                                            tabIndex={tab === id ? 0 : -1}
                                            className={cn('relative flex flex-1 items-center justify-center gap-1.5 rounded-lg px-3 py-1.5 text-[13px] font-medium transition-colors', tab === id ? 'text-foreground' : 'text-muted-foreground hover:text-foreground')}
                                            onClick={() => onTab(id)}
                                        >
                                            {tab === id && <motion.span layoutId="share-tab" className="absolute inset-0 rounded-lg bg-card shadow-[0_1px_3px_hsl(0_0%_0%/0.12)]" transition={{ type: 'spring', visualDuration: 0.25, bounce: 0.15 }} />}
                                            <Icon className={cn('relative z-10 h-3.5 w-3.5', id === 'ai' && 'text-claude')} />
                                            <span className="relative z-10">{label}</span>
                                        </button>
                                    ))}
                                </div>
                                <Dialog.Close aria-label="Close" className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground">
                                    <X className="h-4 w-4" />
                                </Dialog.Close>
                            </div>
                            <AutoHeight>
                            <AnimatePresence mode="popLayout" initial={false}>
                                <motion.div
                                    key={tab}
                                    initial={{ opacity: 0, x: tab === 'ai' ? 16 : -16, filter: 'blur(2px)' }}
                                    animate={{ opacity: 1, x: 0, filter: 'blur(0px)' }}
                                    exit={{ opacity: 0, x: tab === 'ai' ? -16 : 16, filter: 'blur(2px)', transition: { duration: 0.12 } }}
                                    transition={{ type: 'spring', visualDuration: 0.22, bounce: 0 }}
                                    className="p-5"
                                    id="share-panel"
                                    role="tabpanel"
                                    aria-labelledby={`share-tab-${tab}`}
                                >
                                    {tab === 'collaborate' ? (
                                        <CollaboratePanel roomId={roomId} board={board} onBoardChange={onBoardChange} />
                                    ) : (
                                        aiPanel
                                    )}
                                </motion.div>
                            </AnimatePresence>
                            </AutoHeight>
                        </motion.div>
                    </Dialog.Content>
                </div>
            </Dialog.Portal>
        </Dialog.Root>
    );
}
