import { AnimatePresence, motion, useInView } from 'motion/react';
import { displayFill, useTheme, type ResolvedTheme } from '@/lib/theme';
import { useCallback, useEffect, useRef, useState } from 'react';
import { cn } from '@/lib/utils';
import { Reveal, SectionHeading } from './Reveal';

const KEYS = [
    ['V', 'Select'],
    ['H', 'Pan'],
    ['P', 'Pencil'],
    ['R', 'Rectangle'],
    ['O', 'Ellipse'],
    ['D', 'Diamond'],
    ['A', 'Arrow'],
    ['L', 'Line'],
    ['T', 'Text'],
    ['M', 'Math'],
    ['E', 'Eraser'],
] as const;

type Kind = 'P' | 'R' | 'O' | 'D' | 'A' | 'L' | 'T' | 'M';
type Item = { id: number; kind: Kind; x: number; y: number };

// Spots on the mini board, used in turn so new shapes rarely overlap.
const SLOTS: [number, number][] = [
    [70, 60], [200, 55], [330, 65], [80, 150], [210, 150], [335, 155], [140, 220], [275, 220],
];
const FILLS: Partial<Record<Kind, string>> = { R: '#a5d8ff', O: '#b2f2bb', D: '#ffec99' };

function ShapeGlyph({ kind, theme }: { kind: Kind; theme: ResolvedTheme }) {
    const ink = { stroke: 'currentColor', strokeWidth: 2, fill: 'none', strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const };
    switch (kind) {
        case 'R':
            return <rect x={-38} y={-22} width={76} height={44} rx={8} {...ink} fill={displayFill(FILLS.R!, theme)} />;
        case 'O':
            return <ellipse rx={38} ry={24} {...ink} fill={displayFill(FILLS.O!, theme)} />;
        case 'D':
            return <path d="M0 -28 L40 0 L0 28 L-40 0 Z" {...ink} fill={displayFill(FILLS.D!, theme)} />;
        case 'A':
            return (
                <g {...ink}>
                    <path d="M-36 14 L34 -12" />
                    <path d="M22 -16 L34 -12 L26 -2" />
                </g>
            );
        case 'L':
            return <path d="M-38 10 L38 -10" {...ink} />;
        case 'P':
            return <path d="M-36 6 C -24 -20, -8 22, 6 -4 S 28 -14, 38 8" {...ink} strokeWidth={2.6} style={{ stroke: '#1971c2' }} />;
        case 'T':
            return (
                <text textAnchor="middle" y={7} fontSize={20} fill="currentColor" fontFamily="Inter, sans-serif">
                    Hello!
                </text>
            );
        case 'M':
            return (
                <text textAnchor="middle" y={8} fontSize={22} fill="currentColor" fontFamily='"STIX Two Math", "Cambria Math", Georgia, serif' fontStyle="italic">
                    ∑ x² = y
                </text>
            );
    }
}

