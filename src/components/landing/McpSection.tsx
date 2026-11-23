import { Check, RotateCcw } from 'lucide-react';
import { AnimatePresence, motion, useInView, useReducedMotion } from 'motion/react';
import { useEffect, useRef, useState } from 'react';
import { BACKEND_URL } from '@/config';
import { CopyButton } from '@/components/shareDialog';
import { cn } from '@/lib/utils';
import { Reveal } from './Reveal';

const URL = `${BACKEND_URL}/mcp/<board-id>`;

const SETUPS = [
    { id: 'code', name: 'Claude Code', file: 'terminal', code: `claude mcp add --transport http sketchsync \\\n  ${URL}` },
    { id: 'cursor', name: 'Cursor', file: '.cursor/mcp.json', code: JSON.stringify({ mcpServers: { sketchsync: { url: URL } } }, null, 2) },
    { id: 'vscode', name: 'VS Code', file: '.vscode/mcp.json', code: JSON.stringify({ servers: { sketchsync: { type: 'http', url: URL } } }, null, 2) },
    { id: 'claude', name: 'Claude app', file: 'Settings → Connectors', code: `Add custom connector\n  Name   SketchSync\n  URL    ${URL}` },
];

const TOOLS = ['get_board', 'get_board_image', 'add_shapes', 'update_shapes', 'delete_shapes', 'create_flowchart', 'add_math', 'write_solution', 'clear_board'];

const SESSION = [
    { tool: 'get_board', out: 'empty board' },
    { tool: 'create_flowchart', out: '3 nodes, laid out' },
    { tool: 'get_board_image', out: 'looks right' },
];
const DONE = SESSION.length + 1;

/** Drives the replay: one step every 0.8s once the section is on screen. */
function useReplay() {
    const ref = useRef<HTMLDivElement>(null);
    const inView = useInView(ref, { once: true, amount: 0.4 });
    const reduced = useReducedMotion();
    const [n, setN] = useState(reduced ? DONE : 0);
    const [run, setRun] = useState(0);
    useEffect(() => {
        if (reduced) return setN(DONE);
        if (!inView) return;
        setN(0);
        const timers = Array.from({ length: DONE }, (_, i) => setTimeout(() => setN(i + 1), 400 + i * 800));
        return () => timers.forEach(clearTimeout);
    }, [inView, reduced, run]);
    return { ref, n, replay: () => setRun((r) => r + 1) };
}

