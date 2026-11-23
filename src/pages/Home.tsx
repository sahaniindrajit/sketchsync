import { ArrowRight, Code2, Github, MousePointer2, Sparkles, SquareTerminal, Wind, Zap } from 'lucide-react';
import { AnimatePresence, motion, useInView, useReducedMotion } from 'motion/react';
import { displayFill, useTheme } from '@/lib/theme';
import { useCallback, useEffect, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import Footer from '@/components/footer';
import Navbar from '@/components/navbar';
import { Bento } from '@/components/landing/Bento';
import { HeroBoard } from '@/components/landing/HeroBoard';
import { McpSection } from '@/components/landing/McpSection';
import { Reveal } from '@/components/landing/Reveal';
import { Frame, Note } from '@/components/landing/Canvas';
import { Shortcuts } from '@/components/landing/Shortcuts';

const HEADLINE = ['The', 'whiteboard', 'your', 'AI', 'can', 'draw', 'on.'];
const CLIENTS = [
    { name: 'Claude', icon: Sparkles },
    { name: 'Claude Code', icon: SquareTerminal },
    { name: 'Cursor', icon: MousePointer2 },
    { name: 'VS Code', icon: Code2 },
    { name: 'Windsurf', icon: Wind },
    { name: 'Zed', icon: Zap },
];

function Hero() {
    const reduced = useReducedMotion();
    return (
        <section className="relative">
            <div className="relative mx-auto max-w-6xl px-[max(16px,env(safe-area-inset-left))] pb-7 pt-8 sm:pt-10">
                <motion.p
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ duration: 0.4 }}
                    className="flex items-center gap-2 font-mono text-[12px] uppercase tracking-[0.08em] text-muted-foreground"
                >
                    <span className="h-1.5 w-1.5 rounded-full bg-claude" />
                    <span className="hidden sm:inline">Realtime whiteboard · </span>MCP server built in
                </motion.p>

                <Note author="Maya" color="yellow" rotate={-2} arrow="down-right" className="absolute right-[300px] top-[318px] hidden xl:block">
                    Watch Claude's tool calls land here.
                </Note>
                <h1 className="mt-4 max-w-[16ch] text-balance text-[clamp(40px,6.2vw,76px)] font-semibold leading-[0.95] tracking-display" aria-label={HEADLINE.join(' ')}>
                    {HEADLINE.map((w, i) => (
                        <motion.span
                            key={i}
                            aria-hidden
                            className="mr-[0.22em] inline-block last:mr-0"
                            initial={reduced ? { opacity: 0 } : { opacity: 0, y: '0.35em', filter: 'blur(8px)' }}
                            animate={reduced ? { opacity: 1 } : { opacity: 1, y: 0, filter: 'blur(0px)' }}
                            transition={reduced ? { duration: 0.15 } : { type: 'spring', visualDuration: 0.7, bounce: 0, delay: 0.08 + i * 0.06 }}
                        >
                            {w === 'AI' ? (
                                <span className="relative text-claude">
                                    AI
                                    <svg viewBox="0 0 120 20" preserveAspectRatio="none" className="absolute -bottom-[0.12em] left-[-6%] h-[0.22em] w-[112%] overflow-visible" aria-hidden>
                                        <motion.path
                                            d="M3 13 C 30 5, 70 4, 117 9"
                                            fill="none"
                                            stroke="currentColor"
                                            strokeWidth="5"
                                            strokeLinecap="round"
                                            vectorEffect="non-scaling-stroke"
                                            initial={reduced ? { pathLength: 1, opacity: 1 } : { pathLength: 0, opacity: 0 }}
                                            animate={{ pathLength: 1, opacity: 1 }}
                                            transition={{ pathLength: { duration: 0.7, ease: [0.65, 0, 0.35, 1], delay: reduced ? 0 : 0.75 }, opacity: { duration: 0.01, delay: reduced ? 0 : 0.75 } }}
                                        />
                                    </svg>
                                </span>
                            ) : w === 'on.' ? (
                                'on'
                            ) : (
                                w
                            )}
                        </motion.span>
                    ))}
                </h1>

                <motion.p
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={reduced ? { duration: 0.15 } : { type: 'spring', visualDuration: 0.7, bounce: 0, delay: 0.5 }}
                    className="mt-5 max-w-[60ch] text-pretty text-[17px] leading-relaxed text-muted-foreground"
                >
                    Sketch with your team in real time. Connect Claude or any MCP client and watch it add flowcharts, diagrams and math to the same board.
                </motion.p>
                <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={reduced ? { duration: 0.15 } : { type: 'spring', visualDuration: 0.7, bounce: 0, delay: 0.6 }}
                    className="mt-6 flex flex-wrap items-center gap-x-5 gap-y-3"
                >
                    <div className="flex flex-wrap gap-2.5">
                        <Link
                            to="/board"
                            className="group relative inline-flex h-12 items-center gap-2 overflow-hidden rounded-xl bg-primary px-5 text-[15px] font-medium text-primary-foreground shadow-[inset_0_1px_0_hsl(0_0%_100%/0.15),0_8px_24px_-8px_hsl(225_20%_10%/0.5)] transition-transform active:scale-[0.97]"
                        >
                            <span className="relative">Open a board</span>
                            <ArrowRight className="relative h-4 w-4 transition-transform group-hover:translate-x-0.5" />
                        </Link>
                        <a href="#mcp" className="inline-flex h-12 items-center gap-2 rounded-xl border border-border bg-card px-5 text-[15px] font-medium transition-colors hover:bg-secondary">
                            Connect your AI
                        </a>
                    </div>
                    <p className="font-mono text-[12px] text-muted-foreground">Free · no sign-up · open source</p>
                </motion.div>
            </div>

            <motion.div
                initial={{ opacity: 0, y: 40, scale: 0.98 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                transition={reduced ? { duration: 0.15 } : { type: 'spring', visualDuration: 0.9, bounce: 0.1, delay: 0.45 }}
                className="mx-auto max-w-6xl px-[max(16px,env(safe-area-inset-left))]"
            >
                <HeroBoard />
            </motion.div>
        </section>
    );
}

function WorksWith() {
    return (
        <section className="mx-auto mt-10 max-w-6xl px-[max(16px,env(safe-area-inset-left))]">
            <Reveal className="flex flex-col gap-4 border-y border-border/70 py-6 md:flex-row md:items-center md:gap-10">
                <p className="shrink-0 font-mono text-[11.5px] uppercase tracking-[0.08em] text-muted-foreground">Draws with any MCP client</p>
                <ul className="flex flex-1 flex-wrap gap-x-6 gap-y-3 xl:flex-nowrap">
                    {CLIENTS.map((c) => (
                        <li key={c.name} className="flex items-center gap-2.5 whitespace-nowrap text-[16px] font-semibold tracking-tightish text-foreground/75">
                            <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg border border-border bg-card text-foreground/70" aria-hidden>
                                <c.icon className="h-3.5 w-3.5" strokeWidth={2} />
                            </span>
                            {c.name}
                        </li>
                    ))}
                </ul>
                <a
                    href="https://github.com/sahaniindrajit/sketchsync"
                    target="_blank"
                    rel="noreferrer"
                    className="flex shrink-0 items-center gap-2 rounded-lg border border-border bg-card px-3 py-1.5 text-[13px] font-medium transition-colors hover:bg-secondary"
                >
                    <Github className="h-4 w-4" strokeWidth={1.75} />
                    Open source
                </a>
            </Reveal>
        </section>
    );
}

const PROMPTS = ['Draw our signup flow', 'Sketch the system architecture', 'Solve ∫ x² dx step by step', 'Turn my scribble into a diagram'];

type Mark = { d?: string; text?: string; x?: number; y?: number; fill?: string; size?: number };
/** What the mini board draws for each example request, stroke by stroke. */
const SKETCHES: Mark[][] = [
    [
        { d: 'M20 96 h92 a10 10 0 0 1 10 10 v28 a10 10 0 0 1 -10 10 h-92 a10 10 0 0 1 -10 -10 v-28 a10 10 0 0 1 10 -10 z', fill: '#f1eee8' },
        { text: 'Sign up', x: 66, y: 125 },
        { d: 'M122 120 H 150 M144 114 L151 120 L144 126' },
        { d: 'M200 84 L248 120 L200 156 L152 120 Z', fill: '#f6dccf' },
        { text: 'Valid?', x: 200, y: 125 },
        { d: 'M248 120 H 272 M266 114 L273 120 L266 126' },
        { d: 'M284 96 h56 a10 10 0 0 1 10 10 v28 a10 10 0 0 1 -10 10 h-56 a10 10 0 0 1 -10 -10 v-28 a10 10 0 0 1 10 -10 z', fill: '#dbe7f5' },
        { text: 'Done', x: 312, y: 125 },
    ],
    [
        { d: 'M20 100 h80 v40 h-80 z', fill: '#f1eee8' },
        { text: 'Browser', x: 60, y: 125 },
        { d: 'M100 120 H 140 M134 114 L141 120 L134 126' },
        { d: 'M142 100 h70 v40 h-70 z', fill: '#f6dccf' },
        { text: 'API', x: 177, y: 125 },
        { d: 'M212 112 C 236 104, 240 72, 262 70 M255 64 L263 70 L256 77' },
        { d: 'M212 128 C 236 136, 240 168, 262 170 M256 163 L263 170 L255 176' },
        { d: 'M264 52 h76 v36 h-76 z', fill: '#dbe7f5' },
        { text: 'Cache', x: 302, y: 75 },
        { d: 'M264 152 h76 v36 h-76 z', fill: '#dbe7f5' },
        { text: 'Postgres', x: 302, y: 175 },
    ],
    [
        { text: '∫ x² dx', x: 180, y: 96, size: 30 },
        { text: '= x³/3 + C', x: 180, y: 144, size: 28 },
        { text: 'power rule: xⁿ → xⁿ⁺¹/(n+1)', x: 180, y: 184, size: 13 },
    ],
    [
        { d: 'M30 140 C 20 100, 60 70, 90 92 C 120 110, 140 70, 120 150 C 100 190, 50 180, 30 140' },
        { d: 'M150 120 H 196 M189 113 L197 120 L189 127' },
        { d: 'M214 84 h110 a12 12 0 0 1 12 12 v48 a12 12 0 0 1 -12 12 h-110 a12 12 0 0 1 -12 -12 v-48 a12 12 0 0 1 12 -12 z', fill: '#f6dccf' },
        { text: 'Idea', x: 274, y: 125 },
    ],
];

/** A board that sketches whatever the prompt is asking for, as it is typed. */
function SketchBoard({ index, progress, typed }: { index: number; progress: number; typed: string }) {
    const theme = useTheme((s) => s.resolved);
    const marks = SKETCHES[index];
    const ready = progress < 0;
    const shown = ready ? 0 : progress * marks.length;
    const lastShown = Math.max(0, Math.min(marks.length - 1, Math.ceil(shown) - 1));
    const cursorAt = marks[lastShown];
    const [rx, ry] = cursorAt.text ? [cursorAt.x! + 30, cursorAt.y! + 6] : cursorAt.d ? cursorEnd(cursorAt.d) : [280, 180];
    const cx = Math.min(rx, 290);
    const cy = Math.min(ry, 178);
    return (
        <div className="dot-grid relative overflow-hidden rounded-2xl border border-border bg-background shadow-lift">
            {ready && (
                <span className="absolute inset-0 flex items-center justify-center text-[14px] text-muted-foreground">
                    <span className="max-w-[80%] -rotate-1 rounded-[3px] bg-[#fff3bf] px-4 py-3 text-[14px] leading-snug text-[#3d3200] shadow-[0_10px_24px_-12px_rgba(0,0,0,0.35)] dark:bg-[#e9dca0] dark:text-[#2d2500]">
                        <span className="mb-1 flex items-center gap-1.5 text-[11px] font-semibold opacity-70">
                            <Sparkles className="h-3 w-3 text-claude" /> For Claude
                        </span>
                        {typed.trim() ? typed : 'Type what you want drawn…'}
                    </span>
                </span>
            )}
            <svg viewBox="0 36 360 172" className="block h-auto w-full text-foreground" role="img" aria-label={`A board sketching: ${PROMPTS[index]}`}>
                <AnimatePresence mode="popLayout">
                    <motion.g key={index} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0, transition: { duration: 0.25 } }}>
                        {marks.map((m, i) => {
                            const on = Math.min(1, Math.max(0, shown - i));
                            return m.text ? (
                                <motion.text key={i} x={m.x} y={m.y} textAnchor="middle" fontSize={m.size ?? 14} fill="currentColor" fontFamily={index === 2 && i < 2 ? '"Latin Modern Math", "STIX Two Math", "Cambria Math", Georgia, serif' : 'Inter, sans-serif'} fontStyle={index === 2 && i < 2 ? 'italic' : undefined} animate={{ opacity: on }} initial={{ opacity: 0 }}>
                                    {m.text}
                                </motion.text>
                            ) : (
                                <g key={i}>
                                    {m.fill && <motion.path d={m.d} fill={displayFill(m.fill, theme)} stroke="none" initial={{ opacity: 0 }} animate={{ opacity: on >= 1 ? 1 : 0 }} />}
                                    <motion.path d={m.d} fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" initial={{ pathLength: 0, opacity: 0 }} animate={{ pathLength: on, opacity: on > 0 ? 1 : 0 }} transition={{ duration: 0.25 }} />
                                </g>
                            );
                        })}
                    </motion.g>
                </AnimatePresence>
                <motion.g initial={false} animate={{ x: cx, y: cy, opacity: progress > 0 && progress < 1 ? 1 : 0.0 }} transition={{ type: 'spring', visualDuration: 0.35, bounce: 0.1 }}>
                    <path d="M0 0 L0 16 L4.4 12 L7.3 18.4 L10 17.3 L7.2 11.1 L13 10.9 Z" style={{ fill: 'hsl(var(--claude))' }} stroke="white" strokeWidth="1.2" />
                    <rect x="12" y="18" width="50" height="18" rx="6" style={{ fill: 'hsl(var(--claude))' }} />
                    <text x="19" y="31" fontSize="10.5" fontWeight="600" fill="white" fontFamily="Geist Variable, sans-serif">
                        Claude
                    </text>
                </motion.g>
            </svg>
        </div>
    );
}

