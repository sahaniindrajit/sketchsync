import * as Popover from '@radix-ui/react-popover';
import { ArrowUpRight, Check, Link2, Loader2, MoreHorizontal, PenLine, Plus, Search, Sparkles, Trash2, Unplug, Users, X } from 'lucide-react';
import { AnimatePresence, motion, useReducedMotion } from 'motion/react';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link, Navigate, useLocation, useNavigate } from 'react-router-dom';
import { AccountMenu, Avatar } from '@/components/account';
import { Logo } from '@/components/logo';
import { CopyField } from '@/components/shareDialog';
import { boardUrl, BACKEND_URL, personalMcpUrl } from '@/config';
import { api, ApiError, ensureAccount, relativeTime, useAccount, type BoardSummary, type Connection } from '@/lib/account';
import { cn } from '@/lib/utils';

type Filter = 'all' | 'owned' | 'shared';

/** Board previews are fetched with the session token and shown as blob URLs. */
const thumbCache = new Map<string, string>();
function useThumbnail(board: BoardSummary) {
    const key = `${board.id}:${board.updatedAt}`;
    const [url, setUrl] = useState(() => thumbCache.get(key) ?? null);
    const token = useAccount((s) => s.token);
    useEffect(() => {
        if (thumbCache.has(key) || !board.shapeCount) return;
        let cancelled = false;
        fetch(`${BACKEND_URL}/api/boards/${board.id}/thumbnail.svg`, { headers: token ? { authorization: `Bearer ${token}` } : {} })
            .then((r) => (r.ok ? r.blob() : null))
            .then((blob) => {
                if (!blob || cancelled) return;
                const objectUrl = URL.createObjectURL(blob);
                thumbCache.set(key, objectUrl);
                setUrl(objectUrl);
            })
            .catch(() => undefined);
        return () => {
            cancelled = true;
        };
    }, [key, board.id, board.shapeCount, token]);
    return url;
}

const ROLE_LABEL = { owner: 'Owner', editor: 'Can edit', viewer: 'Can view' } as const;

