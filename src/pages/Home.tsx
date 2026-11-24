import '@fontsource-variable/bricolage-grotesque';
import { ArrowRight, Eraser, Hand, MousePointer2, Pencil, Square, Undo2 } from 'lucide-react';
import { AnimatePresence, motion, useInView } from 'motion/react';
import { lazy, Suspense, useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { animateViewport, undoLast, useBoard, useCanUndo, type Tool } from '@/board/store';
import { AiActivityToast } from '@/components/aiActivity';
import Footer from '@/components/footer';
import Navbar from '@/components/navbar';
import { CopyButton } from '@/components/shareDialog';
import { TooltipProvider } from '@/components/ui/tooltip';
import { fitRegion, goToStop, heroScript, mcpScript, resetMcpStop, resetTogetherStop, startDemoBoard, stopDemoBoard, togetherScript } from '@/components/landing/demo';
import { useAccount } from '@/lib/account';
import { useMedia } from '@/lib/useMedia';
import { cn } from '@/lib/utils';

/**
 * The landing page is one live board. The canvas stays pinned while short panels scroll past;
 * each panel moves the camera to another part of the same board. The canvas, cursors, AI
 * outline and Undo toast are the real app components running on a local board.
 */

const HEADLINE = 'The whiteboard your AI can draw on.';
const LiveCanvas = lazy(() => import('@/components/landing/LiveCanvas'));

function Panel({ index, onActive, id, children, className }: { index: number; onActive: (i: number) => void; id?: string; children: React.ReactNode; className?: string }) {
    const ref = useRef<HTMLDivElement>(null);
    // Active while its text crosses the middle of the screen; the camera stays put in between.
    const active = useInView(ref, { margin: '-45% 0px -45% 0px' });
    useEffect(() => {
        if (active) onActive(index);
    }, [active, index, onActive]);
    return (
        <div id={id} className="pointer-events-none flex min-h-[100svh] scroll-mt-0 items-end px-[max(16px,env(safe-area-inset-left))] pb-[max(20px,env(safe-area-inset-bottom))] lg:items-center lg:pb-0">
            <div
                ref={ref}
                className={cn(
                    'pointer-events-auto w-full max-w-[470px] rounded-2xl border border-border/80 bg-[hsl(var(--background)/0.94)] p-4 shadow-chrome sm:p-5 backdrop-blur-xl lg:ml-[max(8px,4vw)] lg:rounded-none lg:border-0 lg:bg-transparent lg:p-0 lg:shadow-none lg:backdrop-blur-none',
                    className,
                )}
            >
                {children}
            </div>
        </div>
    );
}

const H2 = ({ children }: { children: React.ReactNode }) => (
    <h2 className="font-display text-[length:clamp(26px,3.6vw,46px)] font-semibold leading-[1.02] tracking-[-0.035em] text-foreground">{children}</h2>
);
const P = ({ children }: { children: React.ReactNode }) => <p className="mt-3 text-[15px] leading-relaxed text-muted-foreground lg:mt-4 lg:text-[17px]">{children}</p>;

const TOOLS: { tool: Tool; label: string; icon: typeof Pencil }[] = [
    { tool: 'pencil', label: 'Pencil', icon: Pencil },
    { tool: 'rect', label: 'Rectangle', icon: Square },
    { tool: 'select', label: 'Select', icon: MousePointer2 },
    { tool: 'hand', label: 'Pan', icon: Hand },
    { tool: 'eraser', label: 'Eraser', icon: Eraser },
];

/** A few of the board's own tools, so the hero canvas can be drawn on. */
function DemoDock({ show }: { show: boolean }) {
    const tool = useBoard((s) => s.tool);
    const setTool = useBoard((s) => s.setTool);
    const canUndo = useCanUndo();
    return (
        <AnimatePresence>
            {show && (
                <motion.div
                    initial={{ opacity: 0, y: 12 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: 12, transition: { duration: 0.15 } }}
                    className="absolute bottom-6 left-[72%] z-20 -translate-x-1/2 max-lg:hidden"
                >
                    <div className="chrome flex items-center gap-0.5 rounded-xl p-1" role="toolbar" aria-label="Drawing tools">
                        {TOOLS.map((t) => (
                            <button
                                key={t.tool}
                                type="button"
                                aria-label={t.label}
                                aria-pressed={tool === t.tool}
                                onClick={() => setTool(t.tool)}
                                className={cn('flex h-9 w-9 items-center justify-center rounded-lg transition-colors', tool === t.tool ? 'bg-accent/12 text-accent' : 'text-muted-foreground hover:bg-secondary hover:text-foreground')}
                            >
                                <t.icon className="h-[17px] w-[17px]" strokeWidth={1.75} />
                            </button>
                        ))}
                        <div className="mx-1 h-5 w-px bg-border" />
                        <button type="button" aria-label="Undo" disabled={!canUndo} onClick={undoLast} className="flex h-9 w-9 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground disabled:opacity-35">
                            <Undo2 className="h-[17px] w-[17px]" strokeWidth={1.75} />
                        </button>
                    </div>
                </motion.div>
            )}
        </AnimatePresence>
    );
}

/** The MCP stop's transcript: one request, the real tool calls, two boards changed. */
const CALLS: { tool: string; args: string; result: string }[] = [
    { tool: 'list_boards', args: '', result: '6 boards' },
    { tool: 'get_board', args: '"Q3 planning"', result: '5 shapes' },
    { tool: 'add_shapes', args: 'board: "Q3 planning", 5 shapes', result: 'added' },
    { tool: 'get_board', args: '"Onboarding"', result: '9 shapes' },
    { tool: 'update_shapes', args: 'board: "Onboarding", 4 moves', result: 'updated' },
];

function Transcript({ step }: { step: number }) {
    return (
        <div className="mt-4 overflow-hidden rounded-xl border border-border bg-card text-[13px] shadow-chrome lg:mt-6" aria-live="polite">
            <div className="border-b border-border/70 px-4 py-3">
                <p className="text-[12px] text-muted-foreground">You</p>
                <p className="mt-0.5 text-foreground">Add a risks section to Q3 planning, then tidy up Onboarding.</p>
            </div>
            <ol className="space-y-1 px-4 py-3 font-mono text-[11px] sm:space-y-1.5 sm:text-[12px]">
                {CALLS.map((c, i) => (
                    <li key={i} className={cn('flex items-baseline gap-2 transition-opacity duration-300', step > i ? 'opacity-100' : 'opacity-25')}>
                        <span className={cn('h-1.5 w-1.5 shrink-0 translate-y-[-1px] rounded-full', step > i ? 'bg-claude' : 'bg-border')} />
                        <span className="min-w-0 flex-1 truncate">
                            <span className="text-foreground">{c.tool}</span>
                            <span className="text-muted-foreground">({c.args})</span>
                        </span>
                        <span className="shrink-0 text-muted-foreground">{step > i ? c.result : ''}</span>
                    </li>
                ))}
            </ol>
            <div className={cn('border-t border-border/70 px-4 py-3 transition-opacity duration-500', step >= 6 ? 'opacity-100' : 'opacity-0')}>
                <p className="text-[12px] text-claude">Claude</p>
                <p className="mt-0.5 text-foreground">Done. Q3 planning has a Risks section, and the Onboarding steps are in order.</p>
            </div>
        </div>
    );
}

function Start() {
    const signedIn = useAccount((s) => s.status === 'signed-in');
    const install = 'git clone https://github.com/sahaniindrajit/sketchsync-Backend\ncd sketchsync-Backend\nnpm install && npm run dev';
    return (
        <section id="start" className="relative z-10 border-t border-border bg-background">
            <div className="mx-auto grid max-w-6xl gap-10 px-[max(16px,env(safe-area-inset-left))] py-24 lg:grid-cols-[1.2fr_1fr] lg:items-end lg:py-32">
                <div>
                    <h2 className="font-display text-[length:clamp(40px,6vw,80px)] font-semibold leading-[0.95] tracking-[-0.045em]">
                        Open a board.
                        <br />
                        <span className="text-muted-foreground">Pick up the pencil.</span>
                    </h2>
                    <div className="mt-8 flex flex-wrap gap-3">
                        <Link to={signedIn ? '/boards' : '/board'} className="group inline-flex h-12 items-center gap-2 rounded-xl bg-primary px-5 text-[15px] font-medium text-primary-foreground transition-transform active:scale-[0.98]">
                            {signedIn ? 'Go to your boards' : 'Open a board'}
                            <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
                        </Link>
                        {!signedIn && (
                            <Link to="/signin" className="inline-flex h-12 items-center rounded-xl border border-border bg-card px-5 text-[15px] font-medium transition-colors hover:bg-secondary">
                                Sign in to keep your boards
                            </Link>
                        )}
                    </div>
                    <p className="mt-4 text-[14px] text-muted-foreground">Free and open source. Drawing needs no account.</p>
                </div>
                <div>
                    <p className="text-[14px] font-medium">Or run your own</p>
                    <p className="mt-1 text-[14px] text-muted-foreground">Node 20+. Add DATABASE_URL for accounts and saved boards.</p>
                    <div className="mt-3 flex items-start gap-2 rounded-xl border border-border bg-card p-3">
                        <pre className="min-w-0 flex-1 overflow-x-auto font-mono text-[12.5px] leading-relaxed text-foreground">{install}</pre>
                        <CopyButton value={install} label="Copy command" dense />
                    </div>
                </div>
            </div>
        </section>
    );
}

export default function Home() {
    const [stop, setStop] = useState(0);
    const [mcpStep, setMcpStep] = useState(0);
    const coarse = useMedia('(pointer: coarse)');
    const signedIn = useAccount((s) => s.status === 'signed-in');
    const heroDone = useRef(false);
    const stopRef = useRef(0);

    useEffect(() => {
        document.title = 'SketchSync · The whiteboard your AI can draw on';
        startDemoBoard();
        goToStop(0, 0);
        const onResize = () => goToStop(stopRef.current, 0);
        window.addEventListener('resize', onResize);
        return () => {
            window.removeEventListener('resize', onResize);
            stopDemoBoard();
        };
    }, []);

    useEffect(() => {
        stopRef.current = stop;
        goToStop(stop);
        // The AI toast belongs to the stop where the AI is working.
        if (stop !== 0 && stop !== 2) useBoard.setState({ aiActivity: null });
    }, [stop]);

    // Hero: Claude adds to the board shortly after you draw, or after a few idle seconds.
    useEffect(() => {
        if (stop !== 0 || heroDone.current) return;
        const startCount = useBoard.getState().shapes.size;
        let cancel = () => {};
        const fire = () => {
            if (heroDone.current) return;
            heroDone.current = true;
            cancel = heroScript();
        };
        const idle = setTimeout(fire, 2600);
        let soon: ReturnType<typeof setTimeout> | undefined;
        const unsub = useBoard.subscribe((s) => {
            if (!soon && s.shapes.size > startCount && !s.aiActivity) soon = setTimeout(fire, 1200);
        });
        return () => {
            clearTimeout(idle);
            if (soon) clearTimeout(soon);
            unsub();
            if (!heroDone.current) cancel();
        };
    }, [stop]);

    // MCP stop: replay the request each time it comes into view.
    useEffect(() => {
        if (stop !== 2) return;
        resetMcpStop();
        setMcpStep(0);
        return mcpScript(setMcpStep);
    }, [stop]);

    useEffect(() => {
        if (stop !== 3) return;
        resetTogetherStop();
        const cancel = togetherScript();
        return () => {
            cancel();
            resetTogetherStop();
        };
    }, [stop]);

    return (
        <TooltipProvider>
            <div className="min-h-screen bg-background text-foreground">
                <Navbar />
                <main className="-mt-[68px]" data-stop={stop}>
                    <section className="relative" aria-label="SketchSync, shown on a live board">
                        <div className={cn('sticky top-0 h-[100svh] overflow-hidden', coarse && 'pointer-events-none')}>
                            <Suspense fallback={<div className="dot-grid absolute inset-0 bg-background" />}>
                                <LiveCanvas />
                            </Suspense>
                            {/* Keeps the text column readable over the canvas on wide screens. */}
                            <div className="pointer-events-none absolute inset-y-0 left-0 z-[7] w-[54%] bg-[linear-gradient(90deg,hsl(var(--background))_0%,hsl(var(--background))_66%,hsl(var(--background)/0)_100%)] max-lg:hidden" />
                            <div className="pointer-events-none absolute inset-x-0 bottom-0 z-[7] h-1/2 bg-gradient-to-t from-background via-background/70 to-transparent lg:hidden" />
                            <DemoDock show={stop === 0 && !coarse} />
                            <div className="max-lg:hidden"><AiActivityToast placement="landing" onJump={(box) => animateViewport(fitRegion({ x: box.x - 60, y: box.y - 60, width: box.width + 120, height: box.height + 120 }))} /></div>
                        </div>

                        <div className="pointer-events-none relative z-10 -mt-[100svh]">
                            <Panel index={0} onActive={setStop}>
                                <h1 className="font-display text-[length:clamp(36px,5.6vw,78px)] font-semibold leading-[0.94] tracking-[-0.045em]" aria-label={HEADLINE}>
                                    {['The whiteboard', 'your AI can', 'draw on.'].map((line, i) => (
                                        <motion.span
                                            key={line}
                                            aria-hidden
                                            className="block"
                                            initial={{ opacity: 0, y: 18 }}
                                            animate={{ opacity: 1, y: 0 }}
                                            transition={{ type: 'spring', visualDuration: 0.7, bounce: 0, delay: 0.05 + i * 0.08 }}
                                        >
                                            {line}
                                        </motion.span>
                                    ))}
                                </h1>
                                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.35, duration: 0.5 }}>
                                    <P>A realtime whiteboard with an MCP server built in. Keep your boards in one place, invite people to each one, and connect Claude once to work on any of them.</P>
                                    <div className="mt-5 flex flex-wrap items-center gap-3 lg:mt-7">
                                        <Link
                                            to={signedIn ? '/boards' : '/board'}
                                            className="group inline-flex h-12 items-center gap-2 rounded-xl bg-primary px-5 text-[15px] font-medium text-primary-foreground transition-transform active:scale-[0.98]"
                                        >
                                            {signedIn ? 'Your boards' : 'Open a board'}
                                            <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
                                        </Link>
                                        <a href="#connect" className="hidden h-12 items-center rounded-xl px-4 sm:inline-flex text-[15px] font-medium text-muted-foreground transition-colors hover:text-foreground">
                                            How the AI connects
                                        </a>
                                    </div>
                                    <p className="mt-4 text-[13.5px] text-muted-foreground lg:mt-6">
                                        <span className="max-lg:hidden">The board on the right is live. The pencil is ready.</span>
                                        <span className="lg:hidden">This board is live. Open one to draw.</span>
                                    </p>
                                </motion.div>
                            </Panel>

                            <Panel index={1} onActive={setStop} id="boards">
                                <H2>Every board, in one place.</H2>
                                <P>Sign in with Google or GitHub and your boards live on the server, not in one browser. Boards you drew before signing in come with you. Search them, rename them, and jump between them without leaving the canvas.</P>
                            </Panel>

                            <Panel index={2} onActive={setStop} id="connect">
                                <H2>One connector. Every board.</H2>
                                <P>Add one MCP URL to Claude, Cursor or VS Code and sign in once. Your AI can then list your boards and change any of them by name, in the same conversation.</P>
                                <Transcript step={mcpStep} />
                            </Panel>

                            <Panel index={3} onActive={setStop} id="together">
                                <H2>Each board has its own people.</H2>
                                <P>Invite people by email as editors or viewers, or share a link that edits, views, or opens nothing. Everyone sees changes as they happen, including the AI's, which carry its name and undo in one step.</P>
                            </Panel>

                            <Panel index={4} onActive={setStop} id="everything">
                                <H2>Everything a whiteboard should do.</H2>
                                <ul className="mt-5 divide-y divide-border/70 border-y border-border/70 text-[15px]">
                                    {[
                                        ['Shapes and arrows', 'that stay attached when you move things'],
                                        ['LaTeX math', 'typeset right on the canvas'],
                                        ['Images and PNG export', 'paste in, download out'],
                                        ['Offline first', 'keeps drawing without a connection, syncs after'],
                                        ['Keyboard first', 'every tool and action from ⌘K'],
                                    ].map(([a, b]) => (
                                        <li key={a} className="flex flex-wrap items-baseline gap-x-2 py-2.5">
                                            <span className="font-medium text-foreground">{a}</span>
                                            <span className="text-muted-foreground">{b}</span>
                                        </li>
                                    ))}
                                </ul>
                            </Panel>
                        </div>
                    </section>
                    <Start />
                </main>
                <Footer />
            </div>
        </TooltipProvider>
    );
}
