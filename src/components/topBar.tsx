import { Menu, Search } from 'lucide-react';
import { AnimatePresence, motion } from 'motion/react';
import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { LogoMark } from '@/components/logo';
import { Kbd } from '@/components/ui/kbd';
import { MOD } from '@/lib/platform';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { usePresence } from '@/board/presence';
import { cn } from '@/lib/utils';
import { AppMenu, type MenuActions } from './menu';

export function TopBar({ actions, onCommand }: { actions: MenuActions; onCommand: () => void }) {
    const [showMenu, setShowMenu] = useState(false);
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
                <Link to="/" className="flex items-center gap-2 rounded-lg px-1.5 py-1 transition-colors hover:bg-secondary" title="SketchSync home">
                    <LogoMark className="h-5 w-5" />
                </Link>
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
    const commit = (value: string) => {
        setEditing(false);
        if (value.trim() === title) return;
        usePresence.getState().setTitle(value);
        usePresence.getState().announce();
    };
    if (editing) {
        return (
            <input
                autoFocus
                defaultValue={title}
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
                className="h-8 w-[180px] rounded-md border border-ring bg-card px-2 text-[13px] font-medium outline-none ring-[3px] ring-ring/15"
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
