import { Github, ImagePlus, Sparkles, WifiOff } from 'lucide-react';
import { motion, useInView, useReducedMotion } from 'motion/react';
import { useEffect, useRef, useState } from 'react';
import { cn } from '@/lib/utils';
import { Reveal, SectionHeading } from './Reveal';

/** Card with a soft light that follows the pointer. */
function Cell({ title, children, body, className, delay = 0, short }: { title: string; body: string; children: React.ReactNode; className?: string; delay?: number; short?: boolean }) {
    const ref = useRef<HTMLDivElement>(null);
    const rect = useRef<DOMRect | null>(null);
    return (
        <Reveal delay={delay} className={cn('min-w-0', className)}>
            <div
                ref={ref}
                onPointerEnter={() => (rect.current = ref.current!.getBoundingClientRect())}
                onPointerMove={(e) => {
                    const r = rect.current ?? ref.current!.getBoundingClientRect();
                    ref.current!.style.setProperty('--x', `${e.clientX - r.left}px`);
                    ref.current!.style.setProperty('--y', `${e.clientY - r.top}px`);
                }}
                className="group relative flex h-full flex-col overflow-hidden rounded-2xl border border-border bg-card transition-colors duration-300 hover:border-foreground/15 dark:bg-[hsl(228_9%_10.5%)] dark:shadow-[inset_0_1px_0_hsl(0_0%_100%/0.05)]"
            >
                <div
                    className="pointer-events-none absolute inset-0 opacity-0 transition-opacity duration-300 group-hover:opacity-100"
                    style={{ background: 'radial-gradient(420px circle at var(--x) var(--y), hsl(var(--accent) / 0.07), transparent 60%)' }}
                />
                <div className={cn('relative flex flex-1 items-center justify-center overflow-hidden border-b border-border/70 bg-background/60', short ? 'min-h-[150px]' : 'min-h-[200px]')}>{children}</div>
                <div className="relative space-y-1.5 p-5">
                    <h3 className="text-[15px] font-semibold tracking-tightish">{title}</h3>
                    <p className="text-[14px] leading-relaxed text-muted-foreground">{body}</p>
                </div>
            </div>
        </Reveal>
    );
}

function useLoop(length: number, ms: number) {
    const ref = useRef<HTMLDivElement>(null);
    const inView = useInView(ref, { amount: 0.4 });
    const reduced = useReducedMotion();
    const [i, setI] = useState(0);
    useEffect(() => {
        if (!inView || reduced) return;
        const t = setInterval(() => setI((v) => (v + 1) % length), ms);
        return () => clearInterval(t);
    }, [inView, reduced, length, ms]);
    return [ref, i] as const;
}

function MultiplayerDemo() {
    const [ref, i] = useLoop(4, 1400);
    const pos = [
        [40, 30],
        [150, 60],
        [120, 10],
        [60, 70],
    ][i];
    return (
        <div ref={ref} className="dot-grid relative h-[190px] w-full">
            <div className="absolute left-1/2 top-1/2 h-[120px] w-[300px] -translate-x-1/2 -translate-y-1/2">
                <motion.div
                    animate={{ x: pos[0], y: pos[1] }}
                    transition={{ type: 'spring', visualDuration: 0.6, bounce: 0.15 }}
                    className="absolute flex h-11 w-28 items-center justify-center rounded-lg border-2 border-foreground bg-[#ffec99] text-[13px] text-[#1e1e1e]"
                    style={{ fontFamily: 'Inter, sans-serif' }}
                >
                    Q3 roadmap
                </motion.div>
                <motion.div animate={{ x: pos[0] + 92, y: pos[1] + 34 }} transition={{ type: 'spring', visualDuration: 0.6, bounce: 0.15 }} className="absolute flex items-start gap-0.5">
                    <svg width="14" height="16" viewBox="0 0 14 20"><path d="M0 0 L0 17 L4.6 12.8 L7.6 19.5 L10.4 18.3 L7.5 11.8 L13.6 11.6 Z" fill="#2f9e44" stroke="white" strokeWidth="1.3" /></svg>
                    <span className="mt-3 rounded-md bg-[#2f9e44] px-1.5 py-0.5 text-[10.5px] font-semibold text-white">Arjun</span>
                </motion.div>
                <motion.div animate={{ x: [250, 230, 10, 240][i], y: [100, 0, 100, 96][i] }} transition={{ type: 'spring', visualDuration: 0.9, bounce: 0.1 }} className="absolute flex items-start gap-0.5">
                    <svg width="14" height="16" viewBox="0 0 14 20"><path d="M0 0 L0 17 L4.6 12.8 L7.6 19.5 L10.4 18.3 L7.5 11.8 L13.6 11.6 Z" fill="#1971c2" stroke="white" strokeWidth="1.3" /></svg>
                    <span className="mt-3 rounded-md bg-[#1971c2] px-1.5 py-0.5 text-[10.5px] font-semibold text-white">Maya</span>
                </motion.div>
            </div>
            <div className="absolute bottom-3 left-3 flex items-center gap-1.5 rounded-full border border-border bg-card px-2.5 py-1 font-mono text-[10.5px] text-muted-foreground">
                <span className="h-1.5 w-1.5 rounded-full bg-success" />
                op #{1204 + i} · applied in order
            </div>
        </div>
    );
}

