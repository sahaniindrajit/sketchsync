import { ArrowUp, Check, Hand, MousePointer2, Pause, Pencil, Play, Sigma, Sparkles, Square, Type } from 'lucide-react';
import { AnimatePresence, motion, useInView, useReducedMotion } from 'motion/react';
import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { LogoMark } from '@/components/logo';
import { displayFill, useTheme } from '@/lib/theme';
import { useMedia } from '@/lib/useMedia';
import { cn } from '@/lib/utils';

/**
 * A scripted, looping board. Maya asks Claude for a signup flow; Claude lays it out over
 * MCP (the log on the right ticks in step); Maya circles one step and adds a note.
 */

const PROMPT = '@Claude draw our signup flow';
// Step start times (ms). Step 0 types the prompt; the last step holds the finished board.
const TIMELINE = [0, 1500, 2100, 2800, 3500, 4200, 4900, 6000, 7100, 7900];
const FINAL = TIMELINE.length - 1;
const HOLD_MS = 3400;
const FADE_MS = 900;

type Pt = [number, number];
type Box = { x: number; y: number; w: number; h: number };

/** Everything positional, for the wide board and the phone board. */
const LAYOUTS = {
    wide: {
        viewBox: '0 0 1000 560',
        aspect: 'aspect-[1000/560]',
        halo: { x: 88, y: 72, w: 785, h: 400 },
        a: { x: 110, y: 92, w: 170, h: 58 },
        ab: ['M195 150 V203', 'M188 196 L195 204 L202 196'],
        diamond: { cx: 195, cy: 265, rx: 95, ry: 58 },
        bc: ['M290 265 H378', 'M371 258 L379 265 L371 272'],
        c: { x: 382, y: 236, w: 180, h: 58 },
        cd: ['M562 265 H648', 'M641 258 L649 265 L641 272'],
        d: { x: 652, y: 236, w: 200, h: 58 },
        be: ['M195 323 V398', 'M188 391 L195 399 L202 391'] as string[] | null,
        e: { x: 110, y: 402, w: 170, h: 56 } as Box | null,
        yes: [318, 254] as Pt,
        no: [206, 366] as Pt | null,
        circle: 'M590 236 C 560 196, 400 192, 362 236 C 330 274, 372 318, 470 320 C 560 322, 608 296, 596 250',
        pointer: 'M470 330 C 472 350, 476 362, 480 372',
        note: [430, 400] as Pt,
        ai: [[960, 120], [700, 170], [272, 142], [262, 292], [552, 286], [842, 286], [270, 450], [320, 490], [600, 150], [900, 120]] as Pt[],
        me: [[470, 90], [480, 100], [490, 110], [500, 120], [840, 430], [800, 440], [700, 300], [590, 230], [470, 372], [560, 420]] as Pt[],
    },
    tall: {
        viewBox: '0 0 400 560',
        aspect: 'aspect-[400/560]',
        halo: { x: 84, y: 56, w: 232, h: 412 },
        a: { x: 115, y: 70, w: 170, h: 52 },
        ab: ['M200 122 V160', 'M193 153 L200 161 L207 153'],
        diamond: { cx: 200, cy: 214, rx: 92, ry: 52 },
        bc: ['M200 266 V302', 'M193 295 L200 303 L207 295'],
        c: { x: 110, y: 306, w: 180, h: 52 },
        cd: ['M200 358 V394', 'M193 387 L200 395 L207 387'],
        d: { x: 100, y: 398, w: 200, h: 52 },
        be: null,
        e: null,
        yes: [210, 288] as Pt,
        no: null,
        circle: 'M306 318 C 296 284, 116 282, 92 322 C 74 356, 128 378, 200 377 C 278 377, 318 360, 308 328',
        pointer: 'M318 372 C 330 420, 334 456, 330 486',
        note: [236, 514] as Pt,
        ai: [[380, 90], [330, 90], [276, 116], [270, 240], [282, 352], [292, 444], [320, 470], [340, 500], [360, 140], [360, 120]] as Pt[],
        me: [[30, 150], [30, 160], [36, 170], [40, 180], [40, 520], [30, 500], [330, 300], [300, 320], [320, 470], [250, 540]] as Pt[],
    },
};

const ink = 'currentColor';