/** Where a path's last segment ends: good enough for parking the cursor. */
function cursorEnd(d: string): [number, number] {
    const nums = d.match(/-?\d+(\.\d+)?/g)?.map(Number) ?? [];
    if (d.includes('h') || nums.length < 2) return [nums[0] ?? 0, nums[1] ?? 0];
    return [nums[nums.length - 2], nums[nums.length - 1]];
}

/** Type what you want an AI to draw; it opens a board with Connect your AI and your request ready. */
function PromptBox({ onDemo }: { onDemo: (index: number, progress: number, typed: string) => void }) {
    const reduced = useReducedMotion();
    const navigate = useNavigate();
    const ref = useRef<HTMLFormElement>(null);
    const inView = useInView(ref, { amount: 0.6 });
    const [value, setValue] = useState('');
    const [focused, setFocused] = useState(false);
    const [i, setI] = useState(0);
    const [n, setN] = useState(reduced ? PROMPTS[0].length : 0);
    const demo = !value && !focused;
    useEffect(() => {
        // While you type your own request, the board waits for it instead of showing an example.
        onDemo(i, demo ? n / PROMPTS[i].length : -1, value);
    }, [i, n, demo, value, onDemo]);
    useEffect(() => {
        if (!inView || reduced || !demo) return;
        const text = PROMPTS[i];
        if (n < text.length) {
            const t = setTimeout(() => setN(n + 1), 55);
            return () => clearTimeout(t);
        }
        const t = setTimeout(() => {
            setI((i + 1) % PROMPTS.length);
            setN(0);
        }, 2200);
        return () => clearTimeout(t);
    }, [inView, reduced, demo, i, n]);
    return (
        <form
            ref={ref}
            className="w-full max-w-[600px]"
            onSubmit={(e) => {
                e.preventDefault();
                const ask = value.trim() || PROMPTS[i];
                navigate(`/board?connect=ai&ask=${encodeURIComponent(ask)}`);
            }}
        >
            <div className="flex flex-wrap items-center gap-3 rounded-2xl border border-border bg-background p-2 pl-4 text-left shadow-lift transition-[border-color,box-shadow] focus-within:border-ring focus-within:shadow-[0_0_0_4px_hsl(var(--ring)/0.15)] max-[440px]:pr-4">
                <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-claude text-white">
                    <Sparkles className="h-3.5 w-3.5" />
                </span>
                <div className="relative min-w-[200px] flex-[1_1_260px]">
                    <input
                        value={value}
                        onChange={(e) => setValue(e.target.value)}
                        onFocus={() => setFocused(true)}
                        onBlur={() => setFocused(false)}
                        aria-label="What should your AI draw?"
                        placeholder={focused ? 'Describe a diagram, a flow or a sketch…' : undefined}
                        className="h-10 w-full bg-transparent text-[15px] outline-none placeholder:text-muted-foreground"
                    />
                    {demo && (
                        <span className="pointer-events-none absolute inset-0 flex items-center overflow-hidden whitespace-nowrap text-[15px] text-muted-foreground" aria-hidden>
                            {PROMPTS[i].slice(0, n)}
                            <span className="ml-px inline-block h-[1.05em] w-[1.5px] shrink-0 animate-blink bg-foreground" />
                        </span>
                    )}
                </div>
                <button type="submit" className="group inline-flex h-11 shrink-0 items-center justify-center gap-2 rounded-xl bg-primary px-4 text-[14.5px] font-medium text-primary-foreground transition-transform active:scale-[0.97] max-[440px]:mb-2 max-[440px]:w-full sm:px-5">
                    Open a board
                    <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
                </button>
            </div>
            <p className="mt-4 text-balance text-[13.5px] text-muted-foreground">You'll get a fresh board, the steps to connect your AI, and your request ready to paste.</p>
        </form>
    );
}