export function Shortcuts() {
    const [pressed, setPressed] = useState<string | null>(null);
    const [items, setItems] = useState<Item[]>([
        { id: 1, kind: 'R', x: 70, y: 60 },
        { id: 2, kind: 'A', x: 200, y: 55 },
        { id: 3, kind: 'O', x: 330, y: 65 },
    ]);
    const [selected, setSelected] = useState<number | null>(null);
    const [pan, setPan] = useState(0);
    const counter = useRef(3);
    const nextId = useRef(4);

    const act = useCallback((key: string) => {
        if (key === 'E') {
            setItems((list) => list.slice(0, -1));
            setSelected(null);
            return;
        }
        if (key === 'V') {
            setItems((list) => {
                setSelected(list[list.length - 1]?.id ?? null);
                return list;
            });
            return;
        }
        if (key === 'H') {
            setPan((p) => (p === 0 ? 18 : p > 0 ? -18 : 0));
            return;
        }
        const [x, y] = SLOTS[counter.current++ % SLOTS.length];
        setSelected(null);
        setItems((list) => [...list.filter((i) => i.x !== x || i.y !== y), { id: nextId.current++, kind: key as Kind, x, y }].slice(-8));
    }, []);

    const sectionRef = useRef<HTMLElement>(null);
    const inView = useInView(sectionRef, { amount: 0.3 });
    const theme = useTheme((s) => s.resolved);
    useEffect(() => {
        if (!inView) return;
        const down = (e: KeyboardEvent) => {
            const target = e.target as HTMLElement | null;
            if (e.metaKey || e.ctrlKey || e.altKey || e.repeat || target?.tagName === 'INPUT' || target?.tagName === 'TEXTAREA') return;
            const k = e.key.toUpperCase();
            if (!KEYS.some(([key]) => key === k)) return;
            setPressed(k);
            act(k);
        };
        const up = () => setPressed(null);
        window.addEventListener('keydown', down);
        window.addEventListener('keyup', up);
        return () => {
            window.removeEventListener('keydown', down);
            window.removeEventListener('keyup', up);
        };
    }, [act, inView]);

    const sel = items.find((i) => i.id === selected);

    return (
        <section ref={sectionRef}>
            <SectionHeading center eyebrow="Keyboard first" title="Every tool is one key away.">
                Press a key, or click one, and it draws here. The same keys work on the board, and <span className="whitespace-nowrap"><span className="kbd">⌘</span> <span className="kbd">K</span></span> finds everything else.
            </SectionHeading>
            <Reveal className="mx-auto mt-12 grid max-w-5xl items-center gap-8 md:grid-cols-[1fr_1.1fr]">
                <div className="grid grid-cols-4 gap-3 sm:gap-3.5">
                    {KEYS.map(([k, label]) => {
                        const on = pressed === k;
                        return (
                            <button
                                key={k}
                                type="button"
                                onPointerDown={() => setPressed(k)}
                                onPointerUp={() => setPressed(null)}
                                onPointerLeave={() => pressed === k && setPressed(null)}
                                onClick={() => act(k)}
                                aria-label={`${label} (${k})`}
                                className="group flex flex-col items-center gap-2 outline-none"
                            >
                                <motion.span
                                    animate={{ y: on ? 3 : 0, scale: on ? 0.96 : 1 }}
                                    transition={{ type: 'spring', visualDuration: 0.12, bounce: 0.4 }}
                                    className={cn(
                                        'flex aspect-square w-full max-w-[64px] items-center justify-center rounded-xl border bg-card text-[19px] font-medium transition-colors duration-100 group-hover:border-foreground/25 group-focus-visible:ring-2 group-focus-visible:ring-ring',
                                        on ? 'border-accent text-accent shadow-[0_0_0_4px_hsl(var(--accent)/0.15)]' : 'border-border text-foreground shadow-[0_3px_0_hsl(var(--border))]',
                                    )}
                                >
                                    {k}
                                </motion.span>
                                <span className={cn('text-[12px] transition-colors', on ? 'text-accent' : 'text-muted-foreground')}>{label}</span>
                            </button>
                        );
                    })}
                    <div className="flex flex-col items-center gap-2" aria-hidden>
                        <span className="flex aspect-square w-full max-w-[64px] items-center justify-center gap-0.5 rounded-xl bg-secondary text-[15px] font-medium text-muted-foreground">⌘K</span>
                        <span className="text-[12px] text-muted-foreground">Commands</span>
                    </div>
                </div>
                <div className="dot-grid relative overflow-hidden rounded-2xl border border-border bg-background shadow-lift">
                    <svg viewBox="0 0 400 270" className="block h-auto w-full text-foreground" role="img" aria-label="A small board showing the shapes you drew with the keyboard">
                        <motion.g animate={{ x: pan }} transition={{ type: 'spring', visualDuration: 0.4, bounce: 0.15 }}>
                            <AnimatePresence>
                                {items.map((it) => (
                                    <motion.g
                                        key={it.id}
                                        initial={{ opacity: 0, scale: 0.6, x: it.x, y: it.y }}
                                        animate={{ opacity: 1, scale: 1, x: it.x, y: it.y }}
                                        exit={{ opacity: 0, scale: 0.7, transition: { duration: 0.18 } }}
                                        transition={{ type: 'spring', visualDuration: 0.35, bounce: 0.3 }}
                                    >
                                        <ShapeGlyph kind={it.kind} theme={theme} />
                                    </motion.g>
                                ))}
                            </AnimatePresence>
                            <AnimatePresence>
                            {sel && (
                                <motion.rect
                                    key={sel.id}
                                    initial={{ opacity: 0 }}
                                    animate={{ opacity: 1 }}
                                    exit={{ opacity: 0 }}
                                    x={sel.x - 48}
                                    y={sel.y - 34}
                                    width={96}
                                    height={68}
                                    rx={4}
                                    fill="none"
                                    stroke="#1971c2"
                                    strokeWidth={1.5}
                                />
                            )}
                            </AnimatePresence>
                        </motion.g>
                    </svg>
                    <span className="absolute bottom-3 right-3 rounded-md border border-border bg-card px-2 py-1 font-mono text-[11px] text-muted-foreground">
                        {items.length} {items.length === 1 ? 'shape' : 'shapes'}
                    </span>
                </div>
            </Reveal>
        </section>
    );
}
