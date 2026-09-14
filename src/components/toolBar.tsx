import { ArrowRight, Circle, Diamond, Download, Eraser, Hand, Image, Minus, MousePointer2, Pencil, Sigma, Square, Type } from 'lucide-react';
import React, { useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { useBoard, type Tool } from '@/board/store';

const tools: { id: Tool; icon: typeof Hand; label: string; shortcut: string }[] = [
    { id: 'select', icon: MousePointer2, label: 'Select', shortcut: 'V' },
    { id: 'hand', icon: Hand, label: 'Pan', shortcut: 'H' },
    { id: 'rect', icon: Square, label: 'Rectangle', shortcut: 'R' },
    { id: 'ellipse', icon: Circle, label: 'Ellipse', shortcut: 'O' },
    { id: 'diamond', icon: Diamond, label: 'Diamond', shortcut: 'D' },
    { id: 'arrow', icon: ArrowRight, label: 'Arrow', shortcut: 'A' },
    { id: 'line', icon: Minus, label: 'Line', shortcut: 'L' },
    { id: 'pencil', icon: Pencil, label: 'Pencil', shortcut: 'P' },
    { id: 'text', icon: Type, label: 'Text', shortcut: 'T' },
    { id: 'math', icon: Sigma, label: 'Math (LaTeX)', shortcut: 'M' },
    { id: 'eraser', icon: Eraser, label: 'Eraser', shortcut: 'E' },
];

interface ToolbarProps {
    onImage: (file: File) => void;
    onDownload: () => void;
}

export const Toolbar = React.memo(function Toolbar({ onImage, onDownload }: ToolbarProps) {
    const selectedTool = useBoard((s) => s.tool);
    const setTool = useBoard((s) => s.setTool);
    const fileRef = useRef<HTMLInputElement>(null);

    return (
        <div
            className="fixed top-16 sm:top-4 left-1/2 z-10 flex max-w-[calc(100vw-2rem)] sm:max-w-[calc(100vw-7rem)] -translate-x-1/2 items-center gap-0.5 overflow-x-auto rounded-lg border bg-white p-1 shadow-sm"
            data-testid="toolbar"
        >
            {tools.map((tool) => (
                <Tooltip key={tool.id}>
                    <TooltipTrigger asChild>
                        <Button
                            variant={selectedTool === tool.id ? 'secondary' : 'ghost'}
                            size="icon"
                            aria-label={tool.label}
                            aria-pressed={selectedTool === tool.id}
                            data-tool={tool.id}
                            onClick={() => setTool(tool.id)}
                            className={`h-9 w-9 shrink-0 ${selectedTool === tool.id ? 'bg-indigo-100 text-indigo-700 hover:bg-indigo-100' : ''}`}
                        >
                            <tool.icon className="h-5 w-5" />
                        </Button>
                    </TooltipTrigger>
                    <TooltipContent>
                        <p>
                            {tool.label} <span className="text-gray-400">{tool.shortcut}</span>
                        </p>
                    </TooltipContent>
                </Tooltip>
            ))}
            <div className="mx-1 h-6 w-px shrink-0 bg-gray-200" />
            <Tooltip>
                <TooltipTrigger asChild>
                    <Button variant="ghost" size="icon" aria-label="Insert image" className="h-9 w-9 shrink-0" onClick={() => fileRef.current?.click()}>
                        <Image className="h-5 w-5" />
                    </Button>
                </TooltipTrigger>
                <TooltipContent>
                    <p>Insert image</p>
                </TooltipContent>
            </Tooltip>
            <Tooltip>
                <TooltipTrigger asChild>
                    <Button variant="ghost" size="icon" aria-label="Download PNG" className="h-9 w-9 shrink-0" onClick={onDownload}>
                        <Download className="h-5 w-5" />
                    </Button>
                </TooltipTrigger>
                <TooltipContent>
                    <p>Download PNG</p>
                </TooltipContent>
            </Tooltip>
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
    );
});