function Cta() {
    const [demo, setDemo] = useState({ index: 0, progress: 0, typed: '' });
    const onDemo = useCallback((index: number, progress: number, typed: string) => setDemo({ index, progress, typed }), []);
    return (
        <section className="relative mx-auto max-w-6xl overflow-hidden px-[max(16px,env(safe-area-inset-left))]">
            <Frame name="Start" className="!p-0">
            <div className="dot-grid relative overflow-hidden rounded-[4px] bg-card dark:bg-[hsl(228_9%_10%)]">
            <div className="relative grid items-center gap-12 px-5 py-16 sm:px-12 sm:py-20 lg:grid-cols-[1fr_1fr]">
                <Reveal className="space-y-6">
                    <h2 className="max-w-[13ch] text-balance text-[clamp(36px,5vw,60px)] font-semibold leading-[0.98] tracking-[-0.045em]">Invite a teammate. Or an AI.</h2>
                    <p className="max-w-md text-[17px] leading-relaxed text-muted-foreground">Start a board in one click, no account. Tell your AI what to draw and watch it land.</p>
                    <PromptBox onDemo={onDemo} />
                </Reveal>
                <Reveal delay={0.1}>
                    <SketchBoard index={demo.index} progress={demo.progress} typed={demo.typed} />
                </Reveal>
            </div>
            </div>
            </Frame>
        </section>
    );
}

