import { Bot, FilePlus2, Github, HelpCircle, ImageDown, Maximize, Moon, Sun, Trash2, Users } from 'lucide-react';
import { motion } from 'motion/react';
import React, { useEffect, useRef } from 'react';
import { Kbd } from '@/components/ui/kbd';
import { useTheme } from '@/lib/theme';
import { cn } from '@/lib/utils';

export interface MenuActions {
    onExport: () => void;
    onShare: () => void;
    onConnectAi: () => void;
    onNewBoard: () => void;
    onReset: () => void;
    onFit?: () => void;
}

type Item = { icon: typeof Bot; label: string; onClick: () => void; hint?: string; danger?: boolean; external?: boolean };

export const AppMenu = React.memo(function AppMenu({ actions, onClose }: { actions: MenuActions; onClose: (opts?: { refocus?: boolean }) => void }) {
    const ref = useRef<HTMLDivElement>(null);
    useEffect(() => {
        ref.current?.querySelector<HTMLElement>('[role="menuitem"]')?.focus();
    }, []);
    const onKeyDown = (e: React.KeyboardEvent) => {
        const items = Array.from(ref.current?.querySelectorAll<HTMLElement>('[role="menuitem"]') ?? []);
        const i = items.indexOf(document.activeElement as HTMLElement);
        if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
            e.preventDefault();
            const next = e.key === 'ArrowDown' ? (i + 1) % items.length : (i - 1 + items.length) % items.length;
            items[next]?.focus();
        } else if (e.key === 'Home' || e.key === 'End') {
            e.preventDefault();
            items[e.key === 'Home' ? 0 : items.length - 1]?.focus();
        } else if (e.key === 'Tab') {
            onClose();
        } else if (e.key === 'Escape') {
            e.stopPropagation();
            onClose({ refocus: true });
        }
    };
    const open = (url: string) => window.open(url, '_blank', 'noopener');
    const theme = useTheme((s) => s.resolved);
    const toggleTheme = useTheme((s) => s.toggle);
    const sections: Item[][] = [
        [
            { icon: Users, label: 'Share & collaborate', onClick: actions.onShare },
            { icon: Bot, label: 'Connect your AI', onClick: actions.onConnectAi },
            { icon: ImageDown, label: 'Export image', onClick: actions.onExport },
            ...(actions.onFit ? [{ icon: Maximize, label: 'Zoom to fit', onClick: actions.onFit, hint: '⇧1' }] : []),
        ],
        [
            { icon: FilePlus2, label: 'New board', onClick: actions.onNewBoard },
            { icon: theme === 'dark' ? Sun : Moon, label: theme === 'dark' ? 'Light mode' : 'Dark mode', onClick: toggleTheme, hint: '⇧D' },
            { icon: Trash2, label: 'Reset the canvas', onClick: actions.onReset, danger: true },
        ],
        [
            { icon: HelpCircle, label: 'Help', onClick: () => open('https://github.com/sahaniindrajit/sketchsync/issues'), external: true },
            { icon: Github, label: 'GitHub', onClick: () => open('https://github.com/sahaniindrajit/sketchsync'), external: true },
        ],
    ];

    return (
        <motion.div
            initial={{ opacity: 0, scale: 0.96, y: -4 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.97, y: -2, transition: { duration: 0.12 } }}
            style={{ transformOrigin: 'top left' }}
            ref={ref}
            onKeyDown={onKeyDown}
            className="chrome absolute left-0 top-full z-50 mt-2 w-60 rounded-xl p-1.5"
            role="menu"
            aria-label="Board actions"
        >
            {sections.map((items, i) => (
                <div key={i} className={cn(i > 0 && 'mt-1.5 border-t border-border/70 pt-1.5')}>
                    {items.map((item) => (
                        <button
                            key={item.label}
                            role="menuitem"
                            className={cn(
                                'group flex w-full items-center gap-2.5 rounded-md px-2.5 py-[7px] text-[13px] outline-none transition-colors focus-visible:bg-secondary',
                                item.danger ? 'text-destructive hover:bg-destructive/10' : item.external ? 'text-muted-foreground hover:bg-secondary hover:text-foreground' : 'text-foreground hover:bg-secondary',
                            )}
                            tabIndex={-1}
                            onClick={() => {
                                onClose();
                                item.onClick();
                            }}
                        >
                            <item.icon className="h-4 w-4 shrink-0 opacity-80" strokeWidth={1.75} />
                            <span className="flex-1 text-left">{item.label}</span>
                            {item.hint && <Kbd>{item.hint}</Kbd>}
                        </button>
                    ))}
                </div>
            ))}
        </motion.div>
    );
});
