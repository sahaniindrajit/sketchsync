import * as Popover from '@radix-ui/react-popover';
import { ChevronDown, LayoutGrid, Loader2, Plus, Search } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useBoard } from '@/board/store';
import { api, relativeTime, type BoardSummary } from '@/lib/account';
import { cn } from '@/lib/utils';

/** Jump to another of your boards without going back to the boards page. */
export function BoardSwitcher() {
    const [open, setOpen] = useState(false);
    const [boards, setBoards] = useState<BoardSummary[] | null>(null);
    const [query, setQuery] = useState('');
    const [creating, setCreating] = useState(false);
    const roomId = useBoard((s) => s.roomId);
    const navigate = useNavigate();

    useEffect(() => {
        if (!open) return;
        setQuery('');
        api<{ boards: BoardSummary[] }>('/boards')
            .then((r) => setBoards(r.boards))
            .catch(() => setBoards([]));
    }, [open]);

    const visible = useMemo(() => {
        const q = query.trim().toLowerCase();
        return (boards ?? []).filter((b) => !q || (b.title || 'untitled board').toLowerCase().includes(q)).slice(0, 8);
    }, [boards, query]);

    const go = (id: string) => {
        setOpen(false);
        if (id !== roomId) navigate(`/board/${id}`);
    };

    return (
        <Popover.Root open={open} onOpenChange={setOpen}>
            <Popover.Trigger
                aria-label="Switch board"
                className={cn('hidden h-8 w-6 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground sm:flex', open && 'bg-secondary text-foreground')}
            >
                <ChevronDown className={cn('h-3.5 w-3.5 transition-transform', open && 'rotate-180')} />
            </Popover.Trigger>
            <Popover.Portal>
                <Popover.Content
                    align="start"
                    sideOffset={10}
                    className="chrome chrome-solid z-[70] w-72 rounded-xl p-1.5 data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=open]:zoom-in-95"
                    onKeyDown={(e) => {
                        if (e.key === 'Enter' && visible[0] && document.activeElement?.tagName === 'INPUT') go(visible[0].id);
                    }}
                >
                    <div className="relative mb-1">
                        <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
                        <input
                            autoFocus
                            value={query}
                            onChange={(e) => setQuery(e.target.value)}
                            onKeyDown={(e) => e.stopPropagation()}
                            placeholder="Find a board"
                            aria-label="Find a board"
                            className="h-8 w-full rounded-md bg-secondary/70 pl-8 pr-2 text-[13px] outline-none placeholder:text-muted-foreground"
                        />
                    </div>
                    {boards === null ? (
                        <div className="flex h-20 items-center justify-center text-muted-foreground">
                            <Loader2 className="h-4 w-4 animate-spin" />
                        </div>
                    ) : visible.length === 0 ? (
                        <p className="px-2.5 py-3 text-[12.5px] text-muted-foreground">{query ? 'No matching boards.' : 'No other boards yet.'}</p>
                    ) : (
                        <ul role="listbox" aria-label="Your boards">
                            {visible.map((b) => (
                                <li key={b.id}>
                                    <button
                                        type="button"
                                        role="option"
                                        aria-selected={b.id === roomId}
                                        onClick={() => go(b.id)}
                                        className="flex w-full items-center gap-2.5 rounded-md px-2.5 py-[7px] text-left text-[13px] outline-none transition-colors hover:bg-secondary focus-visible:bg-secondary"
                                    >
                                        <span className={cn('h-1.5 w-1.5 shrink-0 rounded-full', b.id === roomId ? 'bg-accent' : 'bg-transparent')} />
                                        <span className={cn('min-w-0 flex-1 truncate', !b.title && 'text-muted-foreground')}>{b.title || 'Untitled board'}</span>
                                        <span className="shrink-0 text-[11.5px] text-muted-foreground">{relativeTime(b.updatedAt)}</span>
                                    </button>
                                </li>
                            ))}
                        </ul>
                    )}
                    <div className="mt-1 flex gap-1 border-t border-border/70 pt-1.5">
                        <Link to="/boards" onClick={() => setOpen(false)} className="flex flex-1 items-center gap-2 rounded-md px-2.5 py-[7px] text-[13px] transition-colors hover:bg-secondary">
                            <LayoutGrid className="h-4 w-4 opacity-80" strokeWidth={1.75} />
                            All boards
                        </Link>
                        <button
                            type="button"
                            disabled={creating}
                            onClick={async () => {
                                setCreating(true);
                                try {
                                    const { board } = await api<{ board: { id: string } }>('/boards', { method: 'POST', body: {} });
                                    go(board.id);
                                } catch {
                                    useBoard.getState().notify('Could not create a board', 'error');
                                } finally {
                                    setCreating(false);
                                }
                            }}
                            className="flex items-center gap-2 rounded-md px-2.5 py-[7px] text-[13px] transition-colors hover:bg-secondary"
                        >
                            {creating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4 opacity-80" strokeWidth={1.75} />}
                            New
                        </button>
                    </div>
                </Popover.Content>
            </Popover.Portal>
        </Popover.Root>
    );
}
