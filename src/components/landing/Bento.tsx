import { Download, Github, ImagePlus, Sparkles, WifiOff } from 'lucide-react';
import { AnimatePresence, motion, useInView, useReducedMotion } from 'motion/react';
import { useEffect, useRef, useState } from 'react';
import { cn } from '@/lib/utils';
import { Reveal, SectionHeading } from './Reveal';

/** Card with a soft light that follows the pointer. */
function Cell({ title, children, body, className, delay = 0 }: { title: string; body: string; children: React.ReactNode; className?: string; delay?: number }) {
    const ref = useRef<HTMLDivElement>(null);
    return (
        <Reveal delay={delay} className={cn('min-w-0', className)}>
            <div
                ref={ref}
                onPointerMove={(e) => {
                    const r = ref.current!.getBoundingClientRect();
                    ref.current!.style.setProperty('--x', `${e.clientX - r.left}px`);
                    ref.current!.style.setProperty('--y', `${e.clientY - r.top}px`);
                }}
                className="group relative flex h-full flex-col overflow-hidden rounded-2xl border border-border bg-card transition-colors duration-300 hover:border-foreground/15"
            >
                <div
                    className="pointer-events-none absolute inset-0 opacity-0 transition-opacity duration-300 group-hover:opacity-100"
                    style={{ background: 'radial-gradient(420px circle at var(--x) var(--y), hsl(var(--accent) / 0.07), transparent 60%)' }}
                />
                <div className="relative flex min-h-[190px] flex-1 items-center justify-center overflow-hidden border-b border-border/70 bg-background/60">{children}</div>
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
                <motion.div animate={{ x: 230 - pos[0] / 2, y: 90 - pos[1] / 2 }} transition={{ type: 'spring', visualDuration: 0.9, bounce: 0.1 }} className="absolute flex items-start gap-0.5">
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

function MathDemo() {
    return (
        <div className="flex flex-col items-center gap-3 px-6 text-foreground">
            <div className="text-[30px] leading-none" style={{ fontFamily: '"Latin Modern Math", "STIX Two Math", "Cambria Math", Georgia, serif' }}>
                <i>e</i>
                <sup className="text-[0.6em]">
                    <i>iπ</i>
                </sup>{' '}
                + 1 = 0
            </div>
            <code className="rounded-md border border-border bg-card px-2 py-1 font-mono text-[11.5px] text-muted-foreground">e^{'{'}i\pi{'}'} + 1 = 0</code>
        </div>
    );
}

function LayoutDemo() {
    const [ref, i] = useLoop(2, 2200);
    const laid = i === 1;
    const nodes = [
        { a: [10, 80], b: [0, 0] },
        { a: [130, 10], b: [100, 0] },
        { a: [60, 130], b: [200, 0] },
        { a: [180, 110], b: [100, 70] },
    ];
    return (
        <div ref={ref} className="relative h-[110px] w-[270px]">
            {nodes.map((n, k) => (
                <motion.div
                    key={k}
                    animate={{ x: laid ? n.b[0] : n.a[0] * 0.8, y: laid ? n.b[1] + 10 : n.a[1] * 0.6, rotate: laid ? 0 : (k - 1.5) * 6 }}
                    transition={{ type: 'spring', visualDuration: 0.7, bounce: 0.2, delay: k * 0.05 }}
                    className={cn('absolute h-8 w-[70px] rounded-md border-2 border-foreground', k === 3 ? 'bg-[#a5d8ff]' : 'bg-card')}
                />
            ))}
            <motion.div animate={{ opacity: laid ? 1 : 0 }} className="absolute left-0 top-[50px] h-[2px] w-[270px] bg-transparent" />
        </div>
    );
}

function OfflineDemo() {
    const [ref, i] = useLoop(3, 1600);
    const states = [
        { icon: <WifiOff className="h-3.5 w-3.5" />, text: 'Offline · saved locally', dot: 'bg-muted-foreground' },
        { icon: <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-warning border-t-transparent" />, text: 'Syncing 3 changes…', dot: 'bg-warning' },
        { icon: <span className="h-2 w-2 rounded-full bg-success" />, text: 'Live', dot: 'bg-success' },
    ];
    const s = states[i];
    return (
        <div ref={ref} className="flex h-10 items-center">
            <AnimatePresence mode="popLayout" initial={false}>
                <motion.div
                    key={i}
                    initial={{ opacity: 0, y: 10, filter: 'blur(3px)' }}
                    animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
                    exit={{ opacity: 0, y: -10, filter: 'blur(3px)' }}
                    className="flex items-center gap-2 rounded-xl border border-border bg-card px-3.5 py-2 text-[13px] text-muted-foreground shadow-chrome"
                >
                    {s.icon}
                    {s.text}
                </motion.div>
            </AnimatePresence>
        </div>
    );
}

function SeesSketchDemo() {
    return (
        <div className="flex w-full items-center justify-center gap-6 px-6">
            <svg viewBox="0 0 120 110" className="h-[120px] w-[130px] shrink-0 text-foreground" aria-hidden>
                <path d="M18 52 L60 16 L102 50" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
                <path d="M26 48 C 25 70, 27 86, 26 98 C 50 99, 74 97, 96 99 C 95 80, 97 64, 95 47" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
                <path d="M44 98 C 44 86, 44 78, 45 72 C 52 71, 58 72, 62 72 C 62 82, 62 90, 62 98" fill="none" stroke="#e03131" strokeWidth="3" strokeLinecap="round" />
                <circle cx="80" cy="66" r="7" fill="none" stroke="#1971c2" strokeWidth="3" />
            </svg>
            <div className="max-w-[260px] space-y-2">
                <div className="flex items-center gap-1.5 font-mono text-[10.5px] text-muted-foreground">
                    <Sparkles className="h-3 w-3 text-claude" /> get_board_image
                </div>
                <div className="rounded-2xl rounded-tl-sm border border-border bg-card px-3.5 py-2.5 text-[13px] leading-relaxed shadow-chrome">
                    A house with a red door and a round window. Want me to label the parts?
                </div>
            </div>
        </div>
    );
}

export function Bento() {
    return (
        <section id="features" className="scroll-mt-24">
            <SectionHeading eyebrow="What's on the board" title="A small, fast whiteboard that does the real work.">
                Everything below is in the app today. No sign-up, nothing to install.
            </SectionHeading>
            <div className="mt-12 grid grid-cols-1 gap-4 md:grid-cols-3">
                <Cell className="md:col-span-2" title="Real-time, in the same order for everyone" body="The server validates every change and broadcasts it in sequence, so every tab and every AI ends up with the same board.">
                    <MultiplayerDemo />
                </Cell>
                <Cell title="LaTeX that renders" body="Press M, type LaTeX, and get typeset math. The AI can write step-by-step solutions too." delay={0.05}>
                    <MathDemo />
                </Cell>
                <Cell title="Flowcharts that lay themselves out" body="Ask for a process and the nodes arrive already arranged and connected." delay={0.05}>
                    <LayoutDemo />
                </Cell>
                <Cell className="md:col-span-2" title="The AI can see what you sketch" body="Hand drawings are rendered to an image for the assistant, so it can read your scribbles and build on them." delay={0.1}>
                    <SeesSketchDemo />
                </Cell>
                <Cell title="Keeps working offline" body="Boards are cached in your browser. Edits made offline sync when you reconnect.">
                    <OfflineDemo />
                </Cell>
                <Cell title="Images in, PNG out" body="Drop in screenshots and photos. Export the whole board as a crisp PNG." delay={0.05}>
                    <div className="flex items-center gap-3 text-muted-foreground">
                        <span className="flex h-12 w-12 items-center justify-center rounded-xl border border-dashed border-border bg-card"><ImagePlus className="h-5 w-5" /></span>
                        <span className="font-mono text-xs">→</span>
                        <span className="flex h-12 items-center gap-2 rounded-xl bg-primary px-4 text-[13px] font-medium text-primary-foreground"><Download className="h-4 w-4" /> board.png</span>
                    </div>
                </Cell>
                <Cell title="Open source" body="Frontend and backend are on GitHub. Run your own server with one command." delay={0.1}>
                    <div className="flex flex-col items-center gap-2">
                        <Github className="h-8 w-8 text-foreground" strokeWidth={1.5} />
                        <code className="rounded-md border border-border bg-card px-2 py-1 font-mono text-[11.5px] text-muted-foreground">npm run dev</code>
                    </div>
                </Cell>
            </div>
        </section>
    );
}
