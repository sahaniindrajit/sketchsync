import { Check, Hand, MousePointer2, Pencil, Sigma, Sparkles, Square, Type } from 'lucide-react';
import { AnimatePresence, motion, useInView, useReducedMotion } from 'motion/react';
import { useEffect, useRef, useState } from 'react';
import { LogoMark } from '@/components/logo';
import { cn } from '@/lib/utils';

/**
 * A scripted, looping board: Claude (over MCP) lays out a signup flowchart while a person
 * circles one step and adds a note. Drawn with the board's own pen colours.
 */

const FINAL = 9;
// When each step starts, in ms from the start of the loop.
const TIMELINE = [0, 700, 1500, 2300, 3100, 3900, 4900, 6100, 7000, 8000];
const LOOP_MS = 12500;

type Pt = [number, number];
const AI_PATH: Pt[] = [[880, 40], [195, 120], [195, 265], [472, 265], [752, 265], [195, 430], [330, 250], [560, 160], [900, 120], [900, 120]];
const ME_PATH: Pt[] = [[960, 500], [900, 470], [860, 450], [820, 430], [760, 420], [700, 330], [590, 230], [470, 372], [520, 400], [560, 440]];

const ink = 'currentColor';
const spring = { type: 'spring', visualDuration: 0.7, bounce: 0.12 } as const;
const draw = (on: boolean, delay = 0) => ({
    initial: { pathLength: 0, opacity: 0 },
    animate: on ? { pathLength: 1, opacity: 1 } : { pathLength: 0, opacity: 0 },
    transition: on ? { pathLength: { duration: 0.7, ease: [0.65, 0, 0.35, 1], delay }, opacity: { duration: 0.05, delay } } : { duration: 0.3 },
});
const fade = (on: boolean, delay = 0) => ({
    initial: { opacity: 0 },
    animate: { opacity: on ? 1 : 0 },
    transition: { duration: 0.35, delay: on ? delay : 0 },
});

function Cursor({ at, label, color }: { at: Pt; label: string; color: string }) {
    return (
        <motion.g initial={false} animate={{ x: at[0], y: at[1] }} transition={{ type: 'spring', visualDuration: 0.75, bounce: 0.1 }}>
            <path d="M0 0 L0 17 L4.6 12.8 L7.6 19.5 L10.4 18.3 L7.5 11.8 L13.6 11.6 Z" style={{ fill: color }} stroke="white" strokeWidth="1.3" strokeLinejoin="round" />
            <g transform="translate(13 20)">
                <rect width={label.length * 7 + 16} height="21" rx="7" style={{ fill: color }} />
                <text x="8" y="14.5" fill="white" fontSize="11.5" fontWeight="600" fontFamily="Geist Variable, sans-serif">
                    {label}
                </text>
            </g>
        </motion.g>
    );
}

function Node({ on, x, y, w, h, label, fill, delay = 0 }: { on: boolean; x: number; y: number; w: number; h: number; label: string; fill?: string; delay?: number }) {
    const r = 12;
    const d = `M${x + r} ${y} H${x + w - r} Q${x + w} ${y} ${x + w} ${y + r} V${y + h - r} Q${x + w} ${y + h} ${x + w - r} ${y + h} H${x + r} Q${x} ${y + h} ${x} ${y + h - r} V${y + r} Q${x} ${y} ${x + r} ${y} Z`;
    return (
        <g>
            {fill && <motion.path d={d} fill={fill} stroke="none" {...fade(on, delay + 0.45)} />}
            <motion.path d={d} fill="none" stroke={ink} strokeWidth="2" strokeLinejoin="round" {...draw(on, delay)} />
            <motion.text x={x + w / 2} y={y + h / 2 + 5} textAnchor="middle" fontSize="15" fill={fill ? '#1e1e1e' : ink} fontFamily="Inter, sans-serif" {...fade(on, delay + 0.4)}>
                {label}
            </motion.text>
        </g>
    );
}

function Arrow({ on, d, head, delay = 0 }: { on: boolean; d: string; head: string; delay?: number }) {
    return (
        <g>
            <motion.path d={d} fill="none" stroke={ink} strokeWidth="2" strokeLinecap="round" {...draw(on, delay)} />
            <motion.path d={head} fill="none" stroke={ink} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...fade(on, delay + 0.55)} />
        </g>
    );
}

const FEED = [
    { at: 1, tool: 'get_board', note: 'empty board' },
    { at: 2, tool: 'create_flowchart', note: '5 nodes · 5 edges' },
    { at: 5, tool: 'update_shapes', note: 'labels yes / no' },
    { at: 7, tool: 'get_board_image', note: 'checked layout' },
];