function drawn(on: boolean, order: number) {
    return {
        initial: { pathLength: 0, opacity: 0 },
        animate: on ? { pathLength: 1, opacity: 1 } : { pathLength: 0, opacity: 0 },
        transition: on
            ? { pathLength: { duration: 0.65, ease: [0.65, 0, 0.35, 1] as const }, opacity: { duration: 0.05 } }
            : { duration: 0.3, delay: (12 - order) * 0.045 },
    };
}
function faded(on: boolean, order: number, delay = 0) {
    return {
        initial: { opacity: 0 },
        animate: { opacity: on ? 1 : 0 },
        transition: on ? { duration: 0.35, delay } : { duration: 0.25, delay: (12 - order) * 0.045 },
    };
}

function Cursor({ at, label, color, visible }: { at: Pt; label: string; color: string; visible: boolean }) {
    const text = useRef<SVGTextElement>(null);
    const [w, setW] = useState(label.length * 7.5 + 18);
    useLayoutEffect(() => {
        const len = text.current?.getComputedTextLength();
        if (len) setW(len + 18);
    }, [label]);
    return (
        <motion.g
            initial={false}
            animate={{ x: at[0], y: at[1], opacity: visible ? 1 : 0 }}
            transition={visible ? { type: 'spring', visualDuration: 0.75, bounce: 0.1 } : { opacity: { duration: 0.25 }, x: { duration: 0, delay: 0.3 }, y: { duration: 0, delay: 0.3 } }}
        >
            <path d="M0 0 L0 18 L4.8 13.5 L8 20.5 L11 19.2 L7.9 12.4 L14.3 12.2 Z" style={{ fill: color }} stroke="white" strokeWidth="1.4" strokeLinejoin="round" />
            <g transform="translate(14 21)">
                <rect width={w} height="23" rx="7.5" style={{ fill: color }} />
                <text ref={text} x="9" y="15.8" fill="white" fontSize="13" fontWeight="600" fontFamily="Geist Variable, sans-serif">
                    {label}
                </text>
            </g>
        </motion.g>
    );
}

function Node({ on, order, x, y, w, h, label, fill }: { on: boolean; order: number; x: number; y: number; w: number; h: number; label: string; fill?: string }) {
    const r = 12;
    const d = `M${x + r} ${y} H${x + w - r} Q${x + w} ${y} ${x + w} ${y + r} V${y + h - r} Q${x + w} ${y + h} ${x + w - r} ${y + h} H${x + r} Q${x} ${y + h} ${x} ${y + h - r} V${y + r} Q${x} ${y} ${x + r} ${y} Z`;
    return (
        <g>
            {fill && <motion.path d={d} style={{ fill }} stroke="none" {...faded(on, order, 0.4)} />}
            <motion.path d={d} fill="none" stroke={ink} strokeWidth="2" strokeLinejoin="round" {...drawn(on, order)} />
            <motion.text x={x + w / 2} y={y + h / 2 + 5} textAnchor="middle" fontSize="15" fill="currentColor" fontFamily="Inter, sans-serif" {...faded(on, order, 0.35)}>
                {label}
            </motion.text>
        </g>
    );
}

function Arrow({ on, order, d, head }: { on: boolean; order: number; d: string; head: string }) {
    return (
        <g>
            <motion.path d={d} fill="none" stroke={ink} strokeWidth="2" strokeLinecap="round" {...drawn(on, order)} />
            <motion.path d={head} fill="none" stroke={ink} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...faded(on, order, 0.5)} />
        </g>
    );
}

const FEED = [
    { at: 1, tool: 'get_board', note: 'empty board' },
    { at: 2, tool: 'create_flowchart', note: (step: number) => `${Math.min(5, Math.max(1, step - 1))} of 5 nodes` },
    { at: 6, tool: 'update_shapes', note: 'labels yes / no' },
    { at: 7, tool: 'get_board_image', note: 'checked the layout' },
];

