import { ArrowRight, Code2, MousePointer2, Sparkles, SquareTerminal, Wind, Zap } from 'lucide-react';
import { motion, useInView, useReducedMotion } from 'motion/react';
import { useEffect, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import Footer from '@/components/footer';
import Navbar from '@/components/navbar';
import { Bento } from '@/components/landing/Bento';
import { HeroBoard } from '@/components/landing/HeroBoard';
import { McpSection } from '@/components/landing/McpSection';
import { Reveal } from '@/components/landing/Reveal';
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
            <div className="mx-auto max-w-6xl px-[max(16px,env(safe-area-inset-left))] pb-7 pt-8 sm:pt-10">
                <motion.p
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ duration: 0.4 }}
                    className="flex items-center gap-2 font-mono text-[12px] uppercase tracking-[0.08em] text-muted-foreground"
                >
                    <span className="h-1.5 w-1.5 rounded-full bg-claude" />
                    <span className="hidden sm:inline">Realtime whiteboard · </span>MCP server built in
                </motion.p>

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
                                            initial={{ pathLength: reduced ? 1 : 0 }}
                                            animate={{ pathLength: 1 }}
                                            transition={{ duration: 0.7, ease: [0.65, 0, 0.35, 1], delay: reduced ? 0 : 0.75 }}
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
        <section className="mx-auto mt-12 max-w-6xl px-[max(16px,env(safe-area-inset-left))]">
            <Reveal className="flex flex-col gap-4 border-y border-border/70 py-6 md:flex-row md:items-center md:gap-10">
                <p className="shrink-0 font-mono text-[11.5px] uppercase tracking-[0.08em] text-muted-foreground">Draws with any MCP client</p>
                <ul className="grid flex-1 grid-cols-2 gap-x-6 gap-y-3 min-[480px]:grid-cols-3 lg:grid-cols-6">
                    {CLIENTS.map((c) => (
                        <li key={c.name} className="flex items-center gap-2.5 whitespace-nowrap text-[16px] font-semibold tracking-tightish text-foreground/75">
                            <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg border border-border bg-card text-foreground/70" aria-hidden>
                                <c.icon className="h-3.5 w-3.5" strokeWidth={2} />
                            </span>
                            {c.name}
                        </li>
                    ))}
                </ul>
            </Reveal>
        </section>
    );
}

const PROMPTS = ['Draw our signup flow', 'Sketch the system architecture', 'Solve ∫ x² dx step by step', 'Turn my sketch into a clean diagram'];

/** Type what you want an AI to draw; it opens a board with Connect your AI and your request ready. */
function PromptBox() {
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
        if (!inView || reduced || !demo) return;
        const text = PROMPTS[i];
        if (n < text.length) {
            const t = setTimeout(() => setN(n + 1), 45);
            return () => clearTimeout(t);
        }
        const t = setTimeout(() => {
            setI((i + 1) % PROMPTS.length);
            setN(0);
        }, 1800);
        return () => clearTimeout(t);
    }, [inView, reduced, demo, i, n]);
    return (
        <form
            ref={ref}
            className="mx-auto mt-10 w-full max-w-xl"
            onSubmit={(e) => {
                e.preventDefault();
                const ask = value.trim() || PROMPTS[i];
                navigate(`/board?connect=ai&ask=${encodeURIComponent(ask)}`);
            }}
        >
            <div className="flex items-center gap-3 rounded-2xl border border-border bg-background p-2 pl-4 text-left shadow-lift transition-[border-color,box-shadow] focus-within:border-ring focus-within:shadow-[0_0_0_4px_hsl(var(--ring)/0.15)]">
                <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-claude text-white">
                    <Sparkles className="h-3.5 w-3.5" />
                </span>
                <div className="relative min-w-0 flex-1">
                    <input
                        value={value}
                        onChange={(e) => setValue(e.target.value)}
                        onFocus={() => setFocused(true)}
                        onBlur={() => setFocused(false)}
                        aria-label="What should your AI draw?"
                        className="h-10 w-full bg-transparent text-[15px] outline-none"
                    />
                    {demo && (
                        <span className="pointer-events-none absolute inset-0 flex items-center truncate text-[15px] text-muted-foreground" aria-hidden>
                            Ask your AI to “{PROMPTS[i].slice(0, n)}
                            <span className="ml-px inline-block h-[1.05em] w-[1.5px] animate-blink bg-foreground" />”
                        </span>
                    )}
                </div>
                <button type="submit" className="group inline-flex h-11 shrink-0 items-center gap-2 rounded-xl bg-primary px-4 text-[14.5px] font-medium text-primary-foreground transition-transform active:scale-[0.97] sm:px-5">
                    Open a board
                    <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
                </button>
            </div>
            <p className="mt-4 text-[13.5px] text-muted-foreground">We'll open a new board with the Connect your AI steps and your request ready to paste.</p>
        </form>
    );
}