/** Space between sections, where collaborators leave notes. */
function Gutter({ children }: { children: React.ReactNode }) {
    return <div className="mx-auto flex min-h-[56px] max-w-6xl flex-col justify-center px-[max(16px,env(safe-area-inset-left))] py-6 sm:min-h-[132px]">{children}</div>;
}

export default function Home() {
    useEffect(() => {
        document.title = 'SketchSync · The whiteboard your AI can draw on';
    }, []);
    return (
        <div className="min-h-screen overflow-x-clip bg-background">
            {/* The whole page is one board. */}
            <div className="dot-grid pointer-events-none absolute inset-0 opacity-60" />
            <Navbar />
            <main className="relative">
                <Hero />
                <WorksWith />
                <Gutter>
                    <Note author="Maya" color="blue" rotate={-2} arrow="down" className="ml-[8%]">
                        How does Claude get onto our board?
                    </Note>
                </Gutter>
                <McpSection />
                <Gutter>
                    <Note author="Claude" color="clay" rotate={2} arrow="down-left" ai className="ml-auto mr-[10%]">
                        I can read what you sketch, too. Draw something rough and ask me about it.
                    </Note>
                </Gutter>
                <div className="mx-auto max-w-6xl px-[max(16px,env(safe-area-inset-left))]">
                    <Frame name="What's on the board">
                        <Bento />
                    </Frame>
                </div>
                <Gutter>
                    <Note author="Maya" color="yellow" rotate={-3} arrow="down-right" className="ml-[4%]">
                        And it's quick with a keyboard.
                    </Note>
                </Gutter>
                <div className="mx-auto max-w-6xl px-[max(16px,env(safe-area-inset-left))]">
                    <Frame name="Keyboard">
                        <Shortcuts />
                    </Frame>
                </div>
                <div className="h-24 sm:h-32" />
                <Cta />
                <div className="h-24 sm:h-32" />
            </main>
            <Footer />
        </div>
    );
}
