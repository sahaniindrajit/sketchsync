import { Check, Palette, X } from 'lucide-react';
import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Slider } from '@/components/ui/slider';
import { useBoard, type BoardState } from '@/board/store';
import type { Shape, ShapePatch } from '@/shared/protocol';

const strokeColors = ['#1e1e1e', '#e03131', '#2f9e44', '#1971c2', '#f08c00', '#9c36b5'];
const fillColors = ['transparent', '#ffc9c9', '#b2f2bb', '#a5d8ff', '#ffec99', '#eebefa'];
const palette = [
    '#ffffff', '#f8f9fa', '#868e96', '#343a40', '#000000',
    '#0c8599', '#1971c2', '#5f3dc4', '#c2255c', '#e64980',
    '#2b8a3e', '#66a80f', '#f08c00', '#e8590c', '#c92a2a',
];

type StyleKey = 'strokeColor' | 'fillColor' | 'strokeWidth' | 'fontSize';

const supports = (shape: Shape, key: StyleKey) => {
    switch (key) {
        case 'strokeColor':
            return shape.type !== 'image';
        case 'fillColor':
            return shape.type === 'rect' || shape.type === 'ellipse' || shape.type === 'diamond';
        case 'strokeWidth':
            return shape.type !== 'text' && shape.type !== 'math' && shape.type !== 'image';
        case 'fontSize':
            return shape.type === 'text' || shape.type === 'math';
    }
};

/** Updates the default style and applies it to the current selection. */
function applyStyle(key: StyleKey, value: string | number) {
    const state: BoardState = useBoard.getState();
    state.setStyle({ [key]: value });
    const patches: ShapePatch[] = [];
    for (const id of state.selectedIds) {
        const shape = state.shapes.get(id);
        if (shape && supports(shape, key)) patches.push({ id, changes: { [key]: value } });
    }
    if (patches.length) state.dispatch({ kind: 'update', patches });
}

const isTransparent = (c: string) => c === 'transparent';

function Swatch({ color, active, onClick, label }: { color: string; active: boolean; onClick: () => void; label: string }) {
    return (
        <button
            type="button"
            aria-label={label}
            title={label}
            className={`h-7 w-7 rounded-md border-2 ${active ? 'border-indigo-500' : 'border-gray-200'}`}
            style={
                isTransparent(color)
                    ? { backgroundImage: 'linear-gradient(45deg,#e5e7eb 25%,transparent 25%,transparent 75%,#e5e7eb 75%),linear-gradient(45deg,#e5e7eb 25%,transparent 25%,transparent 75%,#e5e7eb 75%)', backgroundSize: '8px 8px', backgroundPosition: '0 0,4px 4px' }
                    : { backgroundColor: color }
            }
            onClick={onClick}
        />
    );
}

export const DrawingSettings = React.memo(function DrawingSettings() {
    const strokeColor = useBoard((s) => s.strokeColor);
    const fillColor = useBoard((s) => s.fillColor);
    const strokeWidth = useBoard((s) => s.strokeWidth);
    const fontSize = useBoard((s) => s.fontSize);
    const [open, setOpen] = useState(() => window.innerWidth >= 768);
    const [picker, setPicker] = useState<'strokeColor' | 'fillColor' | null>(null);
    const [hex, setHex] = useState('#f08c00');
    const hexValid = /^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/.test(hex);

    if (!open) {
        return (
            <Button variant="outline" size="icon" aria-label="Show style panel" className="h-10 w-10 rounded-full bg-white shadow-md" onClick={() => setOpen(true)}>
                <Palette className="h-5 w-5" />
            </Button>
        );
    }

    return (
        <div className="flex flex-col gap-3" data-testid="style-panel">
            <Card className="relative w-56 space-y-4 bg-white/95 p-3 shadow-lg backdrop-blur-sm">
                <button type="button" aria-label="Hide style panel" className="absolute right-2 top-2 text-gray-400 hover:text-gray-700" onClick={() => setOpen(false)}>
                    <X className="h-4 w-4" />
                </button>
                <div className="space-y-2">
                    <h3 className="text-xs font-medium text-gray-600">Stroke</h3>
                    <div className="flex flex-wrap gap-1.5">
                        {strokeColors.map((c) => (
                            <Swatch key={c} color={c} label={`Stroke ${c}`} active={strokeColor.toLowerCase() === c} onClick={() => applyStyle('strokeColor', c)} />
                        ))}
                        <Button variant="outline" size="icon" aria-label="More stroke colors" className="h-7 w-7" onClick={() => setPicker((p) => (p === 'strokeColor' ? null : 'strokeColor'))}>
                            <Palette className="h-3.5 w-3.5" />
                        </Button>
                    </div>
                </div>
                <div className="space-y-2">
                    <h3 className="text-xs font-medium text-gray-600">Fill</h3>
                    <div className="flex flex-wrap gap-1.5">
                        {fillColors.map((c) => (
                            <Swatch key={c} color={c} label={isTransparent(c) ? 'No fill' : `Fill ${c}`} active={fillColor.toLowerCase() === c} onClick={() => applyStyle('fillColor', c)} />
                        ))}
                        <Button variant="outline" size="icon" aria-label="More fill colors" className="h-7 w-7" onClick={() => setPicker((p) => (p === 'fillColor' ? null : 'fillColor'))}>
                            <Palette className="h-3.5 w-3.5" />
                        </Button>
                    </div>
                </div>
                <div className="space-y-2">
                    <h3 className="text-xs font-medium text-gray-600">Stroke width · {strokeWidth}</h3>
                    <Slider value={[strokeWidth]} min={1} max={20} step={1} onValueChange={(v) => applyStyle('strokeWidth', v[0])} />
                </div>
                <div className="space-y-2">
                    <h3 className="text-xs font-medium text-gray-600">Font size · {fontSize}</h3>
                    <Slider value={[fontSize]} min={10} max={96} step={2} onValueChange={(v) => applyStyle('fontSize', v[0])} />
                </div>
            </Card>

            {picker && (
                <Card className="w-56 space-y-3 bg-white/95 p-3 shadow-lg backdrop-blur-sm">
                    <h3 className="text-xs font-medium text-gray-600">{picker === 'strokeColor' ? 'Stroke color' : 'Fill color'}</h3>
                    <div className="grid grid-cols-5 gap-1.5">
                        {palette.map((c) => (
                            <Swatch key={c} color={c} label={c} active={false} onClick={() => applyStyle(picker, c)} />
                        ))}
                    </div>
                    <div className="flex gap-2">
                        <Input value={hex} onChange={(e) => setHex(e.target.value)} className="h-8 font-mono text-xs" aria-label="Hex color" />
                        <Button variant="outline" size="icon" className="h-8 w-8 shrink-0" disabled={!hexValid} aria-label="Apply hex color" onClick={() => applyStyle(picker, hex)}>
                            <Check className="h-4 w-4" />
                        </Button>
                    </div>
                </Card>
            )}
        </div>
    );
});
