import { Command } from 'cmdk';
import { ArrowUpRight, Circle, Diamond, Eraser, FilePlus2, Hand, ImageDown, Link2, Maximize, Minus, Moon, MousePointer2, Pencil, Redo2, Sigma, Sparkles, Square, Sun, Trash2, Type, Undo2 } from 'lucide-react';
import { Kbd } from '@/components/ui/kbd';
import { redoLast, undoAiBatch, undoLast, useBoard, type Tool } from '@/board/store';
import { MOD } from '@/lib/platform';
import { cn } from '@/lib/utils';
import { useTheme } from '@/lib/theme';
import type { MenuActions } from './menu';

const tools: { id: Tool; icon: typeof Hand; label: string; key: string }[] = [
    { id: 'select', icon: MousePointer2, label: 'Select', key: 'V' },
    { id: 'hand', icon: Hand, label: 'Pan', key: 'H' },
    { id: 'pencil', icon: Pencil, label: 'Pencil', key: 'P' },
    { id: 'rect', icon: Square, label: 'Rectangle', key: 'R' },
    { id: 'ellipse', icon: Circle, label: 'Ellipse', key: 'O' },
    { id: 'diamond', icon: Diamond, label: 'Diamond', key: 'D' },
    { id: 'arrow', icon: ArrowUpRight, label: 'Arrow', key: 'A' },
    { id: 'line', icon: Minus, label: 'Line', key: 'L' },
    { id: 'text', icon: Type, label: 'Text', key: 'T' },
    { id: 'math', icon: Sigma, label: 'Math (LaTeX)', key: 'M' },
    { id: 'eraser', icon: Eraser, label: 'Eraser', key: 'E' },
];

const itemClass =
    'flex cursor-pointer items-center gap-2.5 rounded-lg px-2.5 py-2 text-[13px] text-muted-foreground outline-none transition-colors data-[selected=true]:bg-secondary data-[selected=true]:text-foreground [&>svg]:h-4 [&>svg]:w-4 [&>svg]:shrink-0';
const groupClass = '[&_[cmdk-group-heading]]:px-2.5 [&_[cmdk-group-heading]]:pb-1 [&_[cmdk-group-heading]]:pt-2.5 [&_[cmdk-group-heading]]:font-mono [&_[cmdk-group-heading]]:text-[10.5px] [&_[cmdk-group-heading]]:uppercase [&_[cmdk-group-heading]]:tracking-[0.06em] [&_[cmdk-group-heading]]:text-muted-foreground/80';

