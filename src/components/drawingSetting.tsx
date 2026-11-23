import { AlignCenter, AlignLeft, AlignRight, BringToFront, Check, Copy, Palette, Pipette, SendToBack, Trash2, X } from 'lucide-react';
import { v4 as uuidv4 } from 'uuid';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { AnimatePresence, motion } from 'motion/react';
import React, { useMemo, useState } from 'react';
import { Input } from '@/components/ui/input';
import { Slider } from '@/components/ui/slider';
import { useBoard, type BoardState, type Tool } from '@/board/store';
import type { Shape, ShapePatch } from '@/shared/protocol';
import { cn } from '@/lib/utils';
import { displayFill, displayInk, useTheme } from '@/lib/theme';

const strokeColors = ['#1e1e1e', '#e03131', '#2f9e44', '#1971c2', '#f08c00', '#9c36b5'];
const fillColors = ['transparent', '#ffc9c9', '#b2f2bb', '#a5d8ff', '#ffec99', '#eebefa'];
const palette = [
    '#ffffff', '#f8f9fa', '#868e96', '#343a40', '#000000',
    '#0c8599', '#1971c2', '#5f3dc4', '#c2255c', '#e64980',
    '#2b8a3e', '#66a80f', '#f08c00', '#e8590c', '#c92a2a',
];
const widths = [1, 2, 4, 8, 14];
const sizes = [
    { label: 'S', value: 16 },
    { label: 'M', value: 20 },
    { label: 'L', value: 28 },
    { label: 'XL', value: 40 },
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

const toolKeys: Partial<Record<Tool, StyleKey[]>> = {
    rect: ['strokeColor', 'fillColor', 'strokeWidth'],
    ellipse: ['strokeColor', 'fillColor', 'strokeWidth'],
    diamond: ['strokeColor', 'fillColor', 'strokeWidth'],
    arrow: ['strokeColor', 'strokeWidth'],
    line: ['strokeColor', 'strokeWidth'],
    pencil: ['strokeColor', 'strokeWidth'],
    text: ['strokeColor', 'fontSize'],
    math: ['strokeColor', 'fontSize'],
};

/** Style controls that apply to the selection, or to the active drawing tool. */
function useRelevantKeys(): Set<StyleKey> {
    const tool = useBoard((s) => s.tool);
    const selectedIds = useBoard((s) => s.selectedIds);
    const shapes = useBoard((s) => s.shapes);
    return useMemo(() => {
        const keys = new Set<StyleKey>();
        if (selectedIds.length) {
            for (const id of selectedIds) {
                const shape = shapes.get(id);
                if (!shape) continue;
                (['strokeColor', 'fillColor', 'strokeWidth', 'fontSize'] as const).forEach((k) => supports(shape, k) && keys.add(k));
            }
        } else {
            toolKeys[tool]?.forEach((k) => keys.add(k));
        }
        return keys;
    }, [tool, selectedIds, shapes]);
}

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

const COLOR_NAMES: Record<string, string> = {
    '#1e1e1e': 'Ink', '#e03131': 'Red', '#2f9e44': 'Green', '#1971c2': 'Blue', '#f08c00': 'Orange', '#9c36b5': 'Violet',
    '#ffc9c9': 'Light red', '#b2f2bb': 'Light green', '#a5d8ff': 'Light blue', '#ffec99': 'Light yellow', '#eebefa': 'Light violet',
};
const TYPE_NAMES: Record<string, string> = {
    rect: 'Rectangle', ellipse: 'Ellipse', diamond: 'Diamond', arrow: 'Arrow', line: 'Line', freehand: 'Drawing', text: 'Text', math: 'Math', image: 'Image',
};


function selection() {
    const state = useBoard.getState();
    return state.selectedIds.map((id) => state.shapes.get(id)).filter((x): x is Shape => !!x);
}

function setOpacity(value: number) {
    const patches = selection().map((x) => ({ id: x.id, changes: { opacity: value } }));
    if (patches.length) useBoard.getState().dispatch({ kind: 'update', patches });
}

function reorder(where: 'front' | 'back') {
    const state = useBoard.getState();
    const all = Array.from(state.shapes.values()).map((x) => x.z);
    const picked = selection().sort((a, b) => a.z - b.z);
    if (!picked.length) return;
    const base = where === 'front' ? Math.max(...all) + 1 : Math.min(...all) - picked.length;
    state.dispatch({ kind: 'update', patches: picked.map((x, i) => ({ id: x.id, changes: { z: base + i } })) });
}

function duplicate() {
    const state = useBoard.getState();
    const picked = selection().sort((a, b) => a.z - b.z);
    if (!picked.length) return;
    const top = Math.max(...Array.from(state.shapes.values()).map((x) => x.z));
    const copies = picked.map((x, i) => {
        const copy = { ...x, id: uuidv4(), x: x.x + 20, y: x.y + 20, z: top + 1 + i, updatedAt: Date.now() } as Shape;
        if ('startBinding' in copy) delete copy.startBinding;
        if ('endBinding' in copy) delete copy.endBinding;
        return copy;
    });
    state.dispatch({ kind: 'add', shapes: copies });
    state.setSelection(copies.map((c) => c.id));
}

function patchSelection(type: string, changes: Record<string, unknown>) {
    const patches = selection()
        .filter((x) => x.type === type)
        .map((x) => ({ id: x.id, changes }));
    if (patches.length) useBoard.getState().dispatch({ kind: 'update', patches: patches as ShapePatch[] });
}

function removeSelected() {
    const state = useBoard.getState();
    if (state.selectedIds.length) state.dispatch({ kind: 'delete', ids: state.selectedIds });
}

function ActionButton({ label, short, hint, onClick, children, danger }: { label: string; short: string; hint?: string; onClick: () => void; children: React.ReactNode; danger?: boolean }) {
    return (
        <Tooltip>
            <TooltipTrigger asChild>
                <button
                    type="button"
                    aria-label={label}
                    onClick={onClick}
                    className={cn(
                        'flex h-12 flex-col items-center justify-center gap-1 rounded-lg bg-secondary text-[10.5px] font-medium text-muted-foreground transition-[background-color,color,transform] active:scale-95',
                        danger ? 'hover:bg-destructive/10 hover:text-destructive' : 'hover:bg-secondary/60 hover:text-foreground',
                    )}
                >
                    {children}
                    <span aria-hidden>{short}</span>
                </button>
            </TooltipTrigger>
            <TooltipContent side="bottom">
                {label}
                {hint && <span className="kbd">{hint}</span>}
            </TooltipContent>
        </Tooltip>
    );
}
const checker = {
    backgroundImage: 'repeating-conic-gradient(hsl(var(--border)) 0 25%, transparent 0 50%)',
    backgroundSize: '8px 8px',
};

function Swatch({ color, active, onClick, label, group }: { color: string; active: boolean; onClick: () => void; label: string; group: string }) {
    const theme = useTheme((s) => s.resolved);
    // Show ink the way the board will draw it in this theme.
    const shown = group === 'stroke' ? displayInk(color, theme) : group === 'fill' ? displayFill(color, theme) : color;
    return (
        <button
            type="button"
            aria-label={label}
            aria-pressed={active}
            title={COLOR_NAMES[color] ? `${COLOR_NAMES[color]} (${color})` : label}
            className="relative flex aspect-square w-full items-center justify-center rounded-lg outline-none transition-transform hover:scale-[1.08] focus-visible:ring-2 focus-visible:ring-ring active:scale-95"
            onClick={onClick}
        >
            {active && (
                <motion.span
                    layoutId={`swatch-${group}`}
                    className="absolute -inset-[3px] rounded-[10px] ring-2 ring-accent"
                    transition={{ type: 'spring', visualDuration: 0.25, bounce: 0.25 }}
                />
            )}
            <span
                className="h-full w-full rounded-[7px] border border-foreground/10"
                style={isTransparent(color) ? checker : { backgroundColor: shown }}
            />
        </button>
    );
}

function Section({ title, value, children }: { title: string; value?: React.ReactNode; children: React.ReactNode }) {
    return (
        <motion.div layout="position" className="space-y-2">
            <div className="flex items-center justify-between">
                <h3 className="text-[11.5px] font-medium text-muted-foreground">{title}</h3>
                {value !== undefined && <span className="text-[11.5px] tabular-nums text-muted-foreground">{value}</span>}
            </div>
            {children}
        </motion.div>
    );
}

function Segmented<T extends number>({ options, value, onChange, group, render, labelOf }: { options: T[]; value: T; onChange: (v: T) => void; group: string; render: (v: T) => React.ReactNode; labelOf: (v: T) => string }) {
    return (
        <div className="grid gap-0.5 rounded-lg bg-secondary p-0.5" style={{ gridTemplateColumns: `repeat(${options.length}, minmax(0, 1fr))` }}>
            {options.map((o) => (
                <button
                    key={o}
                    type="button"
                    aria-label={labelOf(o)}
                    aria-pressed={o === value}
                    onClick={() => onChange(o)}
                    className={cn('relative flex h-7 items-center justify-center rounded-md text-[11.5px] font-medium transition-colors', o === value ? 'text-foreground' : 'text-muted-foreground hover:text-foreground')}
                >
                    {o === value && <motion.span layoutId={`seg-${group}`} className="absolute inset-0 rounded-md bg-card shadow-[0_1px_2px_hsl(0_0%_0%/0.12)]" transition={{ type: 'spring', visualDuration: 0.25, bounce: 0.15 }} />}
                    <span className="relative z-10">{render(o)}</span>
                </button>
            ))}
        </div>
    );
}

export const DrawingSettings = React.memo(function DrawingSettings() {
    const strokeColor = useBoard((s) => s.strokeColor);
    const fillColor = useBoard((s) => s.fillColor);
    const strokeWidth = useBoard((s) => s.strokeWidth);
    const fontSize = useBoard((s) => s.fontSize);
    const keys = useRelevantKeys();
    const selectedCount = useBoard((s) => s.selectedIds.length);
    const selTitle = useBoard((s) => {
        const types = new Set(s.selectedIds.map((id) => s.shapes.get(id)?.type).filter(Boolean));
        const n = s.selectedIds.length;
        if (!n) return '';
        if (types.size === 1) {
            const name = TYPE_NAMES[[...types][0] as string] ?? 'Shape';
            return n === 1 ? name : `${n} ${name === 'Math' || name === 'Text' ? name : name + 's'}`;
        }
        return `${n} shapes`;
    });
    const selRect = useBoard((s) => {
        const r = s.selectedIds.map((id) => s.shapes.get(id)).find((x) => x?.type === 'rect');
        return r && r.type === 'rect' ? (r.cornerRadius ? 'round' : 'sharp') : null;
    });
    const selAlign = useBoard((s) => {
        const t = s.selectedIds.map((id) => s.shapes.get(id)).find((x) => x?.type === 'text');
        return t && t.type === 'text' ? t.align : null;
    });
    const selOpacity = useBoard((s) => {
        const first = s.selectedIds[0] && s.shapes.get(s.selectedIds[0]);
        return first ? first.opacity : 1;
    });
    // The panel opens by itself for a selection (on wider screens). For a drawing tool it stays a
    // small style chip until you open it; either choice is remembered for this session.
    const [toolOpen, setToolOpen] = useState(false);
    const [selOpen, setSelOpen] = useState(() => window.innerWidth >= 768);
    const [picker, setPicker] = useState<'strokeColor' | 'fillColor' | null>(null);
    const [hex, setHex] = useState('#f08c00');
    const hexValid = /^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/.test(hex);
    const relevant = keys.size > 0 || selectedCount > 0;
    const open = selectedCount > 0 ? selOpen : toolOpen;
    const setOpen = (v: boolean) => (selectedCount > 0 ? setSelOpen(v) : setToolOpen(v));

    // On phones, opening the app menu tucks the panel away so the two don't stack.
    React.useEffect(() => {
        const close = () => {
            if (window.innerWidth >= 768) return;
            setSelOpen(false);
            setToolOpen(false);
        };
        window.addEventListener('sketchsync:menu-open', close);
        return () => window.removeEventListener('sketchsync:menu-open', close);
    }, []);
    const activePicker = picker && keys.has(picker) ? picker : null;

    return (
        <div className="fixed right-[max(12px,env(safe-area-inset-right))] top-[calc(max(12px,env(safe-area-inset-top))+56px)] z-20">
            <AnimatePresence mode="popLayout" initial={false}>
                {relevant && !open && (
                    <motion.button
                        key="toggle"
                        type="button"
                        aria-label="Show style panel"
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.9, transition: { duration: 0.1 } }}
                        className="chrome ml-auto flex h-11 w-11 items-center justify-center rounded-xl text-muted-foreground hover:text-foreground"
                        onClick={() => setOpen(true)}
                    >
                        <span className="relative">
                            <Palette className="h-[18px] w-[18px]" strokeWidth={1.75} />
                            <span className="absolute -bottom-1 -right-1 h-2.5 w-2.5 rounded-full border-2 border-[hsl(var(--chrome))]" style={{ backgroundColor: strokeColor }} />
                        </span>
                    </motion.button>
                )}
                {relevant && open && (
                    <motion.div
                        key="panel"
                        initial={{ opacity: 0, scale: 0.96, y: -6 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.97, y: -4, transition: { duration: 0.12 } }}
                        style={{ transformOrigin: 'top right' }}
                        className="chrome chrome-solid w-[232px] space-y-4 rounded-2xl p-3.5"
                        data-testid="style-panel"
                        layout
                    >
                        <div className="-mb-1 flex items-center justify-between">
                            <span className="text-[13px] font-medium">{selectedCount ? selTitle : 'Style'}</span>
                            <button type="button" aria-label="Hide style panel" className="-mr-1 flex h-6 w-6 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground" onClick={() => setOpen(false)}>
                                <X className="h-3.5 w-3.5" />
                            </button>
                        </div>
                        {keys.has('strokeColor') && (
                            <Section title="Stroke">
                                <div className="grid grid-cols-7 gap-1.5">
                                    {strokeColors.map((c) => (
                                        <Swatch key={c} group="stroke" color={c} label={`Stroke ${c}`} active={strokeColor.toLowerCase() === c} onClick={() => applyStyle('strokeColor', c)} />
                                    ))}
                                    <button
                                        type="button"
                                        aria-label="More stroke colors"
                                        aria-pressed={activePicker === 'strokeColor'}
                                        className={cn('flex aspect-square items-center justify-center rounded-lg border border-dashed border-border text-muted-foreground transition-colors hover:border-foreground/30 hover:text-foreground', activePicker === 'strokeColor' && 'border-solid border-accent text-accent')}
                                        onClick={() => setPicker((p) => (p === 'strokeColor' ? null : 'strokeColor'))}
                                    >
                                        <Pipette className="h-3.5 w-3.5" />
                                    </button>
                                </div>
                            </Section>
                        )}
                        {keys.has('fillColor') && (
                            <Section title="Fill">
                                <div className="grid grid-cols-7 gap-1.5">
                                    {fillColors.map((c) => (
                                        <Swatch key={c} group="fill" color={c} label={isTransparent(c) ? 'No fill' : `Fill ${c}`} active={fillColor.toLowerCase() === c} onClick={() => applyStyle('fillColor', c)} />
                                    ))}
                                    <button
                                        type="button"
                                        aria-label="More fill colors"
                                        aria-pressed={activePicker === 'fillColor'}
                                        className={cn('flex aspect-square items-center justify-center rounded-lg border border-dashed border-border text-muted-foreground transition-colors hover:border-foreground/30 hover:text-foreground', activePicker === 'fillColor' && 'border-solid border-accent text-accent')}
                                        onClick={() => setPicker((p) => (p === 'fillColor' ? null : 'fillColor'))}
                                    >
                                        <Pipette className="h-3.5 w-3.5" />
                                    </button>
                                </div>
                            </Section>
                        )}
                        <AnimatePresence initial={false}>
                            {activePicker && (
                                <motion.div
                                    key="picker"
                                    initial={{ opacity: 0, height: 0 }}
                                    animate={{ opacity: 1, height: 'auto' }}
                                    exit={{ opacity: 0, height: 0 }}
                                    className="overflow-hidden"
                                >
                                    <div className="space-y-2.5 rounded-xl bg-secondary/60 p-2.5">
                                        <div className="grid grid-cols-5 gap-1.5">
                                            {palette.map((c) => (
                                                <Swatch key={c} group="palette" color={c} label={c} active={false} onClick={() => applyStyle(activePicker, c)} />
                                            ))}
                                        </div>
                                        <div className="flex gap-1.5">
                                            <div className="relative flex-1">
                                                <span className="absolute left-2 top-1/2 h-3.5 w-3.5 -translate-y-1/2 rounded-[4px] border border-foreground/10" style={{ backgroundColor: hexValid ? hex : 'transparent' }} />
                                                <Input value={hex} onChange={(e) => setHex(e.target.value)} className="h-8 pl-7 font-mono text-xs" aria-label="Hex color" spellCheck={false} />
                                            </div>
                                            <button type="button" disabled={!hexValid} aria-label="Apply hex color" onClick={() => applyStyle(activePicker, hex)} className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-primary text-primary-foreground transition-opacity disabled:opacity-40">
                                                <Check className="h-4 w-4" />
                                            </button>
                                        </div>
                                    </div>
                                </motion.div>
                            )}
                        </AnimatePresence>
                        {keys.has('strokeWidth') && (
                            <Section title="Stroke width" value={strokeWidth}>
                                <Segmented
                                    group="width"
                                    options={widths}
                                    value={widths.includes(strokeWidth) ? strokeWidth : (-1 as number)}
                                    onChange={(v) => applyStyle('strokeWidth', v)}
                                    labelOf={(v) => `Stroke width ${v}`}
                                    render={(v) => <span className="block w-4 rounded-full bg-current" style={{ height: Math.max(1, Math.min(v, 9) * 0.75) }} />}
                                />
                            </Section>
                        )}
                        {keys.has('fontSize') && (
                            <Section title="Font size" value={fontSize}>
                                <Segmented
                                    group="font"
                                    options={sizes.map((s) => s.value)}
                                    value={sizes.some((s) => s.value === fontSize) ? fontSize : (-1 as number)}
                                    onChange={(v) => applyStyle('fontSize', v)}
                                    labelOf={(v) => `Font size ${v}`}
                                    render={(v) => sizes.find((s) => s.value === v)!.label}
                                />
                            </Section>
                        )}
                        {selectedCount > 0 && (
                            <>
                                {selRect && (
                                    <Section title="Corners">
                                        <Segmented
                                            group="corners"
                                            options={[0, 1]}
                                            value={selRect === 'round' ? 1 : 0}
                                            onChange={(v) => patchSelection('rect', { cornerRadius: v ? 14 : null })}
                                            labelOf={(v) => (v ? 'Round corners' : 'Sharp corners')}
                                            render={(v) => <span className={cn('block h-3 w-4 border-[1.5px] border-current', v ? 'rounded-[4px]' : 'rounded-none')} />}
                                        />
                                    </Section>
                                )}
                                {selAlign && (
                                    <Section title="Align">
                                        <Segmented
                                            group="align"
                                            options={[0, 1, 2]}
                                            value={['left', 'center', 'right'].indexOf(selAlign)}
                                            onChange={(v) => patchSelection('text', { align: (['left', 'center', 'right'] as const)[v] })}
                                            labelOf={(v) => `Align ${['left', 'center', 'right'][v]}`}
                                            render={(v) => {
                                                const Icon = [AlignLeft, AlignCenter, AlignRight][v];
                                                return <Icon className="h-3.5 w-3.5" />;
                                            }}
                                        />
                                    </Section>
                                )}
                                <Section title="Opacity" value={`${Math.round(selOpacity * 100)}%`}>
                                    <Slider value={[Math.round(selOpacity * 100)]} min={10} max={100} step={5} onValueChange={(v) => setOpacity(v[0] / 100)} aria-label="Opacity" />
                                </Section>
                                <Section title="Actions">
                                    <div className="grid grid-cols-4 gap-1">
                                        <ActionButton label="Bring to front" short="Front" onClick={() => reorder('front')}>
                                            <BringToFront className="h-4 w-4" strokeWidth={1.75} />
                                        </ActionButton>
                                        <ActionButton label="Send to back" short="Back" onClick={() => reorder('back')}>
                                            <SendToBack className="h-4 w-4" strokeWidth={1.75} />
                                        </ActionButton>
                                        <ActionButton label="Duplicate" short="Copy" onClick={duplicate}>
                                            <Copy className="h-4 w-4" strokeWidth={1.75} />
                                        </ActionButton>
                                        <ActionButton label="Delete" short="Delete" hint="Del" onClick={removeSelected} danger>
                                            <Trash2 className="h-4 w-4" strokeWidth={1.75} />
                                        </ActionButton>
                                    </div>
                                </Section>
                            </>
                        )}
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
});
