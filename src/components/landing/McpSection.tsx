import { Check } from 'lucide-react';
import { AnimatePresence, motion, useInView, useReducedMotion } from 'motion/react';
import { useEffect, useRef, useState } from 'react';
import { BACKEND_URL } from '@/config';
import { CopyButton } from '@/components/shareDialog';
import { cn } from '@/lib/utils';
import { Reveal, SectionHeading } from './Reveal';

const URL = `${BACKEND_URL}/mcp/<board-id>`;

const SETUPS = [
    { id: 'code', name: 'Claude Code', file: 'terminal', code: `claude mcp add --transport http sketchsync \\\n  ${URL}` },
    { id: 'cursor', name: 'Cursor', file: '.cursor/mcp.json', code: JSON.stringify({ mcpServers: { sketchsync: { url: URL } } }, null, 2) },
    { id: 'vscode', name: 'VS Code', file: '.vscode/mcp.json', code: JSON.stringify({ servers: { sketchsync: { type: 'http', url: URL } } }, null, 2) },
    { id: 'claude', name: 'Claude app', file: 'Settings → Connectors', code: `Add custom connector\n  Name   SketchSync\n  URL    ${URL}` },
];

const TOOLS = ['get_board', 'get_board_image', 'add_shapes', 'update_shapes', 'delete_shapes', 'create_flowchart', 'add_math', 'write_solution', 'clear_board'];

function Beam({ d, delay, reduced }: { d: string; delay: number; reduced: boolean }) {
    return (
        <g>
            <path d={d} fill="none" className="stroke-foreground/15" strokeWidth="1.5" strokeDasharray="3 4" />
            {!reduced && (
                <motion.path
                    d={d}
                    fill="none"
                    stroke="url(#beam)"
                    strokeWidth="3"
                    strokeLinecap="round"
                    initial={{ pathLength: 0.22, pathOffset: -0.25 }}
                    animate={{ pathOffset: 1.05 }}
                    transition={{ duration: 2.4, repeat: Infinity, ease: 'easeInOut', delay, repeatDelay: 0.6 }}
                />
            )}
        </g>
    );
}

