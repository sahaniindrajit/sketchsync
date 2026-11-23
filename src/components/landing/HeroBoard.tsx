import { ArrowUp, Check, Hand, MousePointer2, Pencil, Sigma, Sparkles, Square, Type } from 'lucide-react';
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
const BEAT_MS = 600;

type Pt = [number, number];
const AI_PATH: Pt[] = [[960, 110], [700, 160], [195, 120], [195, 265], [472, 265], [752, 265], [195, 430], [300, 470], [560, 150], [900, 110]];
const ME_PATH: Pt[] = [[250, 32], [300, 60], [330, 70], [360, 90], [840, 430], [800, 440], [700, 300], [590, 230], [470, 372], [560, 420]];

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

    useEffect(() => {
        if (reduced) {
            setStep(FINAL);
            setTyped(PROMPT.length);
            return;
        }
        if (!inView) return;
        let timers: ReturnType<typeof setTimeout>[] = [];
        const loopMs = TIMELINE[FINAL] + HOLD_MS + FADE_MS + BEAT_MS;
        const run = () => {
            timers.forEach(clearTimeout);
            timers = [];
            setTyped(0);
            TIMELINE.forEach((ms, i) => timers.push(setTimeout(() => setStep(i), BEAT_MS + ms)));
            for (let c = 1; c <= PROMPT.length; c++) timers.push(setTimeout(() => setTyped(c), BEAT_MS + 150 + c * 38));
            timers.push(setTimeout(() => setStep(-1), BEAT_MS + TIMELINE[FINAL] + HOLD_MS));
            timers.push(setTimeout(run, loopMs));
        };
        run();
        return () => timers.forEach(clearTimeout);
    }, [inView, reduced]);

    const s = (n: number) => step >= n;
    const aiWorking = step >= 1 && step < FINAL - 1;
    const meDrawing = step >= 7 && step < FINAL;
    const fill = (c: string) => displayFill(c, theme);
    const showPrompt = step >= 0;
    const at = (path: Pt[]) => path[Math.max(0, step)];

    return (
        <div ref={ref} className={cn('relative overflow-hidden rounded-[18px] border border-border bg-card shadow-lift', className)}>
            <div className={cn('dot-grid relative w-full bg-background', compact ? 'aspect-[560/470]' : 'aspect-[1000/560]')}>
                <svg
                    viewBox={compact ? '70 20 560 470' : '0 0 1000 560'}
                    className="absolute inset-0 h-full w-full text-foreground"
                    role="img"
                    aria-label="Claude drawing a signup flowchart on a SketchSync board while a teammate adds a note"
                >
                    <motion.rect x="88" y="72" width="785" height="400" rx="14" fill="none" style={{ stroke: 'hsl(var(--claude))' }} strokeWidth="1.5" strokeDasharray="6 5" initial={{ opacity: 0 }} animate={{ opacity: aiWorking && step >= 2 ? 0.9 : 0 }} transition={{ duration: 0.4 }} />

                    <Node on={s(2)} order={1} x={110} y={92} w={170} h={58} label="Sign-up form" />
                    <Arrow on={s(3)} order={2} d="M195 150 V203" head="M188 196 L195 204 L202 196" />
                    <g>
                        <motion.path d="M195 207 L290 265 L195 323 L100 265 Z" style={{ fill: fill('#a5d8ff') }} {...faded(s(3), 3, 0.45)} />
                        <motion.path d="M195 207 L290 265 L195 323 L100 265 Z" fill="none" stroke={ink} strokeWidth="2" strokeLinejoin="round" {...drawn(s(3), 3)} />
                        <motion.text x="195" y="270" textAnchor="middle" fontSize="15" fill="currentColor" fontFamily="Inter, sans-serif" {...faded(s(3), 3, 0.4)}>
                            Email valid?
                        </motion.text>
                    </g>
                    <Arrow on={s(4)} order={4} d="M290 265 H378" head="M371 258 L379 265 L371 272" />
                    <Node on={s(4)} order={4} x={382} y={236} w={180} h={58} label="Create account" fill={fill('#b2f2bb')} />
                    <Arrow on={s(5)} order={5} d="M562 265 H648" head="M641 258 L649 265 L641 272" />
                    <Node on={s(5)} order={5} x={652} y={236} w={200} h={58} label="Send welcome email" />
                    <Arrow on={s(6)} order={6} d="M195 323 V398" head="M188 391 L195 399 L202 391" />
                    <Node on={s(6)} order={6} x={110} y={402} w={170} h={56} label="Show inline error" fill={fill('#ffc9c9')} />
                    <motion.text x="318" y="254" fontSize="13" className="fill-muted-foreground" fontFamily="Inter, sans-serif" {...faded(s(6), 7, 0.3)}>
                        yes
                    </motion.text>
                    <motion.text x="206" y="366" fontSize="13" className="fill-muted-foreground" fontFamily="Inter, sans-serif" {...faded(s(6), 7, 0.4)}>
                        no
                    </motion.text>

                    <motion.path
                        d="M590 236 C 560 196, 400 192, 362 236 C 330 274, 372 318, 470 320 C 560 322, 608 296, 596 250"
                        fill="none"
                        stroke="#1971c2"
                        strokeWidth="3"
                        strokeLinecap="round"
                        initial={{ pathLength: 0, opacity: 0 }}
                        animate={s(7) ? { pathLength: 1, opacity: 1 } : { pathLength: 0, opacity: 0 }}
                        transition={s(7) ? { pathLength: { duration: 1, ease: 'easeInOut', delay: 0.15 }, opacity: { duration: 0.05, delay: 0.15 } } : { duration: 0.3, delay: 0.1 }}
                    />
                    <motion.path d="M470 330 C 472 350, 476 362, 480 372" fill="none" stroke="#1971c2" strokeWidth="2.5" strokeLinecap="round" {...drawn(s(8), 9)} />
                    <motion.text x="430" y="400" fontSize="18" fill="#4d9be6" fontFamily="Inter, sans-serif" fontWeight="700" {...faded(s(9), 10)}>
                        + rate limit?
                    </motion.text>

                    <Cursor at={at(ME_PATH)} label="Maya" color="#1971c2" visible={step >= 0} />
                    <Cursor at={at(AI_PATH)} label="Claude" color="hsl(var(--claude))" visible={step >= 1} />
                </svg>

                {/* Maya's prompt */}
                <AnimatePresence>
                    {showPrompt && (
                        <motion.div
                            initial={{ opacity: 0, y: -6, scale: 0.97 }}
                            animate={{ opacity: 1, y: 0, scale: 1 }}
                            exit={{ opacity: 0, y: -4, transition: { duration: 0.25 } }}
                            className="pointer-events-none absolute left-3 top-14 flex items-center gap-2 rounded-xl border border-border/80 bg-[hsl(var(--chrome)/0.95)] py-1.5 pl-1.5 pr-1.5 text-[13px] shadow-chrome backdrop-blur sm:left-[168px] sm:top-4"
                        >
                            <span className="flex h-6 w-6 items-center justify-center rounded-full bg-[#1971c2] text-[11px] font-semibold text-white">M</span>
                            <span className="min-w-[13ch] font-medium">
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
                <div className="pointer-events-none absolute left-3 top-3 flex items-center gap-2 rounded-xl border border-border/80 bg-[hsl(var(--chrome)/0.9)] px-2.5 py-1.5 shadow-chrome backdrop-blur sm:left-4 sm:top-4">
                    <LogoMark className="h-4 w-4" />
                    <span className="font-mono text-[11px] text-muted-foreground">/signup-flow</span>
                </div>
                <div className="pointer-events-none absolute right-3 top-3 hidden items-center gap-2 sm:right-4 sm:top-4 sm:flex">
                    <motion.div layout transition={{ type: 'spring', visualDuration: 0.3, bounce: 0 }} className="flex items-center gap-2 overflow-hidden rounded-xl border border-border/80 bg-[hsl(var(--chrome)/0.9)] py-1.5 pl-1.5 pr-3 text-[12px] shadow-chrome backdrop-blur">
                        <motion.span layout="position" className={cn('flex h-5 w-5 items-center justify-center rounded-full bg-claude text-white', aiWorking && 'animate-ping2')}>
                            <Sparkles className="h-3 w-3" />
                        </motion.span>
                        <AnimatePresence mode="popLayout" initial={false}>
                            <motion.span key={aiWorking ? 'a' : 'b'} layout="position" initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -6 }} className={cn('whitespace-nowrap', aiWorking ? 'text-shimmer font-medium' : 'text-muted-foreground')}>
                                {aiWorking ? 'Claude is drawing' : step >= FINAL - 1 ? 'Claude added 11 shapes' : 'Claude · connected'}
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

                {/* mini dock */}
                <div className="pointer-events-none absolute bottom-3 left-1/2 flex -translate-x-1/2 items-center gap-0.5 rounded-xl border border-border/80 bg-[hsl(var(--chrome)/0.9)] p-1 shadow-chrome backdrop-blur max-sm:scale-90">
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