export function CommandPalette({ open, onOpenChange, actions, onFit }: { open: boolean; onOpenChange: (open: boolean) => void; actions: MenuActions; onFit: () => void }) {
    const setTool = useBoard((s) => s.setTool);
    const aiUndo = useBoard((s) => (s.aiActivity?.undo.length ? s.aiActivity.name : null));
    const theme = useTheme((s) => s.resolved);
    const toggleTheme = useTheme((s) => s.toggle);


    const run = (fn: () => void) => () => {
        onOpenChange(false);
        fn();
    };

    return (
        <Command.Dialog
            open={open}
            onOpenChange={onOpenChange}
            label="Command palette"
            loop
            filter={(value, search, keywords) => {
                const q = search.trim().toLowerCase();
                if (!q) return 1;
                const hay = [value, ...(keywords ?? [])].join(' ').toLowerCase();
                if (hay.startsWith(q)) return 1;
                if (hay.split(/[\s()/…-]+/).some((w) => w.startsWith(q))) return 0.8;
                return hay.includes(q) ? 0.5 : 0;
            }}
            overlayClassName="fixed inset-0 z-[80] bg-[hsl(225_15%_6%/0.12)] dark:bg-black/45 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=open]:fade-in-0 data-[state=closed]:fade-out-0 data-[state=closed]:duration-100"
            contentClassName="fixed inset-x-0 top-[14vh] z-[81] mx-auto w-[calc(100vw-2rem)] max-w-[520px] overflow-hidden rounded-2xl border border-border bg-popover shadow-lift outline-none data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=open]:fade-in-0 data-[state=closed]:fade-out-0 data-[state=open]:zoom-in-[0.97] data-[state=closed]:zoom-out-[0.98] data-[state=open]:slide-in-from-top-2 data-[state=open]:duration-200 data-[state=closed]:duration-100"
        >
            <div className="flex items-center gap-2 border-b border-border px-4">
                <Command.Input autoFocus placeholder="Search tools and actions…" className="h-12 flex-1 bg-transparent text-[15px] outline-none placeholder:text-muted-foreground" />
                <Kbd>esc</Kbd>
            </div>
            <Command.List className="h-[min(var(--cmdk-list-height),min(380px,60vh))] overflow-y-auto overscroll-contain p-1.5 pb-6 transition-[height] duration-200 ease-out [mask-image:linear-gradient(to_bottom,#000_calc(100%-16px),transparent)]">
                <Command.Empty className="px-3 py-8 text-center text-sm text-muted-foreground">No matching commands.</Command.Empty>
                <Command.Group heading="Board" className={groupClass}>
                    <Command.Item className={itemClass} onSelect={run(actions.onConnectAi)} keywords={['mcp', 'claude', 'cursor', 'agent']}>
                        <Sparkles className="text-claude" /> <span className="flex-1">Connect your AI…</span>
                    </Command.Item>
                    <Command.Item className={itemClass} onSelect={run(actions.onShare)} keywords={['invite', 'link', 'collaborate']}>
                        <Link2 /> <span className="flex-1">Share board link…</span>
                    </Command.Item>
                    <Command.Item className={itemClass} onSelect={run(actions.onExport)} keywords={['download', 'png', 'image']}>
                        <ImageDown /> <span className="flex-1">Export as PNG</span>
                    </Command.Item>
                    <Command.Item className={itemClass} onSelect={run(undoLast)} keywords={['back', 'revert']}>
                        <Undo2 /> <span className="flex-1">Undo</span> <Kbd>{MOD}</Kbd><Kbd>Z</Kbd>
                    </Command.Item>
                    {aiUndo && (
                        <Command.Item className={itemClass} onSelect={run(undoAiBatch)} keywords={['ai', 'claude', 'revert']}>
                            <Undo2 className="text-claude" /> <span className="flex-1">Undo {aiUndo}'s last change</span>
                        </Command.Item>
                    )}
                    <Command.Item className={itemClass} onSelect={run(redoLast)}>
                        <Redo2 /> <span className="flex-1">Redo</span> <Kbd>{MOD}</Kbd><Kbd>⇧</Kbd><Kbd>Z</Kbd>
                    </Command.Item>
                    <Command.Item className={itemClass} onSelect={run(onFit)} keywords={['zoom', 'fit']}>
                        <Maximize /> <span className="flex-1">Zoom to fit</span> <Kbd>⇧</Kbd><Kbd>1</Kbd>
                    </Command.Item>
                    <Command.Item className={itemClass} onSelect={run(toggleTheme)} keywords={['theme', 'dark', 'light']}>
                        {theme === 'dark' ? <Sun /> : <Moon />} <span className="flex-1">{theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}</span> <Kbd>⇧</Kbd><Kbd>D</Kbd>
                    </Command.Item>
                    <Command.Item className={itemClass} onSelect={run(actions.onNewBoard)}>
                        <FilePlus2 /> <span className="flex-1">New board</span>
                    </Command.Item>
                    <Command.Item className={cn(itemClass, 'text-destructive data-[selected=true]:bg-destructive/10 data-[selected=true]:text-destructive')} onSelect={run(actions.onReset)} keywords={['clear', 'delete']}>
                        <Trash2 /> <span className="flex-1">Reset the canvas</span>
                    </Command.Item>
                </Command.Group>
                <Command.Group heading="Tools" className={groupClass}>
                    {tools.map((t) => (
                        <Command.Item key={t.id} className={itemClass} onSelect={run(() => setTool(t.id))}>
                            <t.icon /> <span className="flex-1">{t.label}</span> <Kbd>{t.key}</Kbd>
                        </Command.Item>
                    ))}
                </Command.Group>
            </Command.List>
        </Command.Dialog>
    );
}
