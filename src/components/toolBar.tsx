import { ArrowUpRight, Circle, Diamond, Download, Eraser, Hand, ImagePlus, Minus, MousePointer2, Pencil, Sigma, Square, Type } from 'lucide-react';
import { motion } from 'motion/react';
import React, { useRef } from 'react';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { Kbd } from '@/components/ui/kbd';
import { useBoard, type Tool } from '@/board/store';
import { cn } from '@/lib/utils';

type ToolDef = { id: Tool; icon: typeof Hand; label: string; shortcut: string };

const groups: ToolDef[][] = [
    [
        { id: 'select', icon: MousePointer2, label: 'Select', shortcut: 'V' },
        { id: 'hand', icon: Hand, label: 'Pan', shortcut: 'H' },
    ],
    [
        { id: 'pencil', icon: Pencil, label: 'Pencil', shortcut: 'P' },
        { id: 'rect', icon: Square, label: 'Rectangle', shortcut: 'R' },
        { id: 'ellipse', icon: Circle, label: 'Ellipse', shortcut: 'O' },
        { id: 'diamond', icon: Diamond, label: 'Diamond', shortcut: 'D' },
        { id: 'arrow', icon: ArrowUpRight, label: 'Arrow', shortcut: 'A' },
        { id: 'line', icon: Minus, label: 'Line', shortcut: 'L' },
    ],
    [
        { id: 'text', icon: Type, label: 'Text', shortcut: 'T' },
        { id: 'math', icon: Sigma, label: 'Math (LaTeX)', shortcut: 'M' },
        { id: 'eraser', icon: Eraser, label: 'Eraser', shortcut: 'E' },
    ],
];

const Divider = () => <div className="mx-1 h-5 w-px shrink-0 bg-border" aria-hidden />;

function DockButton({
    label,
    shortcut,
    active,
    children,
    ...props
}: { label: string; shortcut?: string; active?: boolean; children: React.ReactNode } & React.ButtonHTMLAttributes<HTMLButtonElement>) {
    return (
        <Tooltip>
            <TooltipTrigger asChild>
                <button
                    type="button"
                    aria-label={label}
                    className={cn(
                        'group relative flex h-10 w-10 shrink-0 items-center justify-center rounded-[10px] outline-none transition-colors duration-150 focus-visible:ring-2 focus-visible:ring-ring',
                        active ? 'text-accent' : 'text-muted-foreground hover:bg-secondary hover:text-foreground',
                    )}
                    {...props}
                >
                    {active && (
                        <motion.span
                            layoutId="dock-active"
                            className="absolute inset-0 rounded-[10px] bg-accent/[0.12] ring-1 ring-inset ring-accent/20"
                            transition={{ type: 'spring', visualDuration: 0.28, bounce: 0.22 }}
                        />
                    )}
                    <span className="relative transition-transform duration-150 group-active:scale-90">{children}</span>
                    {shortcut && (
                        <span className="pointer-events-none absolute bottom-[3px] right-[4px] font-mono text-[8.5px] leading-none text-muted-foreground/60">{shortcut}</span>
                    )}
                </button>
            </TooltipTrigger>
            <TooltipContent side="top">
                {label}
                {shortcut && <Kbd>{shortcut}</Kbd>}
            </TooltipContent>
        </Tooltip>
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

    return (
        <motion.div
            initial={{ y: 24, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ type: 'spring', visualDuration: 0.45, bounce: 0.2, delay: 0.05 }}
            style={{ x: "-50%" }}
            className="fixed bottom-[max(12px,env(safe-area-inset-bottom))] left-1/2 z-20 w-max max-w-[calc(100vw-1.5rem)]"
        >
            <div
                className="chrome flex items-center gap-0.5 overflow-x-auto rounded-2xl p-1.5 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
                role="toolbar"
                aria-label="Drawing tools"
                data-testid="toolbar"
            >
                {groups.map((group, i) => (
                    <React.Fragment key={i}>
                        {i > 0 && <Divider />}
                        {group.map((tool) => (
                            <DockButton
                                key={tool.id}
                                label={tool.label}
                                shortcut={tool.shortcut}
                                active={selectedTool === tool.id}
                                aria-pressed={selectedTool === tool.id}
                                data-tool={tool.id}
                                onClick={() => setTool(tool.id)}
                            >
                                <tool.icon className="h-[18px] w-[18px]" strokeWidth={1.75} />
                            </DockButton>
                        ))}
                    </React.Fragment>
                ))}
                <Divider />
                <DockButton label="Insert image" onClick={() => fileRef.current?.click()}>
                    <ImagePlus className="h-[18px] w-[18px]" strokeWidth={1.75} />
                </DockButton>
                <DockButton label="Download PNG" onClick={onDownload}>
                    <Download className="h-[18px] w-[18px]" strokeWidth={1.75} />
                </DockButton>
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