const LATEX = 'e^{i\\pi} + 1 = 0';

function MathDemo() {
    const ref = useRef<HTMLDivElement>(null);
    const inView = useInView(ref, { once: true, amount: 0.6 });
    const reduced = useReducedMotion();
    const [n, setN] = useState(reduced ? LATEX.length : 0);
    useEffect(() => {
        if (!inView || reduced) return;
        const timers = Array.from({ length: LATEX.length }, (_, i) => setTimeout(() => setN(i + 1), 300 + i * 55));
        return () => timers.forEach(clearTimeout);
    }, [inView, reduced]);
    const done = n >= LATEX.length;
    return (
        <div ref={ref} className="flex flex-col items-center gap-4 px-6 text-foreground">
            <code className="flex h-8 min-w-[190px] items-center rounded-lg border border-border bg-card px-3 font-mono text-[12.5px] text-muted-foreground">
                {LATEX.slice(0, n)}
                {!done && <span className="ml-px inline-block h-4 w-[1.5px] animate-blink bg-foreground" />}
            </code>
            <motion.div
                initial={false}
                animate={{ scale: done ? [1, 1.06, 1] : 1, opacity: done ? 1 : 0.55 }}
                transition={{ duration: 0.45 }}
                className="text-[34px] leading-none"
                style={{ fontFamily: '"Latin Modern Math", "STIX Two Math", "Cambria Math", Georgia, serif' }}
            >
                <i>e</i>
                <sup className="text-[0.6em]">
                    <i>iπ</i>
                </sup>{' '}
                + 1 = 0
            </motion.div>
        </div>
    );
}

function LayoutDemo() {
    const [ref, i] = useLoop(2, 2400);
    const laid = i === 1;
    // Node centres: scattered, then laid out left-to-right with a branch.
    const nodes = [
        { a: [40, 95], b: [36, 60], fill: false },
        { a: [150, 25], b: [132, 60], fill: true },
        { a: [95, 150], b: [228, 28], fill: false },
        { a: [230, 120], b: [228, 92], fill: false },
    ];
    const edges = [
        [0, 1],
        [1, 2],
        [1, 3],
    ];
    const p = (k: number) => (laid ? nodes[k].b : nodes[k].a);
    const spring = { type: 'spring', visualDuration: 0.7, bounce: 0.15 } as const;
    return (
        <div ref={ref} className="w-full px-4">
            <svg viewBox="0 0 270 170" className="mx-auto h-[150px] w-full max-w-[300px] text-foreground" aria-hidden>
                {edges.map(([a, b], k) => (
                    <motion.line key={k} initial={false} animate={{ x1: p(a)[0], y1: p(a)[1], x2: p(b)[0], y2: p(b)[1] }} transition={spring} stroke="currentColor" strokeWidth="1.6" strokeDasharray={laid ? '0' : '3 4'} opacity={laid ? 1 : 0.4} />
                ))}
                {nodes.map((n, k) => (
                    <motion.rect
                        key={k}
                        initial={false}
                        animate={{ x: p(k)[0] - 30, y: p(k)[1] - 14 }}
                        transition={{ ...spring, delay: k * 0.04 }}
                        width="60"
                        height="28"
                        rx="7"
                        className={n.fill ? 'fill-[#a5d8ff] dark:fill-[#4d6a80]' : 'fill-card'}
                        stroke="currentColor"
                        strokeWidth="1.8"
                    />
                ))}
            </svg>
        </div>
    );
}

const LABELS = [
    { text: 'roof', from: [78, 26], to: [128, 14] },
    { text: 'door', from: [54, 86], to: [128, 92] },
    { text: 'window', from: [86, 66], to: [128, 56] },
];

