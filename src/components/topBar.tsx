import { Menu, Search } from 'lucide-react';
import { AnimatePresence, motion } from 'motion/react';
import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { LogoMark } from '@/components/logo';
import { Kbd } from '@/components/ui/kbd';
import { MOD } from '@/lib/platform';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { useBoard } from '@/board/store';
import { cn } from '@/lib/utils';
import { AppMenu, type MenuActions } from './menu';

export function TopBar({ actions, onCommand }: { actions: MenuActions; onCommand: () => void }) {
    const [showMenu, setShowMenu] = useState(false);
    const containerRef = useRef<HTMLDivElement>(null);
    const roomId = useBoard((s) => s.roomId);

    useEffect(() => {
        if (!showMenu) return;
        function handleClickOutside(event: PointerEvent) {
            if (containerRef.current && !containerRef.current.contains(event.target as Node)) setShowMenu(false);
        }
        function onKey(e: KeyboardEvent) {
            if (e.key === 'Escape') setShowMenu(false);
        }
        document.addEventListener('pointerdown', handleClickOutside);
        document.addEventListener('keydown', onKey);
        return () => {
            document.removeEventListener('pointerdown', handleClickOutside);
            document.removeEventListener('keydown', onKey);
        };
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
                    type="button"
                    aria-label="Menu"
                    aria-expanded={showMenu}
                    className={cn(
                        'flex h-9 w-9 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground',
                        showMenu && 'bg-secondary text-foreground',
                    )}
                    onClick={() => setShowMenu((v) => !v)}
                >
                    <Menu className="h-[18px] w-[18px]" strokeWidth={1.75} />
                </button>
                <Link to="/" className="flex items-center gap-2 rounded-lg px-1.5 py-1 transition-colors hover:bg-secondary" title="SketchSync home">
                    <LogoMark className="h-5 w-5" />
                    <span className="hidden text-[13px] font-semibold tracking-tightish sm:inline">SketchSync</span>
                </Link>
                {roomId && (
                    <span className="hidden select-all pr-1 font-mono text-[11px] text-muted-foreground md:inline" title="Board id">
                        /{roomId.slice(0, 8)}
                    </span>
                )}
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
            <AnimatePresence>{showMenu && <AppMenu actions={actions} onClose={() => setShowMenu(false)} />}</AnimatePresence>
        </motion.div>
    );
}