function Diagram() {
    const ref = useRef<SVGSVGElement>(null);
    const inView = useInView(ref, { amount: 0.2 });
    const reduced = !!useReducedMotion() || !inView;
    const clients = ['Claude', 'Cursor', 'VS Code'];
    return (
        <svg ref={ref} viewBox="0 0 560 300" className="h-auto w-full text-foreground" role="img" aria-label="Claude, Cursor and VS Code connect to the board's MCP endpoint, which edits the live board">
            <defs>
                <linearGradient id="beam" x1="0" x2="1">
                    <stop offset="0" stopColor="hsl(var(--claude))" stopOpacity="0" />
                    <stop offset="0.5" stopColor="hsl(var(--claude))" />
                    <stop offset="1" stopColor="hsl(var(--accent))" />
                </linearGradient>
            </defs>
            {clients.map((_, i) => (
                <Beam key={i} d={`M150 ${60 + i * 90} C 210 ${60 + i * 90}, 200 150, 250 150`} delay={i * 0.5} reduced={reduced} />
            ))}
            <Beam d="M370 150 H 410" delay={1.2} reduced={reduced} />
            {clients.map((c, i) => (
                <g key={c} transform={`translate(20 ${38 + i * 90})`}>
                    <rect width="130" height="44" rx="12" className="fill-card stroke-border" strokeWidth="1" />
                    <circle cx="22" cy="22" r="5" style={{ fill: i === 0 ? 'hsl(var(--claude))' : 'hsl(var(--muted-foreground))' }} />
                    <text x="36" y="27" fontSize="14" fontWeight="500" fill="currentColor" fontFamily="Geist Variable, sans-serif">
                        {c}
                    </text>
                </g>
            ))}
            <g transform="translate(250 112)">
                <rect width="120" height="76" rx="14" className="fill-primary" />
                <text x="60" y="34" textAnchor="middle" fontSize="13" fontWeight="600" className="fill-primary-foreground" fontFamily="Geist Variable, sans-serif">
                    MCP server
                </text>
                <text x="60" y="54" textAnchor="middle" fontSize="11" className="fill-primary-foreground" opacity="0.6" fontFamily="Geist Mono Variable, monospace">
                    /mcp/&lt;board&gt;
                </text>
            </g>
            <g transform="translate(410 70)">
                <rect width="140" height="160" rx="16" className="fill-background stroke-border" strokeWidth="1" />
                <text x="12" y="22" fontSize="10.5" className="fill-muted-foreground" fontFamily="Geist Mono Variable, monospace">
                    your board
                </text>
                {[
                    <rect key="a" x="18" y="40" width="50" height="28" rx="7" className="fill-card" stroke="currentColor" strokeWidth="1.6" />,
                    <path key="b" d="M68 54 H 84" stroke="currentColor" strokeWidth="1.6" />,
                    <path key="c" d="M100 40 L116 54 L100 68 L84 54 Z" fill="#a5d8ff" stroke="currentColor" strokeWidth="1.6" />,
                    <path key="d" d="M100 68 V 92" stroke="currentColor" strokeWidth="1.6" />,
                    <rect key="e" x="56" y="94" width="66" height="28" rx="7" fill="#b2f2bb" stroke="currentColor" strokeWidth="1.6" />,
                    <rect key="f" x="18" y="134" width="60" height="6" rx="3" style={{ fill: 'hsl(var(--claude))' }} opacity="0.5" />,
                ].map((el, i) =>
                    reduced ? (
                        el
                    ) : (
                        <motion.g key={i} animate={{ opacity: [0, 0, 1, 1, 0] }} transition={{ duration: 6, times: [0, 0.18 + i * 0.07, 0.24 + i * 0.07, 0.92, 1], repeat: Infinity, ease: 'easeOut' }}>
                            {el}
                        </motion.g>
                    ),
                )}
            </g>
        </svg>
    );
}

