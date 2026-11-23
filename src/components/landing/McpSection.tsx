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
            <path d={d} fill="none" className="stroke-border" strokeWidth="1.5" />
            {!reduced && (
                <motion.path
                    d={d}
                    fill="none"
                    stroke="url(#beam)"
                    strokeWidth="2"
                    strokeLinecap="round"
                    initial={{ pathLength: 0.18, pathOffset: -0.2 }}
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
            <Beam d="M370 150 H 420" delay={1.2} reduced={reduced} />
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
            <g transform="translate(420 92)">
                <rect width="124" height="116" rx="14" className="fill-card stroke-border" strokeWidth="1" />
                <rect x="18" y="26" width="46" height="26" rx="6" fill="none" stroke="currentColor" strokeWidth="1.6" />
                <path d="M64 39 H 82" stroke="currentColor" strokeWidth="1.6" />
                <path d="M93 28 L106 39 L93 50 L80 39 Z" fill="#a5d8ff" stroke="currentColor" strokeWidth="1.6" />
                <rect x="18" y="68" width="88" height="26" rx="6" fill="#b2f2bb" stroke="currentColor" strokeWidth="1.6" />
            </g>
            <text x="482" y="232" textAnchor="middle" fontSize="12" className="fill-muted-foreground" fontFamily="Geist Mono Variable, monospace">
                your board
            </text>
        </svg>
    );
}

export function McpSection() {
    const [tab, setTab] = useState(SETUPS[0].id);
    const setup = SETUPS.find((s) => s.id === tab)!;
    return (
        <section id="mcp" className="scroll-mt-24">
            <SectionHeading eyebrow="Model Context Protocol" title={<>One URL, and your AI can draw.</>}>
                Every board has its own MCP endpoint. Paste it into Claude, Cursor or VS Code and the assistant can read the board, see your sketches as an image, and add shapes, flowcharts and LaTeX while you watch.
            </SectionHeading>

            <div className="mt-12 grid gap-4 lg:grid-cols-[1.05fr_1fr]">
                <Reveal className="flex flex-col justify-between gap-6 rounded-2xl border border-border bg-card p-6">
                    <Diagram />
                    <div className="space-y-2.5">
                        <p className="font-mono text-[11px] uppercase tracking-[0.06em] text-muted-foreground">Tools the AI gets</p>
                        <div className="flex flex-wrap gap-1.5">
                            {TOOLS.map((t) => (
                                <code key={t} className="rounded-md border border-border bg-secondary/60 px-2 py-0.5 font-mono text-[11.5px] text-foreground">
                                    {t}
                                </code>
                            ))}
                        </div>
                    </div>
                </Reveal>

                <Reveal delay={0.08} className="flex min-w-0 flex-col overflow-hidden rounded-2xl border border-border bg-[hsl(228_10%_8%)] text-[hsl(240_6%_88%)] dark:bg-card">
                    <div className="flex items-center gap-1 overflow-x-auto border-b border-white/10 p-2 [scrollbar-width:none]" role="tablist" aria-label="Setup instructions">
                        {SETUPS.map((s) => (
                            <button
                                key={s.id}
                                role="tab"
                                aria-selected={tab === s.id}
                                onClick={() => setTab(s.id)}
                                className={cn('relative whitespace-nowrap rounded-lg px-3 py-1.5 text-[13px] font-medium transition-colors', tab === s.id ? 'text-white' : 'text-white/50 hover:text-white/80')}
                            >
                                {tab === s.id && <motion.span layoutId="mcp-tab" className="absolute inset-0 rounded-lg bg-white/10" transition={{ type: 'spring', visualDuration: 0.25, bounce: 0.15 }} />}
                                <span className="relative">{s.name}</span>
                            </button>
                        ))}
                    </div>
                    <div className="flex items-center justify-between px-5 pt-4 font-mono text-[11px] text-white/40">
                        <span>{setup.file}</span>
                        <CopyButton value={setup.code.replace(/\\\n\s+/g, '')} label="Copy snippet" dense className="text-white/60 hover:bg-white/10 hover:text-white" />
                    </div>
                    <motion.pre key={setup.id} initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} className="overflow-x-auto px-5 pb-5 pt-2 font-mono text-[12.5px] leading-[1.75]">
                        <code>
                            {setup.code.split('\n').map((line, i) => (
                                <div key={i}>
                                    <span className="mr-4 inline-block w-4 select-none text-right text-white/25">{i + 1}</span>
                                    {colorize(line)}
                                </div>
                            ))}
                        </code>
                    </motion.pre>
                    <Session />
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
    const [n, setN] = useState(reduced ? SESSION.length + 1 : 0);
    useEffect(() => {
        if (!inView || reduced) return;
        const timers = Array.from({ length: SESSION.length + 1 }, (_, i) => setTimeout(() => setN(i + 1), 500 + i * 650));
        return () => timers.forEach(clearTimeout);
    }, [inView, reduced]);
    return (
        <div ref={ref} className="flex-1 space-y-3 border-t border-white/10 px-5 py-5 text-[13px]">
            <div className="flex items-start gap-2.5">
                <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-white/10 text-[10px] font-semibold text-white">Y</span>
                <p className="text-white/90">Draw a flowchart of our signup flow.</p>
            </div>
            <div className="space-y-1.5 pl-[30px] font-mono text-[12px]">
                <AnimatePresence initial={false}>
                    {SESSION.slice(0, n).map((step, i) => (
                        <motion.div key={step.tool} initial={{ opacity: 0, x: -6 }} animate={{ opacity: 1, x: 0 }} className="flex items-center gap-2">
                            {i === n - 1 && n <= SESSION.length ? (
                                <span className="h-3.5 w-3.5 animate-spin rounded-full border-[1.5px] border-[#f0b49a] border-t-transparent" />
                            ) : (
                                <Check className="h-3.5 w-3.5 text-[#8ce99a]" strokeWidth={2.5} />
                            )}
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