function Session({ n }: { n: number }) {
    return (
        <div className="space-y-3 px-5 py-5 text-[13px]">
            <div className="flex items-start gap-2.5">
                <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-white/10 text-[10px] font-semibold text-white">Y</span>
                <p className="text-white/90">Draw a flowchart of our signup flow.</p>
            </div>
            <div className="min-h-[76px] space-y-1.5 pl-[30px] font-mono text-[12px]">
                <AnimatePresence initial={false}>
                    {SESSION.slice(0, Math.max(0, n)).map((step, i) => (
                        <motion.div key={step.tool} initial={{ opacity: 0, x: -6 }} animate={{ opacity: 1, x: 0 }} className="flex items-center gap-2 whitespace-nowrap">
                            <span className="flex h-4 w-4 shrink-0 items-center justify-center">
                                {i === n - 1 && n < DONE ? (
                                    <span className="h-3 w-3 animate-spin rounded-full border-[1.5px] border-[#f0b49a] border-t-transparent" />
                                ) : (
                                    <Check className="h-3.5 w-3.5 text-[#8ce99a]" strokeWidth={2.5} />
                                )}
                            </span>
                            <span className="text-[#f0b49a]">sketchsync</span>
                            <span className="text-white/85">{step.tool}</span>
                            <span className="hidden text-white/45 sm:inline">{step.out}</span>
                        </motion.div>
                    ))}
                </AnimatePresence>
            </div>
            <motion.div animate={{ opacity: n >= DONE ? 1 : 0, y: n >= DONE ? 0 : 4 }} className="flex items-start gap-2.5">
                <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-[#d97757] text-white">
                    <svg viewBox="0 0 16 16" className="h-2.5 w-2.5" fill="currentColor"><path d="M8 0l1.8 6.2L16 8l-6.2 1.8L8 16l-1.8-6.2L0 8l6.2-1.8z" /></svg>
                </span>
                <p className="text-white/90">Done. The flow is on your board.</p>
            </motion.div>
        </div>
    );
}

/** The board the session above is drawing on. */
function MiniBoard({ n }: { n: number }) {
    const nodes = [
        { x: 40, y: 52, w: 130, label: 'Sign-up form', fill: '#ffffff' },
        { x: 210, y: 52, w: 120, label: 'Email valid?', fill: '#a5d8ff' },
        { x: 210, y: 150, w: 150, label: 'Create account', fill: '#b2f2bb' },
    ];
    const drawing = n >= 2;
    const ai = n >= 1 && n < DONE;
    const cursor: [number, number][] = [[330, 230], [330, 230], [160, 100], [300, 120], [330, 200], [360, 236]];
    const [cx, cy] = cursor[Math.min(n, cursor.length - 1)];
    return (
        <div className="dot-grid relative h-full min-h-[300px] overflow-hidden rounded-xl border border-white/10 bg-[hsl(228_10%_11%)] [--dot:0_0%_100%]">
            <svg viewBox="0 0 400 280" className="absolute inset-0 h-full w-full" role="img" aria-label="The board filling in as the assistant draws">
                <motion.rect x="26" y="36" width="350" height="190" rx="12" fill="none" stroke="#e58a6b" strokeWidth="1.5" strokeDasharray="5 5" animate={{ opacity: ai && drawing ? 0.9 : 0 }} />
                {nodes.map((nd, i) => (
                    <motion.g key={nd.label} initial={false} animate={{ opacity: drawing ? 1 : 0, scale: drawing ? 1 : 0.9 }} transition={{ delay: drawing ? 0.15 + i * 0.22 : 0, type: 'spring', visualDuration: 0.4, bounce: 0.2 }} style={{ transformOrigin: `${nd.x + nd.w / 2}px ${nd.y + 22}px` }}>
                        <rect x={nd.x} y={nd.y} width={nd.w} height={44} rx={9} fill={nd.fill} stroke="#1e1e1e" strokeWidth="2" />
                        <text x={nd.x + nd.w / 2} y={nd.y + 27} textAnchor="middle" fontSize="13" fill="#1e1e1e" fontFamily="Inter, sans-serif">
                            {nd.label}
                        </text>
                    </motion.g>
                ))}
                {[
                    ['M170 74 H 206', 'M199 68 L207 74 L199 80'],
                    ['M270 96 V 146', 'M264 139 L270 147 L276 139'],
                ].map(([d, head], i) => (
                    <g key={d}>
                        <motion.path d={d} fill="none" stroke="#e6e6e9" strokeWidth="2" strokeLinecap="round" initial={false} animate={{ pathLength: drawing ? 1 : 0, opacity: drawing ? 1 : 0 }} transition={{ delay: drawing ? 0.6 + i * 0.2 : 0, duration: 0.4 }} />
                        <motion.path d={head} fill="none" stroke="#e6e6e9" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" initial={false} animate={{ opacity: drawing ? 1 : 0 }} transition={{ delay: drawing ? 0.9 + i * 0.2 : 0 }} />
                    </g>
                ))}
                <motion.g initial={false} animate={{ x: cx, y: cy, opacity: ai ? 1 : 0 }} transition={{ type: 'spring', visualDuration: 0.6, bounce: 0.1 }}>
                    <path d="M0 0 L0 17 L4.6 12.8 L7.6 19.5 L10.4 18.3 L7.5 11.8 L13.6 11.6 Z" fill="#e58a6b" stroke="white" strokeWidth="1.3" />
                    <rect x="13" y="20" width="56" height="20" rx="6" fill="#e58a6b" />
                    <text x="21" y="34" fontSize="11.5" fontWeight="600" fill="white" fontFamily="Geist Variable, sans-serif">
                        Claude
                    </text>
                </motion.g>
            </svg>
            <span className="absolute left-3 top-3 font-mono text-[10.5px] uppercase tracking-[0.06em] text-white/40">your board</span>
        </div>
    );
}

export function McpSection() {
    const [tab, setTab] = useState(SETUPS[0].id);
    const setup = SETUPS.find((s) => s.id === tab)!;
    const { ref, n, replay } = useReplay();
    return (
        <section id="mcp" className="scroll-mt-16 bg-[hsl(228_12%_7%)] text-white dark:bg-[hsl(228_10%_9%)] dark:[border-block:1px_solid_hsl(0_0%_100%/0.08)]">
            <div className="mx-auto max-w-6xl px-[max(16px,env(safe-area-inset-left))] py-24 sm:py-32">
                <Reveal className="grid gap-8 lg:grid-cols-[1.1fr_1fr] lg:items-end">
                    <div className="max-w-2xl space-y-4">
                        <p className="font-mono text-[12px] uppercase tracking-[0.08em] text-white/50">Model Context Protocol</p>
                        <h2 className="text-balance text-[clamp(32px,5vw,56px)] font-semibold leading-[1.02] tracking-[-0.04em]">One URL, and your AI can draw.</h2>
                        <p className="text-pretty text-[17px] leading-relaxed text-white/65">
                            Every board has its own MCP endpoint. Paste it into Claude, Cursor or VS Code and the assistant can read the board, see your sketches, and draw shapes, flowcharts and LaTeX while you watch.
                        </p>
                    </div>
                    <div className="flex flex-wrap gap-1.5 lg:justify-end">
                        {TOOLS.map((t) => (
                            <code key={t} className="rounded-md border border-white/10 bg-white/[0.04] px-2 py-0.5 font-mono text-[12px] text-white/75">
                                {t}
                            </code>
                        ))}
                    </div>
                </Reveal>

                <Reveal delay={0.05} className="mt-12 grid gap-3 rounded-2xl border border-white/10 bg-white/[0.03] p-3 md:grid-cols-[1.1fr_1fr]">
                    <div ref={ref} className="flex min-w-0 flex-col overflow-hidden rounded-xl border border-white/10 bg-[hsl(228_10%_5%)]">
                        <div
                            className="flex items-center gap-1 overflow-x-auto border-b border-white/10 p-2 [scrollbar-width:none]"
                            role="tablist"
                            aria-label="Setup instructions"
                            onKeyDown={(e) => {
                                if (e.key !== 'ArrowLeft' && e.key !== 'ArrowRight') return;
                                e.preventDefault();
                                const i = SETUPS.findIndex((x) => x.id === tab);
                                const next = SETUPS[(i + (e.key === 'ArrowRight' ? 1 : SETUPS.length - 1)) % SETUPS.length];
                                setTab(next.id);
                                requestAnimationFrame(() => document.getElementById(`mcp-tab-${next.id}`)?.focus());
                            }}
                        >
                            {SETUPS.map((s) => (
                                <button
                                    key={s.id}
                                    id={`mcp-tab-${s.id}`}
                                    role="tab"
                                    aria-selected={tab === s.id}
                                    aria-controls="mcp-panel"
                                    tabIndex={tab === s.id ? 0 : -1}
                                    onClick={() => setTab(s.id)}
                                    className={cn('relative whitespace-nowrap rounded-lg px-3 py-1.5 text-[13px] font-medium transition-colors', tab === s.id ? 'text-white' : 'text-white/50 hover:text-white/80')}
                                >
                                    {tab === s.id && <motion.span layoutId="mcp-tab" className="absolute inset-0 rounded-lg bg-white/10" transition={{ type: 'spring', visualDuration: 0.25, bounce: 0.15 }} />}
                                    <span className="relative z-10">{s.name}</span>
                                </button>
                            ))}
                        </div>
                        <div id="mcp-panel" role="tabpanel" aria-labelledby={`mcp-tab-${tab}`}>
                            <div className="flex items-center justify-between px-5 pt-4 font-mono text-[11px] text-white/45">
                                <span>{setup.file}</span>
                                <CopyButton value={setup.code.replace(/\\\n\s+/g, '')} label="Copy snippet" dense className="text-white/60 hover:bg-white/10 hover:text-white" />
                            </div>
                            <div className="relative">
                                <motion.pre key={setup.id} initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} className="min-h-[150px] overflow-x-auto px-5 pb-4 pt-2 font-mono text-[12.5px] leading-[1.75] [scrollbar-width:thin]">
                                    <code>
                                        {setup.code.split('\n').map((line, i) => (
                                            <div key={i} className="flex">
                                                <span className="mr-4 inline-block w-4 shrink-0 select-none text-right text-white/25">{i + 1}</span>
                                                <span className="whitespace-pre pr-6">{colorize(line)}</span>
                                            </div>
                                        ))}
                                    </code>
                                </motion.pre>
                                <div className="pointer-events-none absolute inset-y-0 right-0 w-8 bg-gradient-to-l from-[hsl(228_10%_5%)] md:hidden" />
                            </div>
                        </div>
                        <div className="mt-auto border-t border-white/10">
                            <div className="flex items-center justify-between px-5 pt-4">
                                <p className="font-mono text-[11px] uppercase tracking-[0.06em] text-white/40">Then ask</p>
                                <button type="button" onClick={replay} className="flex items-center gap-1 rounded-md px-1.5 py-0.5 text-[11.5px] text-white/50 transition-colors hover:bg-white/10 hover:text-white">
                                    <RotateCcw className="h-3 w-3" /> Replay
                                </button>
                            </div>
                            <Session n={n} />
                        </div>
                    </div>
                    <MiniBoard n={n} />
                </Reveal>
            </div>
        </section>
    );
}

/** Tiny highlighter: strings, keys and the command name. */
function colorize(line: string) {
    const parts = line.split(/("[^"]*")/g);
    return parts.map((p, i) => {
        if (/^"[^"]*"$/.test(p)) {
            const isKey = parts[i + 1]?.trimStart().startsWith(':');
            return (
                <span key={i} className={isKey ? 'text-[#9cc8f0]' : 'text-[#f0b49a]'}>
                    {p}
                </span>
            );
        }
        if (p.startsWith('claude ')) return <span key={i}><span className="text-[#f0b49a]">claude</span>{p.slice(6)}</span>;
        return <span key={i}>{p}</span>;
    });
}