export function HeroBoard({ className }: { className?: string }) {
    const ref = useRef<HTMLDivElement>(null);
    const inView = useInView(ref, { amount: 0.25 });
    const reduced = useReducedMotion();
    const [step, setStep] = useState(reduced ? FINAL : 0);

    useEffect(() => {
        if (reduced) {
            setStep(FINAL);
            return;
        }
        if (!inView) return;
        let timers: ReturnType<typeof setTimeout>[] = [];
        const run = () => {
            timers.forEach(clearTimeout);
            timers = TIMELINE.map((ms, i) => setTimeout(() => setStep(i), ms));
            timers.push(setTimeout(run, LOOP_MS));
        };
        run();
        return () => timers.forEach(clearTimeout);
    }, [inView, reduced]);

    const s = (n: number) => step >= n;
    const aiWorking = step >= 1 && step < 8;
    const meDrawing = step >= 6 && step < 9;

    return (
        <div ref={ref} className={cn('relative overflow-hidden rounded-[18px] border border-border bg-card shadow-lift', className)}>
            {/* board surface */}
            <div className="dot-grid relative aspect-[1000/560] w-full bg-background">
                <svg viewBox="0 0 1000 560" className="absolute inset-0 h-full w-full text-foreground" role="img" aria-label="Claude drawing a signup flowchart on a SketchSync board while a teammate adds a note">
                    {/* AI selection halo */}
                    <motion.rect x="88" y="72" width="785" height="400" rx="14" fill="none" style={{ stroke: 'hsl(var(--claude))' }} strokeWidth="1.5" strokeDasharray="6 5" initial={{ opacity: 0 }} animate={{ opacity: aiWorking && step >= 2 ? 0.9 : 0 }} transition={{ duration: 0.4 }} />

                    <Node on={s(1)} x={110} y={92} w={170} h={58} label="Sign-up form" />
                    <Arrow on={s(2)} d="M195 150 V203" head="M188 196 L195 204 L202 196" delay={0.1} />
                    <g>
                        <motion.path d="M195 207 L290 265 L195 323 L100 265 Z" fill="#a5d8ff" {...fade(s(2), 0.6)} />
                        <motion.path d="M195 207 L290 265 L195 323 L100 265 Z" fill="none" stroke={ink} strokeWidth="2" strokeLinejoin="round" {...draw(s(2), 0.2)} />
                        <motion.text x="195" y="270" textAnchor="middle" fontSize="15" fill="#1e1e1e" fontFamily="Inter, sans-serif" {...fade(s(2), 0.6)}>
                            Email valid?
                        </motion.text>
                    </g>
                    <Arrow on={s(3)} d="M290 265 H378" head="M371 258 L379 265 L371 272" />
                    <Node on={s(3)} x={382} y={236} w={180} h={58} label="Create account" fill="#b2f2bb" delay={0.2} />
                    <Arrow on={s(4)} d="M562 265 H648" head="M641 258 L649 265 L641 272" />
                    <Node on={s(4)} x={652} y={236} w={200} h={58} label="Send welcome email" delay={0.2} />
                    <Arrow on={s(5)} d="M195 323 V398" head="M188 391 L195 399 L202 391" />
                    <Node on={s(5)} x={110} y={402} w={170} h={56} label="Show inline error" fill="#ffc9c9" delay={0.2} />
                    <motion.text x="318" y="254" fontSize="13" className="fill-muted-foreground" fontFamily="Inter, sans-serif" {...fade(s(5), 0.4)}>
                        yes
                    </motion.text>
                    <motion.text x="206" y="366" fontSize="13" className="fill-muted-foreground" fontFamily="Inter, sans-serif" {...fade(s(5), 0.5)}>
                        no
                    </motion.text>

                    {/* the human's annotation, in board blue */}
                    <motion.path
                        d="M590 236 C 560 196, 400 192, 362 236 C 330 274, 372 318, 470 320 C 560 322, 608 296, 596 250"
                        fill="none"
                        stroke="#1971c2"
                        strokeWidth="3"
                        strokeLinecap="round"
                        {...draw(s(6), 0.15)}
                        transition={s(6) ? { pathLength: { duration: 1.1, ease: 'easeInOut', delay: 0.2 }, opacity: { duration: 0.05, delay: 0.2 } } : { duration: 0.3 }}
                    />
                    <motion.path d="M470 330 C 472 350, 476 362, 480 372" fill="none" stroke="#1971c2" strokeWidth="2.5" strokeLinecap="round" {...draw(s(7), 0.05)} />
                    <motion.text x="440" y="398" fontSize="17" fill="#1971c2" fontFamily="Inter, sans-serif" fontWeight="700" {...fade(s(8), 0)}>
                        + rate limit?
                    </motion.text>

                    <Cursor at={ME_PATH[step]} label="Maya" color="#1971c2" />
                    <Cursor at={AI_PATH[step]} label="Claude" color="hsl(var(--claude))" />
                </svg>

                {/* mini board chrome */}
                <div className="pointer-events-none absolute left-3 top-3 flex items-center gap-2 rounded-xl border border-border/80 bg-[hsl(var(--chrome)/0.9)] px-2.5 py-1.5 shadow-chrome backdrop-blur">
                    <LogoMark className="h-4 w-4" />
                    <span className="font-mono text-[11px] text-muted-foreground">/signup-flow</span>
                </div>
                <div className="pointer-events-none absolute right-3 top-3 hidden items-center gap-2 sm:flex">
                    <div className="flex items-center gap-2 rounded-xl border border-border/80 bg-[hsl(var(--chrome)/0.9)] py-1.5 pl-1.5 pr-3 text-[12px] shadow-chrome backdrop-blur">
                        <span className={cn('flex h-5 w-5 items-center justify-center rounded-full bg-claude text-white', aiWorking && 'animate-ping2')}>
                            <Sparkles className="h-3 w-3" />
                        </span>
                        <AnimatePresence mode="popLayout" initial={false}>
                            <motion.span key={aiWorking ? 'a' : 'b'} initial={{ opacity: 0, y: 5 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -5 }} className={cn(aiWorking ? 'text-shimmer font-medium' : 'text-muted-foreground')}>
                                {aiWorking ? 'Claude is drawing' : 'Claude · idle'}
                            </motion.span>
                        </AnimatePresence>
                    </div>
                    <span className="rounded-xl bg-primary px-3 py-1.5 text-[12px] font-medium text-primary-foreground shadow-chrome">Share</span>
                </div>

                {/* agent feed */}
                <div className="pointer-events-none absolute bottom-3 right-3 hidden w-[250px] rounded-xl border border-border/80 bg-[hsl(var(--chrome)/0.92)] p-3 shadow-chrome backdrop-blur md:block">
                    <div className="mb-2 flex items-center justify-between font-mono text-[10px] uppercase tracking-[0.06em] text-muted-foreground">
                        <span>MCP · claude</span>
                        <span className="flex items-center gap-1.5">
                            <span className={cn('h-1.5 w-1.5 rounded-full', aiWorking ? 'animate-pulse bg-claude' : 'bg-success')} />
                            {aiWorking ? 'live' : 'done'}
                        </span>
                    </div>
                    <div className="space-y-1.5">
                        <AnimatePresence initial={false}>
                            {FEED.filter((f) => step >= f.at).map((f, i, arr) => {
                                const pending = i === arr.length - 1 && aiWorking;
                                return (
                                    <motion.div key={f.tool} layout initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="flex items-center gap-2 text-[11.5px]">
                                        <span className={cn('flex h-3.5 w-3.5 shrink-0 items-center justify-center rounded-full', pending ? 'border border-claude/60' : 'bg-success/15 text-success')}>
                                            {pending ? <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-claude" /> : <Check className="h-2.5 w-2.5" strokeWidth={3} />}
                                        </span>
                                        <code className="font-mono text-foreground">{f.tool}</code>
                                        <span className="truncate text-muted-foreground">{f.note}</span>
                                    </motion.div>
                                );
                            })}
                        </AnimatePresence>
                        {step === 0 && <div className="text-[11.5px] text-muted-foreground">Waiting for “draw our signup flow”…</div>}
                    </div>
                </div>

                {/* mini dock */}
                <div className="pointer-events-none absolute bottom-3 left-1/2 flex -translate-x-1/2 items-center gap-0.5 rounded-xl border border-border/80 bg-[hsl(var(--chrome)/0.9)] p-1 shadow-chrome backdrop-blur max-sm:scale-90">
                    {[MousePointer2, Hand, Pencil, Square, Type, Sigma].map((Icon, i) => (
                        <span key={i} className={cn('relative flex h-7 w-7 items-center justify-center rounded-lg text-muted-foreground', (meDrawing ? i === 2 : i === 0) && 'text-accent')}>
                            {(meDrawing ? i === 2 : i === 0) && <motion.span layoutId="hero-dock" className="absolute inset-0 rounded-lg bg-accent/[0.12]" transition={spring} />}
                            <Icon className="relative h-3.5 w-3.5" strokeWidth={1.75} />
                        </span>
                    ))}
                </div>
            </div>
        </div>
    );
}