function SeesSketchDemo() {
    const ref = useRef<HTMLDivElement>(null);
    const inView = useInView(ref, { once: true, amount: 0.5 });
    const reduced = useReducedMotion();
    const on = inView || !!reduced;
    const t = (delay: number) => (reduced ? 0 : delay);
    const stroke = (d: string, delay: number, color = 'currentColor') => (
        <motion.path
            d={d}
            fill="none"
            stroke={color}
            strokeWidth="3"
            strokeLinecap="round"
            strokeLinejoin="round"
            initial={{ pathLength: reduced ? 1 : 0 }}
            animate={{ pathLength: on ? 1 : 0 }}
            transition={{ duration: 0.6, delay: t(delay), ease: 'easeInOut' }}
        />
    );
    // Claude's cursor visits each label after it has "looked" at the sketch.
    const visits: [number, number][] = [[190, 10], ...LABELS.map((l) => [l.to[0] + 50, l.to[1] + 4] as [number, number])];
    return (
        <div ref={ref} className="flex w-full flex-col items-center justify-center gap-5 px-6 py-6 sm:flex-row sm:gap-8">
            <svg viewBox="0 0 220 112" className="h-[132px] w-[260px] shrink-0 overflow-visible text-foreground" aria-hidden>
                {stroke('M18 52 L60 16 L102 50', 0)}
                {stroke('M26 48 C 25 70, 27 86, 26 98 C 50 99, 74 97, 96 99 C 95 80, 97 64, 95 47', 0.4)}
                {stroke('M44 98 C 44 86, 44 78, 45 72 C 52 71, 58 72, 62 72 C 62 82, 62 90, 62 98', 0.9, '#e03131')}
                {stroke('M87 66 a7 7 0 1 1 -14 0 a7 7 0 1 1 14 0', 1.2, '#1971c2')}
                {LABELS.map((l, i) => (
                    <g key={l.text}>
                        <motion.path
                            d={`M${l.from[0]} ${l.from[1]} L${l.to[0] - 4} ${l.to[1]}`}
                            fill="none"
                            style={{ stroke: 'hsl(var(--claude))' }}
                            strokeWidth="1.5"
                            strokeDasharray="3 3"
                            initial={{ opacity: reduced ? 1 : 0 }}
                            animate={{ opacity: on ? 1 : 0 }}
                            transition={{ delay: t(2.3 + i * 0.45), duration: 0.3 }}
                        />
                        <motion.text
                            x={l.to[0]}
                            y={l.to[1] + 4}
                            fontSize="12"
                            fontWeight="600"
                            style={{ fill: 'hsl(var(--claude))' }}
                            fontFamily="Inter, sans-serif"
                            initial={{ opacity: reduced ? 1 : 0 }}
                            animate={{ opacity: on ? 1 : 0 }}
                            transition={{ delay: t(2.4 + i * 0.45), duration: 0.3 }}
                        >
                            {l.text}
                        </motion.text>
                    </g>
                ))}
                {!reduced && (
                    <motion.g
                        initial={{ opacity: 0, x: visits[0][0], y: visits[0][1] }}
                        animate={on ? { opacity: [0, 1, 1, 1, 1, 0], x: visits.map((v) => v[0]).concat(visits[visits.length - 1][0]), y: visits.map((v) => v[1]).concat(visits[visits.length - 1][1]) } : undefined}
                        transition={{ delay: 1.8, duration: 2.6, times: [0, 0.25, 0.45, 0.65, 0.85, 1], ease: 'easeInOut' }}
                    >
                        <path d="M0 0 L0 15 L4 11.2 L6.7 17 L9.1 16 L6.6 10.3 L12 10.1 Z" style={{ fill: 'hsl(var(--claude))' }} stroke="white" strokeWidth="1.2" />
                    </motion.g>
                )}
            </svg>
            <motion.div
                className="max-w-[240px] space-y-2"
                initial={reduced ? false : { opacity: 0, y: 6 }}
                animate={on ? { opacity: 1, y: 0 } : undefined}
                transition={{ delay: t(3.8), type: 'spring', visualDuration: 0.5, bounce: 0.1 }}
            >
                <div className="flex items-center gap-1.5 font-mono text-[10.5px] text-muted-foreground">
                    <Sparkles className="h-3 w-3 text-claude" /> get_board_image
                </div>
                <div className="rounded-2xl rounded-tl-sm border border-border bg-card px-3.5 py-2.5 text-[13px] leading-relaxed shadow-chrome">
                    I labelled the roof, door and window. Want a floor plan next?
                </div>
            </motion.div>
        </div>
    );
}

export function Bento() {
    return (
        <section id="features" className="scroll-mt-24">
            <SectionHeading eyebrow="What's on the board" title="Built for people. Readable by models.">
                Everything below is in the app today. No sign-up, nothing to install.
            </SectionHeading>
            <div className="mt-12 grid grid-cols-1 gap-4 md:grid-cols-3">
                <Cell className="md:col-span-2" title="Everyone sees the same board, instantly" body="People and AIs edit together without conflicts. Every change lands in the same order for every tab.">
                    <MultiplayerDemo />
                </Cell>
                <Cell title="Math that looks like math" body="Press M and type LaTeX. Ask the AI for a worked solution and it writes each step on the board." delay={0.05}>
                    <MathDemo />
                </Cell>
                <Cell title="Diagrams that arrange themselves" body="Describe a process and the boxes arrive laid out and connected, ready to edit." delay={0.05}>
                    <LayoutDemo />
                </Cell>
                <Cell className="md:col-span-2" title="Your AI can read your sketches" body="Draw something rough. The assistant sees it as an image, understands it, and builds on it." delay={0.1}>
                    <SeesSketchDemo />
                </Cell>
            </div>
            <Reveal className="mt-6 flex flex-wrap items-center gap-x-6 gap-y-2 text-[14px] text-muted-foreground">
                {[
                    { icon: WifiOff, text: 'Works offline, syncs when you reconnect' },
                    { icon: ImagePlus, text: 'Drop images in, export PNG out' },
                    { icon: Github, text: 'Open source, self-host in a minute' },
                ].map((f) => (
                    <span key={f.text} className="flex items-center gap-2">
                        <f.icon className="h-4 w-4 text-foreground/70" strokeWidth={1.75} />
                        {f.text}
                    </span>
                ))}
            </Reveal>
        </section>
    );
}
