import { Download, Menu, Redo2, Search, Undo2 } from 'lucide-react';
import { AnimatePresence, motion } from 'motion/react';
import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { LogoMark } from '@/components/logo';
import { Kbd } from '@/components/ui/kbd';
import { MOD } from '@/lib/platform';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { usePresence } from '@/board/presence';
import { useHistory } from '@/board/history';
import { redoLast, undoLast, useCanUndo } from '@/board/store';
import { cn } from '@/lib/utils';
import { useMedia } from '@/lib/useMedia';
import { AppMenu, type MenuActions } from './menu';

function IconButton({ label, onClick, disabled, children }: { label: string; onClick: () => void; disabled?: boolean; children: React.ReactNode }) {
    return (
        <button
            type="button"
            aria-label={label}
            aria-disabled={disabled || undefined}
            onClick={disabled ? undefined : onClick}
            className="flex h-9 w-9 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground aria-disabled:opacity-35"
        >
            {children}
        </button>
    );
}

export function TopBar({ actions, onCommand }: { actions: MenuActions; onCommand: () => void }) {
    const [showMenu, setShowMenu] = useState(false);
    const compact = useMedia('(max-width: 639px)');
    const canUndo = useCanUndo();
    const canRedo = useHistory((s) => s.redo.length > 0);
    const [viaKeyboard, setViaKeyboard] = useState(false);
    const containerRef = useRef<HTMLDivElement>(null);
    const triggerRef = useRef<HTMLButtonElement>(null);

    useEffect(() => {
        if (!showMenu) return;
        function handleClickOutside(event: PointerEvent) {
            if (containerRef.current && !containerRef.current.contains(event.target as Node)) setShowMenu(false);
        }
        document.addEventListener('pointerdown', handleClickOutside);
        return () => document.removeEventListener('pointerdown', handleClickOutside);
    }, [showMenu]);

    return (
        <motion.div
            initial={{ y: -12, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            className="fixed left-[max(12px,env(safe-area-inset-left))] top-[max(12px,env(safe-area-inset-top))] z-50"
            ref={containerRef}
        >
            <div className="chrome flex h-11 items-center gap-0.5 rounded-xl p-1">
                <button
                    ref={triggerRef}
                    type="button"
                    aria-label="Menu"
                    aria-haspopup="menu"
                    aria-expanded={showMenu}
                    className={cn(
                        'flex h-9 w-9 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring',
                        showMenu && 'bg-secondary text-foreground',
                    )}
                    onClick={(e) => {
                        setViaKeyboard(e.detail === 0);
                        if (!showMenu) window.dispatchEvent(new Event('sketchsync:menu-open'));
                        setShowMenu((v) => !v);
                    }}
                >
                    <Menu className="h-[18px] w-[18px]" strokeWidth={1.75} />
                </button>
                <Link to="/" className="hidden items-center rounded-lg px-1.5 py-1 transition-colors hover:bg-secondary sm:flex" title="SketchSync home">
                    <LogoMark className="h-5 w-5" />
                </Link>
                {compact && (
                <div className="flex items-center">
                    <IconButton label="Undo" onClick={undoLast} disabled={!canUndo}>
                        <Undo2 className="h-[17px] w-[17px]" strokeWidth={1.75} />
                    </IconButton>
                    <IconButton label="Redo" onClick={redoLast} disabled={!canRedo}>
                        <Redo2 className="h-[17px] w-[17px]" strokeWidth={1.75} />
                    </IconButton>
                </div>
                )}
                <BoardTitle />
                <div className="mx-1 hidden h-5 w-px bg-border sm:block" />
                <Tooltip>
                    <TooltipTrigger asChild>
                        <button
                            type="button"
                            aria-label="Command palette"
                            onClick={onCommand}
                            className="hidden h-9 items-center gap-1.5 rounded-lg px-2 text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground sm:flex"
                        >
                            <Search className="h-4 w-4" strokeWidth={1.75} />
                            <Kbd>{MOD}</Kbd>
                            <Kbd>K</Kbd>
                        </button>
                    </TooltipTrigger>
                    <TooltipContent side="bottom">Search tools & actions</TooltipContent>
                </Tooltip>
                <Tooltip>
                    <TooltipTrigger asChild>
                        <button
                            type="button"
                            aria-label="Download PNG"
                            onClick={actions.onExport}
                            className="hidden h-9 w-9 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground sm:flex"
                        >
                            <Download className="h-[17px] w-[17px]" strokeWidth={1.75} />
                        </button>
                    </TooltipTrigger>
                    <TooltipContent side="bottom">Export as PNG</TooltipContent>
                </Tooltip>
            </div>
            <AnimatePresence>{showMenu && (
                    <AppMenu
                        actions={actions}
                        viaKeyboard={viaKeyboard}
                        onClose={(opts) => {
                            setShowMenu(false);
                            if (opts?.refocus) triggerRef.current?.focus();
                        }}
                    />
                )}</AnimatePresence>
        </motion.div>
    );
}

/** The board's name. Editing it updates everyone on the board. */
function BoardTitle() {
    const title = usePresence((s) => s.title);
    const [editing, setEditing] = useState(false);
    useEffect(() => {
        const start = () => setEditing(true);
        window.addEventListener('sketchsync:rename', start);
        return () => window.removeEventListener('sketchsync:rename', start);
    }, []);
    const commit = (value: string) => {
        setEditing(false);
        if (value.trim() === (title || 'Untitled board')) return;
        usePresence.getState().setTitle(value);
        usePresence.getState().announce();
    };
    if (editing) {
        return (
            <input
                autoFocus
                defaultValue={title || 'Untitled board'}
                maxLength={60}
                aria-label="Board name"
                placeholder="Untitled board"
                onFocus={(e) => e.currentTarget.select()}
                onBlur={(e) => commit(e.currentTarget.value)}
                onKeyDown={(e) => {
                    e.stopPropagation();
                    if (e.key === 'Enter') commit(e.currentTarget.value);
                    if (e.key === 'Escape') setEditing(false);
                }}
                className="h-8 w-[180px] rounded-md border border-ring bg-card px-2 text-[13px] font-medium outline-none ring-[3px] ring-ring/15 max-sm:fixed max-sm:left-3 max-sm:right-3 max-sm:top-[64px] max-sm:z-50 max-sm:h-11 max-sm:w-auto max-sm:text-[15px] max-sm:shadow-lift"
            />
        );
    }
    return (
        <button
            type="button"
            onClick={() => setEditing(true)}
            title="Rename board"
            className={cn('hidden h-8 max-w-[220px] truncate rounded-md px-2 text-[13px] font-medium transition-colors hover:bg-secondary sm:block', !title && 'text-muted-foreground')}
        >
            {title || 'Untitled board'}
        </button>
    );
}
