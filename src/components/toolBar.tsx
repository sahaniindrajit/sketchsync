import { ArrowUpRight, ChevronUp, Circle, Diamond, Download, Eraser, Hand, ImagePlus, Minus, MoreHorizontal, MousePointer2, Pencil, Sigma, Square, Type } from 'lucide-react';
import { AnimatePresence, motion } from 'motion/react';
import React, { useEffect, useRef, useState } from 'react';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { Kbd } from '@/components/ui/kbd';
import { useBoard, type Tool } from '@/board/store';
import { useMedia } from '@/lib/useMedia';
import { cn } from '@/lib/utils';

type ToolDef = { id: Tool; icon: typeof Hand; label: string; shortcut: string };

const T: Record<string, ToolDef> = {
    select: { id: 'select', icon: MousePointer2, label: 'Select', shortcut: 'V' },
    hand: { id: 'hand', icon: Hand, label: 'Pan', shortcut: 'H' },
    pencil: { id: 'pencil', icon: Pencil, label: 'Pencil', shortcut: 'P' },
    rect: { id: 'rect', icon: Square, label: 'Rectangle', shortcut: 'R' },
    ellipse: { id: 'ellipse', icon: Circle, label: 'Ellipse', shortcut: 'O' },
    diamond: { id: 'diamond', icon: Diamond, label: 'Diamond', shortcut: 'D' },
    arrow: { id: 'arrow', icon: ArrowUpRight, label: 'Arrow', shortcut: 'A' },
    line: { id: 'line', icon: Minus, label: 'Line', shortcut: 'L' },
    text: { id: 'text', icon: Type, label: 'Text', shortcut: 'T' },
    math: { id: 'math', icon: Sigma, label: 'Math (LaTeX)', shortcut: 'M' },
    eraser: { id: 'eraser', icon: Eraser, label: 'Eraser', shortcut: 'E' },
};

const desktopGroups: ToolDef[][] = [
    [T.select, T.hand],
    [T.pencil, T.rect, T.ellipse, T.diamond, T.arrow, T.line],
    [T.text, T.math, T.eraser],
];
const shapeTools = [T.rect, T.ellipse, T.diamond, T.arrow, T.line];

const Divider = () => <div className="mx-1 h-5 w-px shrink-0 bg-border" aria-hidden />;

const DockButton = React.forwardRef<
    HTMLButtonElement,
    { label: string; shortcut?: string; active?: boolean; children: React.ReactNode; tip?: boolean } & React.ButtonHTMLAttributes<HTMLButtonElement>
>(function DockButton({ label, shortcut, active, children, tip = true, className, ...props }, ref) {
    const button = (
        <button
            ref={ref}
            type="button"
            aria-label={label}
            className={cn(
                'group relative flex h-10 w-10 shrink-0 items-center justify-center rounded-[10px] outline-none focus-visible:ring-2 focus-visible:ring-ring',
                active ? 'text-accent' : 'text-muted-foreground transition-colors duration-150 hover:bg-secondary hover:text-foreground',
                className,
            )}
            {...props}
        >
            {active && (
                <motion.span
                    layoutId="dock-active"
                    className="absolute inset-0 rounded-[10px] bg-accent/[0.12] ring-1 ring-inset ring-accent/20"
                    transition={{ type: 'spring', visualDuration: 0.26, bounce: 0.12 }}
                />
            )}
            <span className="relative transition-transform duration-150 group-active:scale-90">{children}</span>
            {shortcut && (
                <span className="pointer-events-none absolute bottom-[3px] right-[4px] text-[9px] font-medium leading-none text-muted-foreground/80 [@media(hover:none)]:hidden">{shortcut}</span>
            )}
        </button>
    );
    if (!tip) return button;
    return (
        <Tooltip>
            <TooltipTrigger asChild>{button}</TooltipTrigger>
            <TooltipContent side="top">
                {label}
                {shortcut && <Kbd>{shortcut}</Kbd>}
            </TooltipContent>
        </Tooltip>
    );
});

/** A small tray of extra tools that rises out of the dock (phones). */
function Tray({ open, onClose, children, align = 'left' }: { open: boolean; onClose: () => void; children: React.ReactNode; align?: 'left' | 'right' }) {
    const ref = useRef<HTMLDivElement>(null);
    useEffect(() => {
        if (!open) return;
        const away = (e: PointerEvent) => !ref.current?.parentElement?.contains(e.target as Node) && onClose();
        document.addEventListener('pointerdown', away);
        return () => document.removeEventListener('pointerdown', away);
    }, [open, onClose]);
    return (
        <AnimatePresence>
            {open && (
                <motion.div
                    ref={ref}
                    initial={{ opacity: 0, y: 8, scale: 0.96 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: 6, scale: 0.97, transition: { duration: 0.12 } }}
                    style={{ transformOrigin: align === 'right' ? 'bottom right' : 'bottom left' }}
                    className={cn('chrome absolute bottom-full mb-3 flex items-center gap-0.5 rounded-2xl p-1.5', align === 'right' ? 'right-0' : 'left-0')}
                    role="menu"
                >
                    {children}
                </motion.div>
            )}
        </AnimatePresence>
    );
}

interface ToolbarProps {
    onImage: (file: File) => void;
    onDownload: () => void;
}