export function McpSection() {
    const [tab, setTab] = useState(SETUPS[0].id);
    const setup = SETUPS.find((s) => s.id === tab)!;
    return (
        <section id="mcp" className="scroll-mt-24 space-y-5">
            <div className="grid items-center gap-10 lg:grid-cols-[1fr_1.05fr]">
                <div className="space-y-8">
                    <SectionHeading eyebrow="Model Context Protocol" title={<>One URL, and your AI can draw.</>}>
                        Every board has its own MCP endpoint. Paste it into Claude, Cursor or VS Code and the assistant can read the board, see your sketches as an image, and add shapes, flowcharts and LaTeX while you watch.
                    </SectionHeading>
                    <Reveal className="space-y-2.5">
                        <p className="font-mono text-[11.5px] uppercase tracking-[0.06em] text-muted-foreground">Tools the AI gets</p>
                        <div className="flex flex-wrap gap-1.5">
                            {TOOLS.map((t) => (
                                <code key={t} className="rounded-md border border-border bg-card px-2 py-0.5 font-mono text-[12px] text-foreground">
                                    {t}
                                </code>
                            ))}
                        </div>
                    </Reveal>
                </div>
                <Reveal delay={0.05} className="rounded-2xl border border-border bg-card p-6 sm:p-8">
                    <Diagram />
                </Reveal>
            </div>

            <Reveal delay={0.05} className="grid overflow-hidden rounded-2xl border border-border bg-[hsl(228_10%_8%)] text-[hsl(240_6%_88%)] dark:border-white/[0.12] dark:bg-[hsl(228_10%_10%)] md:grid-cols-[1.1fr_1fr]">
                <div className="flex min-w-0 flex-col">
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
                    <div id="mcp-panel" role="tabpanel" aria-labelledby={`mcp-tab-${tab}`} className="flex-1">
                        <div className="flex items-center justify-between px-5 pt-4 font-mono text-[11px] text-white/45">
                            <span>{setup.file}</span>
                            <CopyButton value={setup.code.replace(/\\\n\s+/g, '')} label="Copy snippet" dense className="text-white/60 hover:bg-white/10 hover:text-white" />
                        </div>
                        <motion.pre key={setup.id} initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} className="overflow-x-auto px-5 pb-6 pt-2 font-mono text-[12.5px] leading-[1.75] [scrollbar-width:thin]">
                            <code>
                                {setup.code.split('\n').map((line, i) => (
                                    <div key={i} className="flex">
                                        <span className="mr-4 inline-block w-4 shrink-0 select-none text-right text-white/25">{i + 1}</span>
                                        <span className="whitespace-pre">{colorize(line)}</span>
                                    </div>
                                ))}
                            </code>
                        </motion.pre>
                    </div>
                </div>
                <Session />
            </Reveal>
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

const SESSION = [
    { tool: 'get_board', out: 'empty board' },
    { tool: 'create_flowchart', out: '5 nodes · 5 edges, auto-laid out' },
    { tool: 'get_board_image', out: 'looks right' },
];

/** A short replay of the assistant using the board, played once when scrolled into view. */
function Session() {
    const ref = useRef<HTMLDivElement>(null);
    const inView = useInView(ref, { once: true, amount: 0.5 });
    const reduced = useReducedMotion();
    const [n, setN] = useState(reduced ? SESSION.length + 1 : 1);
    useEffect(() => {
        if (!inView || reduced) return;
        const timers = Array.from({ length: SESSION.length }, (_, i) => setTimeout(() => setN(i + 2), 600 + i * 700));
        return () => timers.forEach(clearTimeout);
    }, [inView, reduced]);
    return (
        <div ref={ref} className="min-w-0 space-y-3 border-t border-white/10 px-5 py-5 text-[13px] md:border-l md:border-t-0">
            <p className="font-mono text-[11px] uppercase tracking-[0.06em] text-white/40">Then ask</p>
            <div className="flex items-start gap-2.5">
                <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-white/10 text-[10px] font-semibold text-white">Y</span>
                <p className="text-white/90">Draw a flowchart of our signup flow.</p>
            </div>
            <div className="space-y-1.5 pl-[30px] font-mono text-[12px]">
                <AnimatePresence initial={false}>
                    {SESSION.slice(0, n).map((step, i) => (
                        <motion.div key={step.tool} initial={{ opacity: 0, x: -6 }} animate={{ opacity: 1, x: 0 }} className="flex items-center gap-2">
                            <span className="flex h-4 w-4 shrink-0 items-center justify-center">
                                {i === n - 1 && n <= SESSION.length ? (
                                    <span className="h-3 w-3 animate-spin rounded-full border-[1.5px] border-[#f0b49a] border-t-transparent" />
                                ) : (
                                    <Check className="h-3.5 w-3.5 text-[#8ce99a]" strokeWidth={2.5} />
                                )}
                            </span>
                            <span className="text-[#f0b49a]">sketchsync</span>
                            <span className="text-white/80">{step.tool}</span>
                            <span className="truncate text-white/40">{step.out}</span>
                        </motion.div>
                    ))}
                </AnimatePresence>
            </div>
            <AnimatePresence>
                {n > SESSION.length && (
                    <motion.div initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} className="flex items-start gap-2.5">
                        <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-[#d97757] text-white">
                            <svg viewBox="0 0 16 16" className="h-2.5 w-2.5" fill="currentColor"><path d="M8 0l1.8 6.2L16 8l-6.2 1.8L8 16l-1.8-6.2L0 8l6.2-1.8z" /></svg>
                        </span>
                        <p className="text-white/90">Done. The flow is on your board, with the error branch on the left.</p>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}