function BoardCard({ board, index, onRename, onRemove }: { board: BoardSummary; index: number; onRename: (title: string) => Promise<void>; onRemove: () => void }) {
    const thumb = useThumbnail(board);
    const reduced = useReducedMotion();
    const [renaming, setRenaming] = useState(false);
    const [menu, setMenu] = useState(false);
    const [copied, setCopied] = useState(false);
    const title = board.title || 'Untitled board';
    const commit = async (value: string) => {
        setRenaming(false);
        if (value.trim() && value.trim() !== board.title) await onRename(value.trim());
    };
    const item = 'flex w-full items-center gap-2.5 rounded-md px-2.5 py-[7px] text-[13px] outline-none transition-colors hover:bg-secondary focus-visible:bg-secondary';

    return (
        <motion.li
            layout={!reduced}
            initial={reduced ? false : { opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96, transition: { duration: 0.15 } }}
            transition={{ type: 'spring', visualDuration: 0.4, bounce: 0, delay: reduced ? 0 : Math.min(index, 12) * 0.03 }}
            className="group relative"
            data-testid="board-card"
        >
            <Link
                to={`/board/${board.id}`}
                className="block overflow-hidden rounded-xl border border-border bg-card transition-[border-color,box-shadow,transform] duration-200 hover:-translate-y-0.5 hover:border-foreground/15 hover:shadow-lift focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                aria-label={`Open ${title}`}
            >
                <div className="dot-grid relative aspect-[16/10] overflow-hidden border-b border-border/70 bg-background">
                    {thumb ? (
                        <img src={thumb} alt="" className="absolute inset-0 h-full w-full object-contain p-4 transition-transform duration-500 group-hover:scale-[1.03] dark:invert dark:hue-rotate-180" />
                    ) : (
                        <div className="absolute inset-0 flex items-center justify-center font-mono text-[11px] uppercase tracking-[0.08em] text-muted-foreground/70">{board.shapeCount ? '' : 'Empty board'}</div>
                    )}
                    {board.role !== 'owner' && (
                        <span className="absolute left-2.5 top-2.5 flex items-center gap-1 rounded-full border border-border/80 bg-card/90 px-2 py-0.5 text-[11px] font-medium text-muted-foreground backdrop-blur">
                            <Users className="h-3 w-3" />
                            {ROLE_LABEL[board.role]}
                        </span>
                    )}
                </div>
                <div className="flex items-center gap-2.5 px-3.5 py-3">
                    <div className="min-w-0 flex-1">
                        {renaming ? (
                            <input
                                autoFocus
                                defaultValue={board.title}
                                maxLength={60}
                                aria-label="Board name"
                                onClick={(e) => e.preventDefault()}
                                onFocus={(e) => e.currentTarget.select()}
                                onBlur={(e) => void commit(e.currentTarget.value)}
                                onKeyDown={(e) => {
                                    if (e.key === 'Enter') void commit(e.currentTarget.value);
                                    if (e.key === 'Escape') setRenaming(false);
                                }}
                                className="-mx-1 h-6 w-full rounded border border-ring bg-background px-1 text-[14px] font-medium outline-none"
                            />
                        ) : (
                            <p className={cn('truncate text-[14px] font-medium', !board.title && 'text-muted-foreground')}>{title}</p>
                        )}
                        <p className="mt-0.5 truncate text-[12px] text-muted-foreground">
                            {board.relation === 'owned' ? 'Edited' : board.owner ? `${board.owner.name} ·` : 'Opened'} {relativeTime(board.updatedAt)}
                        </p>
                    </div>
                    {board.owner && board.relation !== 'owned' && <Avatar user={board.owner} size={22} />}
                </div>
            </Link>
            <Popover.Root open={menu} onOpenChange={setMenu}>
                <Popover.Trigger
                    aria-label={`More actions for ${title}`}
                    className={cn(
                        'absolute right-2 top-2 flex h-8 w-8 items-center justify-center rounded-lg border border-border/80 bg-card/90 text-muted-foreground opacity-0 backdrop-blur transition-opacity hover:text-foreground focus-visible:opacity-100 group-hover:opacity-100 [@media(hover:none)]:opacity-100',
                        menu && 'opacity-100',
                    )}
                >
                    <MoreHorizontal className="h-4 w-4" />
                </Popover.Trigger>
                <Popover.Portal>
                    <Popover.Content align="end" sideOffset={6} className="chrome chrome-solid z-[70] w-52 rounded-xl p-1.5 data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=open]:zoom-in-95">
                        <Link to={`/board/${board.id}`} className={item}>
                            <ArrowUpRight className="h-4 w-4 opacity-80" strokeWidth={1.75} />
                            Open
                        </Link>
                        {board.role !== 'viewer' && (
                            <button
                                type="button"
                                className={item}
                                onClick={() => {
                                    setMenu(false);
                                    setRenaming(true);
                                }}
                            >
                                <PenLine className="h-4 w-4 opacity-80" strokeWidth={1.75} />
                                Rename
                            </button>
                        )}
                        <button
                            type="button"
                            className={item}
                            onClick={async () => {
                                try {
                                    await navigator.clipboard.writeText(boardUrl(board.id));
                                    setCopied(true);
                                    setTimeout(() => setCopied(false), 1200);
                                } catch {
                                    /* clipboard unavailable */
                                }
                            }}
                        >
                            {copied ? <Check className="h-4 w-4 text-success" /> : <Link2 className="h-4 w-4 opacity-80" strokeWidth={1.75} />}
                            {copied ? 'Copied' : 'Copy link'}
                        </button>
                        <div className="mt-1.5 border-t border-border/70 pt-1.5">
                            <button
                                type="button"
                                className={cn(item, 'text-destructive hover:bg-destructive/10 focus-visible:bg-destructive/10')}
                                onClick={() => {
                                    setMenu(false);
                                    onRemove();
                                }}
                            >
                                <Trash2 className="h-4 w-4 opacity-80" strokeWidth={1.75} />
                                {board.role === 'owner' ? 'Delete board' : 'Remove from list'}
                            </button>
                        </div>
                    </Popover.Content>
                </Popover.Portal>
            </Popover.Root>
        </motion.li>
    );
}