export const Toolbar = React.memo(function Toolbar({ onImage, onDownload }: ToolbarProps) {
    const selectedTool = useBoard((s) => s.tool);
    const setTool = useBoard((s) => s.setTool);
    const fileRef = useRef<HTMLInputElement>(null);
    const compact = useMedia('(max-width: 639px)');
    const [lastShape, setLastShape] = useState<ToolDef>(T.rect);
    const [tray, setTray] = useState<'shapes' | 'more' | null>(null);

    useEffect(() => {
        const shape = shapeTools.find((t) => t.id === selectedTool);
        if (shape) setLastShape(shape);
    }, [selectedTool]);

    const toolButton = (tool: ToolDef, opts?: { tip?: boolean; onPick?: () => void }) => (
        <DockButton
            key={tool.id}
            label={tool.label}
            shortcut={tool.shortcut}
            active={selectedTool === tool.id}
            aria-pressed={selectedTool === tool.id}
            data-tool={tool.id}
            tip={opts?.tip}
            onClick={() => {
                setTool(tool.id);
                opts?.onPick?.();
            }}
        >
            <tool.icon className="h-[18px] w-[18px]" strokeWidth={1.75} />
        </DockButton>
    );

    const shapeActive = shapeTools.some((t) => t.id === selectedTool);

    return (
        <motion.div
            initial={{ y: 24, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ type: 'spring', visualDuration: 0.45, bounce: 0.15, delay: 0.05 }}
            style={{ x: '-50%' }}
            className="fixed bottom-[max(12px,env(safe-area-inset-bottom))] left-1/2 z-20 w-max max-w-[calc(100vw-1.5rem)]"
        >
            <div className="chrome relative flex items-center gap-0.5 rounded-2xl p-1.5" role="toolbar" aria-label="Drawing tools" data-testid="toolbar">
                {compact ? (
                    <>
                        {toolButton(T.select, { tip: false })}
                        {toolButton(T.hand, { tip: false })}
                        <Divider />
                        {toolButton(T.pencil, { tip: false })}
                        <div className="relative flex">
                            <DockButton
                                label={lastShape.label}
                                active={shapeActive}
                                aria-pressed={shapeActive}
                                data-tool={lastShape.id}
                                tip={false}
                                onClick={() => {
                                    if (shapeActive) setTray((t) => (t === 'shapes' ? null : 'shapes'));
                                    else setTool(lastShape.id);
                                }}
                            >
                                <lastShape.icon className="h-[18px] w-[18px]" strokeWidth={1.75} />
                                <ChevronUp className="absolute -right-1 -top-1 h-2.5 w-2.5 opacity-60" strokeWidth={3} />
                            </DockButton>
                            <Tray open={tray === 'shapes'} onClose={() => setTray(null)}>
                                {shapeTools.filter((t) => t.id !== lastShape.id).map((t) => (
                                    <DockButton key={t.id} label={t.label} tip={false} role="menuitem" onClick={() => { setTool(t.id); setTray(null); }}>
                                        <t.icon className="h-[18px] w-[18px]" strokeWidth={1.75} />
                                    </DockButton>
                                ))}
                            </Tray>
                        </div>
                        {toolButton(T.text, { tip: false })}
                        {toolButton(T.eraser, { tip: false })}
                        <Divider />
                        <div className="relative flex">
                            <DockButton label="More tools" tip={false} active={selectedTool === 'math'} aria-expanded={tray === 'more'} onClick={() => setTray((t) => (t === 'more' ? null : 'more'))}>
                                <MoreHorizontal className="h-[18px] w-[18px]" strokeWidth={1.75} />
                            </DockButton>
                            <Tray align="right" open={tray === 'more'} onClose={() => setTray(null)}>
                                    {toolButton(T.math, { tip: false, onPick: () => setTray(null) })}
                                    <DockButton label="Insert image" tip={false} role="menuitem" onClick={() => { setTray(null); fileRef.current?.click(); }}>
                                        <ImagePlus className="h-[18px] w-[18px]" strokeWidth={1.75} />
                                    </DockButton>
                                    <DockButton label="Download PNG" tip={false} role="menuitem" onClick={() => { setTray(null); onDownload(); }}>
                                        <Download className="h-[18px] w-[18px]" strokeWidth={1.75} />
                                    </DockButton>
                            </Tray>
                        </div>
                    </>
                ) : (
                    <>
                        {desktopGroups.map((group, i) => (
                            <React.Fragment key={i}>
                                {i > 0 && <Divider />}
                                {group.map((tool) => toolButton(tool))}
                            </React.Fragment>
                        ))}
                        <Divider />
                        <DockButton label="Insert image" onClick={() => fileRef.current?.click()}>
                            <ImagePlus className="h-[18px] w-[18px]" strokeWidth={1.75} />
                        </DockButton>
                        <DockButton label="Download PNG" onClick={onDownload}>
                            <Download className="h-[18px] w-[18px]" strokeWidth={1.75} />
                        </DockButton>
                    </>
                )}
                <input
                    type="file"
                    ref={fileRef}
                    className="hidden"
                    accept="image/png,image/jpeg,image/gif,image/webp"
                    data-testid="image-input"
                    onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) onImage(file);
                        // Reset so choosing the same file again still fires onChange.
                        e.target.value = '';
                    }}
                />
            </div>
        </motion.div>
    );
});
