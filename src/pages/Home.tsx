import { ArrowRight, Code2, MousePointer2, Sparkles, SquareTerminal, Wind, Zap } from 'lucide-react';
import { motion, useReducedMotion } from 'motion/react';
import { useEffect } from 'react';
import { Link } from 'react-router-dom';
import Footer from '@/components/footer';
import Navbar from '@/components/navbar';
import { Bento } from '@/components/landing/Bento';
import { HeroBoard } from '@/components/landing/HeroBoard';
import { McpSection } from '@/components/landing/McpSection';
import { Reveal, usePauseOffscreen } from '@/components/landing/Reveal';
import { cn } from '@/lib/utils';
import { Shortcuts } from '@/components/landing/Shortcuts';
import { LogoMark } from '@/components/logo';

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
            <div className="mx-auto max-w-6xl px-[max(16px,env(safe-area-inset-left))] pb-8 pt-14 sm:pt-20">
                <motion.a
                    href="#mcp"
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="group inline-flex items-center gap-2 rounded-full border border-border bg-card py-1 pl-1 pr-3 text-[12.5px] text-muted-foreground shadow-[0_1px_2px_hsl(0_0%_0%/0.04)] transition-colors hover:text-foreground"
                >
                    <span className="flex items-center gap-1 rounded-full bg-claude/15 px-2 py-0.5 font-mono text-[11px] font-medium text-claude">
                        <Sparkles className="h-3 w-3" /> MCP
                    </span>
                    Works with Claude, Cursor and VS Code
                    <ArrowRight className="h-3 w-3 transition-transform group-hover:translate-x-0.5" />
                </motion.a>

                <h1 className="mt-6 max-w-[15ch] text-balance text-[clamp(44px,8vw,92px)] font-semibold leading-[0.95] tracking-display" aria-label={HEADLINE.join(' ')}>
                    {HEADLINE.map((w, i) => (
                        <motion.span
                            key={i}
                            aria-hidden
                            className="mr-[0.22em] inline-block last:mr-0"
                            initial={reduced ? { opacity: 0 } : { opacity: 0, y: '0.35em', filter: 'blur(8px)' }}
                            animate={reduced ? { opacity: 1 } : { opacity: 1, y: 0, filter: 'blur(0px)' }}
                            transition={{ type: 'spring', visualDuration: 0.7, bounce: 0, delay: 0.08 + i * 0.06 }}
                        >
                            {w === 'AI' ? (
                                <span className="text-claude">AI</span>
                            ) : w === 'on.' ? (
                                <>
                                    on
                                    <span className="ml-[0.06em] inline-block h-[0.78em] w-[0.07em] translate-y-[0.04em] animate-blink rounded-full bg-claude" />
                                </>
                            ) : (
                                w
                            )}
                        </motion.span>
                    ))}
                </h1>

                <motion.p
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ type: 'spring', visualDuration: 0.7, bounce: 0, delay: 0.5 }}
                    className="mt-7 max-w-[54ch] text-pretty text-[18px] leading-relaxed text-muted-foreground"
                >
                    Sketch with your team in real time. Connect Claude or any MCP client and watch it add flowcharts, diagrams and math to the same board.
                </motion.p>
                <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ type: 'spring', visualDuration: 0.7, bounce: 0, delay: 0.6 }}
                    className="mt-8 flex flex-wrap items-center gap-x-5 gap-y-4"
                >
                    <div className="flex flex-wrap gap-2.5">
                        <Link
                            to="/board"
                            className="group relative inline-flex h-12 items-center gap-2 overflow-hidden rounded-xl bg-primary px-5 text-[15px] font-medium text-primary-foreground shadow-[inset_0_1px_0_hsl(0_0%_100%/0.15),0_8px_24px_-8px_hsl(225_20%_10%/0.5)] transition-transform active:scale-[0.97]"
                        >
                            <span className="absolute inset-0 animate-sheen bg-[linear-gradient(100deg,transparent_30%,hsl(0_0%_100%/0.22)_50%,transparent_70%)] [animation-iteration-count:3]" />
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
                transition={{ type: 'spring', visualDuration: 0.9, bounce: 0.1, delay: 0.45 }}
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

function Cta() {
    const [ref, paused] = usePauseOffscreen<HTMLElement>();
    return (
        <section ref={ref} className={cn('mx-auto max-w-6xl px-[max(16px,env(safe-area-inset-left))]', paused)}>
            <Reveal>
                <div className="relative overflow-hidden rounded-3xl border border-border bg-card">
                    <div className="dot-grid absolute inset-0 opacity-60 [mask-image:radial-gradient(ellipse_at_center,#000,transparent_75%)]" />
                    <div className="pointer-events-none absolute -top-40 left-1/2 h-80 w-[640px] max-w-full -translate-x-1/2 rounded-full bg-[radial-gradient(closest-side,hsl(var(--claude)/0.18),transparent)]" />
                    <div className="relative flex flex-col items-center px-6 py-20 text-center">
                        <LogoMark className="h-12 w-12" />
                        <h2 className="mt-6 max-w-[18ch] text-balance text-[clamp(30px,4.5vw,52px)] font-semibold leading-[1.02] tracking-[-0.04em]">Start a board. Invite a teammate. Or an AI.</h2>
                        <p className="mt-4 max-w-md text-[16px] text-muted-foreground">A new board takes one click and lives at its own link.</p>
                        <Link to="/board" className="group mt-8 inline-flex h-12 items-center gap-2 rounded-xl bg-primary px-6 text-[15px] font-medium text-primary-foreground transition-transform active:scale-[0.97]">
                            Open a board
                            <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
                        </Link>
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
            <main className="relative space-y-28 pb-28 sm:space-y-36">
                <div>
                    <Hero />
                    <WorksWith />
                </div>
                <div className="mx-auto max-w-6xl px-[max(16px,env(safe-area-inset-left))]">
                    <McpSection />
                </div>
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