function NewBoardCard({ onCreate, busy }: { onCreate: () => void; busy: boolean }) {
    return (
        <li>
            <button
                type="button"
                onClick={onCreate}
                disabled={busy}
                className="group flex h-full min-h-[200px] w-full flex-col items-center justify-center gap-3 rounded-xl border border-dashed border-border text-muted-foreground transition-colors hover:border-foreground/30 hover:bg-card hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
                <span className="flex h-10 w-10 items-center justify-center rounded-full bg-secondary transition-transform duration-300 group-hover:rotate-90 group-active:scale-90">
                    {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-5 w-5" strokeWidth={1.75} />}
                </span>
                <span className="text-[14px] font-medium">New board</span>
            </button>
        </li>
    );
}

/** The personal MCP connector: one URL for every board, plus the apps already connected. */
function AiConnector() {
    const [connections, setConnections] = useState<Connection[] | null>(null);
    const load = useCallback(() => {
        api<{ connections: Connection[] }>('/connections')
            .then((r) => setConnections(r.connections))
            .catch(() => setConnections([]));
    }, []);
    useEffect(load, [load]);
    return (
        <section aria-labelledby="ai-heading" className="rounded-2xl border border-border bg-card p-5" data-testid="ai-connector">
            <div className="flex items-center gap-2">
                <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-claude/12 text-claude">
                    <Sparkles className="h-4 w-4" />
                </span>
                <h2 id="ai-heading" className="text-[15px] font-semibold tracking-tightish">
                    Your AI connector
                </h2>
            </div>
            <p className="mt-2 text-[13px] leading-relaxed text-muted-foreground">
                One URL for every board. Add it to Claude, Cursor or any MCP app, sign in once, then ask: <span className="text-foreground">“add a pricing table to Roadmap”</span>.
            </p>
            <div className="mt-3">
                <CopyField value={personalMcpUrl()} label="Your MCP URL" testId="personal-mcp-url" icon={<Sparkles className="h-3.5 w-3.5 text-claude" />} />
            </div>
            <ol className="mt-3 space-y-1 text-[12.5px] leading-relaxed text-muted-foreground">
                <li>
                    <b className="font-medium text-foreground">Claude:</b> Settings → Connectors → Add custom connector.
                </li>
                <li>
                    <b className="font-medium text-foreground">Claude Code:</b> <code className="rounded bg-secondary px-1 font-mono text-[11px] text-foreground">claude mcp add --transport http sketchsync {personalMcpUrl()}</code>
                </li>
            </ol>
            <div className="mt-4 border-t border-border/70 pt-3">
                <p className="text-[12px] font-medium text-muted-foreground">Connected apps</p>
                {connections === null ? (
                    <div className="mt-2 h-8 animate-pulse rounded-md bg-secondary" />
                ) : connections.length === 0 ? (
                    <p className="mt-1.5 text-[12.5px] text-muted-foreground">None yet. Apps appear here after you approve them.</p>
                ) : (
                    <ul className="mt-1.5 space-y-1">
                        {connections.map((c) => (
                            <li key={c.clientId} className="flex items-center gap-2 text-[13px]">
                                <span className="h-1.5 w-1.5 rounded-full bg-success" />
                                <span className="flex-1 truncate font-medium">{c.name}</span>
                                <span className="text-[12px] text-muted-foreground">{relativeTime(c.lastUsedAt)}</span>
                                <button
                                    type="button"
                                    aria-label={`Disconnect ${c.name}`}
                                    title="Disconnect"
                                    className="flex h-7 w-7 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive"
                                    onClick={async () => {
                                        await api(`/connections/${encodeURIComponent(c.clientId)}`, { method: 'DELETE' }).catch(() => undefined);
                                        load();
                                    }}
                                >
                                    <Unplug className="h-3.5 w-3.5" />
                                </button>
                            </li>
                        ))}
                    </ul>
                )}
            </div>
        </section>
    );
}

export default function Boards() {
    const status = useAccount((s) => s.status);
    const enabled = useAccount((s) => s.enabled);
    const user = useAccount((s) => s.user);
    const navigate = useNavigate();
    const location = useLocation();
    const [boards, setBoards] = useState<BoardSummary[] | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [filter, setFilter] = useState<Filter>('all');
    const [query, setQuery] = useState('');
    const [creating, setCreating] = useState(false);
    const [toast, setToast] = useState<string | null>(() => {
        const imported = (location.state as { imported?: number } | null)?.imported;
        return imported ? `Added ${imported} board${imported === 1 ? '' : 's'} from this browser to your account.` : null;
    });
    const searchRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        document.title = 'Boards · SketchSync';
        void ensureAccount();
    }, []);

    const load = useCallback(() => {
        api<{ boards: BoardSummary[] }>('/boards')
            .then((r) => {
                setBoards(r.boards);
                setError(null);
            })
            .catch((err) => setError(err instanceof ApiError ? err.message : 'Could not load your boards'));
    }, []);
    useEffect(() => {
        if (status === 'signed-in') load();
    }, [status, load]);

    // Keep previews fresh when coming back to the tab.
    useEffect(() => {
        const onFocus = () => status === 'signed-in' && load();
        window.addEventListener('focus', onFocus);
        return () => window.removeEventListener('focus', onFocus);
    }, [status, load]);

    useEffect(() => {
        if (!toast) return;
        const t = setTimeout(() => setToast(null), 5000);
        return () => clearTimeout(t);
    }, [toast]);

    useEffect(() => {
        const onKey = (e: KeyboardEvent) => {
            if (e.key === '/' && document.activeElement?.tagName !== 'INPUT') {
                e.preventDefault();
                searchRef.current?.focus();
            }
        };
        window.addEventListener('keydown', onKey);
        return () => window.removeEventListener('keydown', onKey);
    }, []);

    const visible = useMemo(() => {
        const q = query.trim().toLowerCase();
        return (boards ?? []).filter((b) => (filter === 'all' ? true : filter === 'owned' ? b.relation === 'owned' : b.relation !== 'owned')).filter((b) => !q || (b.title || 'untitled board').toLowerCase().includes(q));
    }, [boards, filter, query]);

    if (enabled === false) return <Navigate to="/board" replace />;
    if (status === 'signed-out') return <Navigate to={`/signin?next=${encodeURIComponent('/boards')}`} replace />;

    const create = async () => {
        setCreating(true);
        try {
            const { board } = await api<{ board: { id: string } }>('/boards', { method: 'POST', body: {} });
            navigate(`/board/${board.id}`);
        } catch (err) {
            setToast(err instanceof Error ? err.message : 'Could not create a board');
            setCreating(false);
        }
    };

    const counts = {
        all: boards?.length ?? 0,
        owned: boards?.filter((b) => b.relation === 'owned').length ?? 0,
        shared: boards?.filter((b) => b.relation !== 'owned').length ?? 0,
    };
    const tabs: [Filter, string][] = [
        ['all', 'All'],
        ['owned', 'Yours'],
        ['shared', 'Shared with you'],
    ];

    return (
        <div className="min-h-[100dvh] bg-background">
            <header className="sticky top-0 z-40 border-b border-border/70 bg-[hsl(var(--background)/0.9)] backdrop-blur-xl">
                <div className="mx-auto flex h-16 max-w-7xl items-center gap-3 px-[max(16px,env(safe-area-inset-left))]">
                    <Link to="/" aria-label="SketchSync home" className="shrink-0">
                        <Logo />
                    </Link>
                    <div className="relative ml-auto w-full max-w-[320px] max-sm:hidden">
                        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                        <input
                            ref={searchRef}
                            value={query}
                            onChange={(e) => setQuery(e.target.value)}
                            placeholder="Search boards"
                            aria-label="Search boards"
                            className="h-9 w-full rounded-lg border border-input bg-card pl-9 pr-8 text-[13.5px] outline-none transition-colors placeholder:text-muted-foreground focus:border-ring focus:ring-[3px] focus:ring-ring/15"
                        />
                        {query ? (
                            <button type="button" aria-label="Clear search" onClick={() => setQuery('')} className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                                <X className="h-3.5 w-3.5" />
                            </button>
                        ) : (
                            <kbd className="kbd absolute right-2 top-1/2 -translate-y-1/2">/</kbd>
                        )}
                    </div>
                    <button
                        type="button"
                        onClick={create}
                        disabled={creating}
                        className="flex h-9 shrink-0 items-center gap-1.5 rounded-lg bg-primary px-3.5 text-[13.5px] font-medium text-primary-foreground transition-transform active:scale-[0.97] max-sm:ml-auto"
                    >
                        {creating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
                        New board
                    </button>
                    <AccountMenu />
                </div>
            </header>

            <main className="mx-auto grid max-w-7xl gap-8 px-[max(16px,env(safe-area-inset-left))] py-8 lg:grid-cols-[minmax(0,1fr)_340px]">
                <div className="min-w-0">
                    <div className="flex flex-wrap items-end justify-between gap-3">
                        <div>
                            <p className="font-mono text-[11.5px] uppercase tracking-[0.08em] text-muted-foreground">{user ? `${user.name.split(' ')[0]}'s workspace` : 'Workspace'}</p>
                            <h1 className="mt-1 text-[28px] font-semibold tracking-tightish">Boards</h1>
                        </div>
                        <div role="tablist" aria-label="Filter boards" className="flex gap-0.5 rounded-xl bg-secondary p-1">
                            {tabs.map(([id, label]) => (
                                <button
                                    key={id}
                                    role="tab"
                                    aria-selected={filter === id}
                                    onClick={() => setFilter(id)}
                                    className={cn('relative rounded-lg px-3 py-1.5 text-[13px] font-medium transition-colors', filter === id ? 'text-foreground' : 'text-muted-foreground hover:text-foreground')}
                                >
                                    {filter === id && <motion.span layoutId="boards-tab" className="absolute inset-0 rounded-lg bg-card shadow-[0_1px_3px_hsl(0_0%_0%/0.12)]" transition={{ type: 'spring', visualDuration: 0.25, bounce: 0.15 }} />}
                                    <span className="relative z-10">
                                        {label}
                                        {boards && <span className="ml-1.5 tabular-nums text-muted-foreground">{counts[id]}</span>}
                                    </span>
                                </button>
                            ))}
                        </div>
                    </div>
                    <div className="relative mt-4 sm:hidden">
                        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                        <input
                            value={query}
                            onChange={(e) => setQuery(e.target.value)}
                            placeholder="Search boards"
                            aria-label="Search boards"
                            className="h-10 w-full rounded-lg border border-input bg-card pl-9 text-[14px] outline-none focus:border-ring"
                        />
                    </div>

                    {error && (
                        <div role="alert" className="mt-6 flex items-center justify-between rounded-xl border border-destructive/30 bg-destructive/10 px-4 py-3 text-[13px] text-destructive">
                            {error}
                            <button type="button" onClick={load} className="font-medium underline-offset-4 hover:underline">
                                Retry
                            </button>
                        </div>
                    )}

                    {boards === null && !error ? (
                        <ul className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3" aria-busy>
                            {Array.from({ length: 6 }, (_, i) => (
                                <li key={i} className="overflow-hidden rounded-xl border border-border bg-card">
                                    <div className="aspect-[16/10] animate-pulse bg-secondary/70" />
                                    <div className="space-y-2 p-3.5">
                                        <div className="h-3.5 w-2/3 animate-pulse rounded bg-secondary" />
                                        <div className="h-3 w-1/3 animate-pulse rounded bg-secondary" />
                                    </div>
                                </li>
                            ))}
                        </ul>
                    ) : (
                        <ul className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3" data-testid="board-grid">
                            {filter !== 'shared' && !query && <NewBoardCard onCreate={create} busy={creating} />}
                            <AnimatePresence initial={false}>
                                {visible.map((b, i) => (
                                    <BoardCard
                                        key={b.id}
                                        board={b}
                                        index={i}
                                        onRename={async (title) => {
                                            setBoards((all) => all?.map((x) => (x.id === b.id ? { ...x, title } : x)) ?? null);
                                            await api(`/boards/${b.id}`, { method: 'PATCH', body: { title } }).catch(() => load());
                                        }}
                                        onRemove={async () => {
                                            const owned = b.role === 'owner';
                                            if (owned && !window.confirm(`Delete “${b.title || 'Untitled board'}” for everyone? This can't be undone.`)) return;
                                            setBoards((all) => all?.filter((x) => x.id !== b.id) ?? null);
                                            try {
                                                await api(`/boards/${b.id}`, { method: 'DELETE' });
                                                setToast(owned ? 'Board deleted.' : 'Removed from your list.');
                                            } catch (err) {
                                                setToast(err instanceof Error ? err.message : 'Could not remove the board');
                                                load();
                                            }
                                        }}
                                    />
                                ))}
                            </AnimatePresence>
                        </ul>
                    )}
                    {boards && visible.length === 0 && (query || filter === 'shared') && (
                        <p className="mt-10 text-center text-[14px] text-muted-foreground">
                            {query ? `No boards match “${query}”.` : 'Boards people share with you, and boards you open from a link, show up here.'}
                        </p>
                    )}
                </div>
                <aside className="lg:sticky lg:top-24 lg:self-start">
                    <AiConnector />
                </aside>
            </main>

            <div className="pointer-events-none fixed inset-x-0 bottom-[max(20px,env(safe-area-inset-bottom))] z-50 flex justify-center px-4">
                <AnimatePresence>
                    {toast && (
                        <motion.div
                            role="status"
                            initial={{ opacity: 0, y: 12, scale: 0.98 }}
                            animate={{ opacity: 1, y: 0, scale: 1 }}
                            exit={{ opacity: 0, y: 8, transition: { duration: 0.15 } }}
                            className="pointer-events-auto rounded-xl bg-primary px-4 py-2.5 text-[13px] font-medium text-primary-foreground shadow-lift"
                        >
                            {toast}
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>
        </div>
    );
}