export function HeroBoard({ className }: { className?: string }) {
    const ref = useRef<HTMLDivElement>(null);
    const inView = useInView(ref, { amount: 0.25 });
    const reduced = useReducedMotion();
    const compact = useMedia('(max-width: 639px)');
    const theme = useTheme((s) => s.resolved);
    const [step, setStep] = useState(reduced ? FINAL : -1);
    const [typed, setTyped] = useState(reduced ? PROMPT.length : 0);
    const [paused, setPaused] = useState(false);
    const [ran, setRan] = useState(false);

    const stepRef = useRef(step);
    stepRef.current = step;
    useEffect(() => {
        if (reduced) {
            setStep(FINAL);
            setTyped(PROMPT.length);
            return;
        }
        if (!inView || paused) return;
        let timers: ReturnType<typeof setTimeout>[] = [];
        const holdEnd = TIMELINE[FINAL] + HOLD_MS;
        // Runs the timeline from `from` (ms into the loop); the prompt types while the last drawing fades.
        const run = (from: number) => {
            timers.forEach(clearTimeout);
            timers = [];
            const at = (ms: number, fn: () => void) => ms >= from && timers.push(setTimeout(fn, ms - from));
            if (from === 0) setTyped(0);
            TIMELINE.forEach((ms, i) => at(ms, () => setStep(i)));
            for (let c = 1; c <= PROMPT.length; c++) at(150 + c * 38, () => setTyped(c));
            at(holdEnd, () => {
                setRan(true);
                setStep(-1);
            });
            timers.push(setTimeout(() => run(0), holdEnd + FADE_MS - from));
        };
        const current = stepRef.current;
        run(current > 0 ? TIMELINE[current] : 0);
        return () => timers.forEach(clearTimeout);
    }, [inView, reduced, paused]);

    const s = (n: number) => step >= n;
    const aiWorking = step >= 1 && step < FINAL - 1;
    const meDrawing = step >= 7 && step < FINAL;
    const fill = (c: string) => displayFill(c, theme);
    const showPrompt = step >= 0 || typed > 0;
    const at = (path: Pt[]) => path[Math.max(0, step)];
    const L = compact ? LAYOUTS.tall : LAYOUTS.wide;
    const { cx, cy, rx, ry } = L.diamond;
    const diamond = `M${cx} ${cy - ry} L${cx + rx} ${cy} L${cx} ${cy + ry} L${cx - rx} ${cy} Z`;
    const pen = theme === 'dark' ? '#4d9be6' : '#1971c2';

    return (
        <div ref={ref} className={cn('relative overflow-hidden rounded-[18px] border border-border bg-card shadow-lift', className)}>
            <div className={cn('dot-grid relative w-full bg-background', L.aspect)}>
                <svg viewBox={L.viewBox} className="absolute inset-0 h-full w-full text-foreground" role="img" aria-label="Claude drawing a signup flowchart on a SketchSync board while a teammate adds a note">
                    <motion.rect x={L.halo.x} y={L.halo.y} width={L.halo.w} height={L.halo.h} rx="14" fill="none" style={{ stroke: 'hsl(var(--claude))' }} strokeWidth="1.5" strokeDasharray="6 5" initial={{ opacity: 0 }} animate={{ opacity: aiWorking && step >= 2 ? 0.9 : 0 }} transition={{ duration: 0.4 }} />

                    <Node on={s(2)} order={1} {...L.a} label="Sign-up form" />
                    <Arrow on={s(3)} order={2} d={L.ab[0]} head={L.ab[1]} />
                    <g>
                        <motion.path d={diamond} style={{ fill: fill('#a5d8ff') }} {...faded(s(3), 3, 0.45)} />
                        <motion.path d={diamond} fill="none" stroke={ink} strokeWidth="2" strokeLinejoin="round" {...drawn(s(3), 3)} />
                        <motion.text x={L.diamond.cx} y={L.diamond.cy + 5} textAnchor="middle" fontSize="15" fill="currentColor" fontFamily="Inter, sans-serif" {...faded(s(3), 3, 0.4)}>
                            Email valid?
                        </motion.text>
                    </g>
                    <Arrow on={s(4)} order={4} d={L.bc[0]} head={L.bc[1]} />
                    <Node on={s(4)} order={4} {...L.c} label="Create account" fill={fill('#b2f2bb')} />
                    <Arrow on={s(5)} order={5} d={L.cd[0]} head={L.cd[1]} />
                    <Node on={s(5)} order={5} {...L.d} label="Send welcome email" />
                    {L.be && <Arrow on={s(6)} order={6} d={L.be[0]} head={L.be[1]} />}
                    {L.e && <Node on={s(6)} order={6} {...L.e} label="Show inline error" fill={fill('#ffc9c9')} />}
                    <motion.text x={L.yes[0]} y={L.yes[1]} fontSize="13" className="fill-muted-foreground" fontFamily="Inter, sans-serif" {...faded(s(6), 7, 0.3)}>
                        yes
                    </motion.text>
                    {L.no && (
                        <motion.text x={L.no[0]} y={L.no[1]} fontSize="13" className="fill-muted-foreground" fontFamily="Inter, sans-serif" {...faded(s(6), 7, 0.4)}>
                            no
                        </motion.text>
                    )}

                    <motion.path
                        d={L.circle}
                        fill="none"
                        stroke={pen}
                        strokeWidth="3"
                        strokeLinecap="round"
                        initial={{ pathLength: 0, opacity: 0 }}
                        animate={s(7) ? { pathLength: 1, opacity: 1 } : { pathLength: 0, opacity: 0 }}
                        transition={s(7) ? { pathLength: { duration: 1, ease: 'easeInOut', delay: 0.15 }, opacity: { duration: 0.05, delay: 0.15 } } : { duration: 0.3, delay: 0.1 }}
                    />
                    <motion.path d={L.pointer} fill="none" stroke={pen} strokeWidth="2.5" strokeLinecap="round" {...drawn(s(8), 9)} />
                    <motion.text x={L.note[0]} y={L.note[1]} fontSize="18" fill={pen} fontFamily="Inter, sans-serif" fontWeight="700" {...faded(s(9), 10)}>
                        + rate limit?
                    </motion.text>

                    <Cursor at={at(L.me)} label="Maya" color="#1971c2" visible={step >= 0} />
                    <Cursor at={at(L.ai)} label="Claude" color="hsl(var(--claude))" visible={step >= 1} />
                </svg>

                {/* Maya's prompt */}
                <AnimatePresence>
                    {showPrompt && (
                        <motion.div
                            initial={{ opacity: 0, y: -6, scale: 0.97 }}
                            animate={{ opacity: 1, y: 0, scale: 1 }}
                            exit={{ opacity: 0, y: -4, transition: { duration: 0.25 } }}
                            className="pointer-events-none absolute left-3 top-3 flex items-center gap-2 rounded-xl border border-border/80 bg-[hsl(var(--chrome)/0.95)] py-1.5 pl-1.5 pr-1.5 text-[13px] shadow-chrome backdrop-blur sm:left-[168px] sm:top-4"
                        >
                            <span className="flex h-6 w-6 items-center justify-center rounded-full bg-[#1971c2] text-[11px] font-semibold text-white">M</span>
                            <span className="w-[23ch] whitespace-nowrap font-medium">
                                <span className="text-claude">{PROMPT.slice(0, Math.min(typed, 7))}</span>
                                {PROMPT.slice(7, typed)}
                                {typed < PROMPT.length && <span className="ml-px inline-block h-[1em] w-[1.5px] translate-y-[2px] animate-blink bg-foreground" />}
                            </span>
                            <span className={cn('flex h-6 w-6 items-center justify-center rounded-lg transition-colors duration-300', typed >= PROMPT.length ? 'bg-primary text-primary-foreground' : 'bg-secondary text-muted-foreground')}>
                                {step >= 1 ? <Check className="h-3.5 w-3.5" strokeWidth={2.5} /> : <ArrowUp className="h-3.5 w-3.5" strokeWidth={2.5} />}
                            </span>
                        </motion.div>
                    )}
                </AnimatePresence>

                {/* mini board chrome */}
                <div className="pointer-events-none absolute left-4 top-4 hidden items-center gap-2 rounded-xl border border-border/80 bg-[hsl(var(--chrome)/0.9)] px-2.5 py-1.5 shadow-chrome backdrop-blur sm:flex">
                    <LogoMark className="h-4 w-4" />
                    <span className="font-mono text-[11px] text-muted-foreground">/signup-flow</span>
                </div>
                <div className="pointer-events-none absolute right-3 top-3 hidden items-center gap-2 sm:right-4 sm:top-4 sm:flex">
                    <motion.div layout transition={{ type: 'spring', visualDuration: 0.3, bounce: 0 }} className="flex items-center gap-2 overflow-hidden rounded-xl border border-border/80 bg-[hsl(var(--chrome)/0.9)] py-1.5 pl-1.5 pr-3 text-[12px] shadow-chrome backdrop-blur">
                        <motion.span layout="position" className={cn('relative flex h-5 w-5 items-center justify-center rounded-full bg-claude text-white', aiWorking && 'ai-ping')}>
                            <Sparkles className="h-3 w-3" />
                        </motion.span>
                        <AnimatePresence mode="popLayout" initial={false}>
                            <motion.span key={aiWorking ? 'a' : 'b'} layout="position" initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -6 }} className={cn('whitespace-nowrap', aiWorking ? 'text-shimmer font-medium' : 'text-muted-foreground')}>
                                {aiWorking ? 'Claude is drawing' : step >= FINAL - 1 || (step === -1 && ran) ? 'Claude added 11 shapes' : 'Claude · connected'}
                            </motion.span>
                        </AnimatePresence>
                    </motion.div>
                    <span className="rounded-xl bg-primary px-3 py-1.5 text-[12px] font-medium text-primary-foreground shadow-chrome">Share</span>
                </div>

                {/* agent feed */}
                <div className="pointer-events-none absolute bottom-4 right-4 hidden w-[264px] rounded-xl border border-border/80 bg-[hsl(var(--chrome)/0.94)] p-3 shadow-chrome backdrop-blur md:block">
                    <div className="mb-2.5 flex items-center justify-between font-mono text-[10.5px] uppercase tracking-[0.06em] text-muted-foreground">
                        <span>MCP · tool calls</span>
                        <span className="flex items-center gap-1.5">
                            <span className={cn('h-1.5 w-1.5 rounded-full', aiWorking ? 'animate-pulse bg-claude' : 'bg-success')} />
                            {aiWorking ? 'live' : step >= 1 ? 'done' : 'idle'}
                        </span>
                    </div>
                    <div className="min-h-[92px] space-y-1.5">
                        <AnimatePresence initial={false}>
                            {FEED.filter((f) => step >= f.at).map((f, i, arr) => {
                                const pending = i === arr.length - 1 && aiWorking;
                                return (
                                    <motion.div key={f.tool} layout initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, transition: { duration: 0.2 } }} className="flex items-center gap-2 text-[12px]">
                                        <span className={cn('flex h-4 w-4 shrink-0 items-center justify-center rounded-full', pending ? 'border border-claude/60' : 'bg-success/15 text-success')}>
                                            {pending ? <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-claude" /> : <Check className="h-2.5 w-2.5" strokeWidth={3} />}
                                        </span>
                                        <code className="font-mono text-foreground">{f.tool}</code>
                                        <span className="truncate text-muted-foreground">{typeof f.note === 'function' ? f.note(step) : f.note}</span>
                                    </motion.div>
                                );
                            })}
                        </AnimatePresence>
                        {step < 1 && <div className="text-[12px] text-muted-foreground">Waiting for a request…</div>}
                    </div>
                </div>

                {!reduced && (
                    <button
                        type="button"
                        onClick={() => setPaused((p) => !p)}
                        aria-label={paused ? 'Play the demo' : 'Pause the demo'}
                        className="absolute bottom-3 left-3 flex h-8 w-8 items-center justify-center rounded-lg border border-border/80 bg-[hsl(var(--chrome)/0.9)] text-muted-foreground shadow-chrome backdrop-blur transition-colors hover:text-foreground sm:bottom-4 sm:left-4"
                    >
                        {paused ? <Play className="h-3.5 w-3.5" /> : <Pause className="h-3.5 w-3.5" />}
                    </button>
                )}

                {/* mini dock */}
                <div className="pointer-events-none absolute bottom-3 left-1/2 hidden -translate-x-1/2 items-center gap-0.5 rounded-xl border border-border/80 bg-[hsl(var(--chrome)/0.9)] p-1 shadow-chrome backdrop-blur sm:flex">
                    {[MousePointer2, Hand, Pencil, Square, Type, Sigma].map((Icon, i) => {
                        const on = meDrawing ? i === 2 : i === 0;
                        return (
                            <span key={i} className={cn('relative flex h-7 w-7 items-center justify-center rounded-lg', on ? 'text-accent' : 'text-muted-foreground')}>
                                {on && <motion.span layoutId="hero-dock" className="absolute inset-0 rounded-lg bg-accent/[0.12]" transition={{ type: 'spring', visualDuration: 0.3, bounce: 0.1 }} />}
                                <Icon className="relative h-3.5 w-3.5" strokeWidth={1.75} />
                            </span>
                        );
                    })}
                </div>
            </div>
        </div>
    );
}