function Cta() {
    return (
        <section className="mx-auto max-w-6xl px-[max(16px,env(safe-area-inset-left))]">
            <Reveal>
                <div className="relative overflow-hidden rounded-3xl border border-border bg-card dark:bg-[hsl(228_9%_10.5%)]">
                    <div className="dot-grid absolute inset-0 opacity-60 [mask-image:radial-gradient(ellipse_at_center,#000,transparent_75%)]" />
                    <svg className="pointer-events-none absolute right-[8%] top-[18%] hidden h-24 w-40 text-foreground/15 md:block" viewBox="0 0 160 96" aria-hidden>
                        <rect x="2" y="2" width="70" height="40" rx="8" fill="none" stroke="currentColor" strokeWidth="2" />
                        <path d="M72 22 H 108" stroke="currentColor" strokeWidth="2" />
                        <path d="M124 6 L144 22 L124 38 L104 22 Z" fill="none" stroke="currentColor" strokeWidth="2" />
                    </svg>
                    <svg className="pointer-events-none absolute bottom-[16%] left-[7%] hidden h-24 w-36 md:block" viewBox="0 0 140 96" aria-hidden>
                        <path d="M8 70 C 30 20, 60 90, 90 40 S 130 30, 132 50" fill="none" stroke="#1971c2" strokeOpacity="0.35" strokeWidth="3" strokeLinecap="round" />
                        <path d="M118 8 L118 25 L122.6 20.8 L125.6 27.5 L128.4 26.3 L125.5 19.8 L131.6 19.6 Z" style={{ fill: 'hsl(var(--claude))' }} />
                    </svg>
                    <div className="relative flex flex-col items-center px-5 py-20 text-center sm:py-28">
                        <h2 className="max-w-[16ch] text-balance text-[clamp(34px,6vw,68px)] font-semibold leading-[0.98] tracking-[-0.045em]">Start a board. Invite a teammate. Or an AI.</h2>
                        <p className="mt-5 max-w-md text-balance text-[17px] text-muted-foreground">One click, no account. Every board lives at its own link.</p>
                        <PromptBox />
                    </div>
                </div>
            </Reveal>
        </section>
    );
}

export default function Home() {
    useEffect(() => {
        document.title = 'SketchSync · The whiteboard your AI can draw on';
    }, []);
    return (
        <div className="min-h-screen overflow-x-clip bg-background">
            <div className="pointer-events-none absolute inset-x-0 top-0 h-[720px] dot-grid opacity-70 [mask-image:linear-gradient(to_bottom,#000,transparent)]" />
            <Navbar />
            <main className="relative space-y-24 pb-24 sm:space-y-32 sm:pb-32">
                <div>
                    <Hero />
                    <WorksWith />
                </div>
                <McpSection />
                <div className="mx-auto max-w-6xl px-[max(16px,env(safe-area-inset-left))]">
                    <Bento />
                </div>
                <div className="mx-auto max-w-6xl px-[max(16px,env(safe-area-inset-left))]">
                    <Shortcuts />
                </div>
                <Cta />
            </main>
            <Footer />
        </div>
    );
}
