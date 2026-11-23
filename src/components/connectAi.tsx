import { ShieldAlert, Sparkles } from 'lucide-react';
import { AnimatePresence, motion } from 'motion/react';
import { useState } from 'react';
import { mcpUrl } from '@/config';
import { cn } from '@/lib/utils';
import { CopyField } from './shareDialog';

const Code = ({ children }: { children: React.ReactNode }) => <code className="rounded bg-secondary px-1 py-px font-mono text-[11px] text-foreground">{children}</code>;

const CLIENTS = [
    {
        id: 'claude',
        name: 'Claude',
        steps: () => (
            <ol className="space-y-1.5">
                {[
                    <>Open <b className="font-medium text-foreground">Settings → Connectors</b> (web or desktop).</>,
                    <><b className="font-medium text-foreground">Add custom connector</b>, name it “SketchSync”, paste the URL above.</>,
                    <>Enable it in a chat and ask Claude to draw.</>,
                ].map((step, i) => (
                    <li key={i} className="flex gap-2.5">
                        <span className="mt-px flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-secondary font-mono text-[10px] text-muted-foreground">{i + 1}</span>
                        <span>{step}</span>
                    </li>
                ))}
            </ol>
        ),
    },
    {
        id: 'claude-code',
        name: 'Claude Code',
        steps: (url: string) => <CopyField value={`claude mcp add --transport http sketchsync ${url}`} label="Claude Code command" copyLabel="Copy command" dense />,
    },
    {
        id: 'cursor',
        name: 'Cursor / VS Code',
        steps: (url: string) => (
            <div className="space-y-2">
                <p>
                    Add to <Code>.cursor/mcp.json</Code>, or <Code>.vscode/mcp.json</Code> under a <Code>servers</Code> key:
                </p>
                <CopyField value={JSON.stringify({ mcpServers: { sketchsync: { url } } })} label="MCP JSON config" copyLabel="Copy config" dense />
            </div>
        ),
    },
    {
        id: 'other',
        name: 'Other',
        steps: () => (
            <p>
                Any client that supports remote <b className="font-medium text-foreground">Streamable HTTP</b> MCP servers works. Add the URL above as a remote server.
            </p>
        ),
    },
] as const;

export function ConnectAiPanel({ roomId }: { roomId: string }) {
    const url = mcpUrl(roomId);
    const [client, setClient] = useState<(typeof CLIENTS)[number]['id']>('claude');
    const selected = CLIENTS.find((c) => c.id === client)!;

    return (
        <div className="space-y-4" data-testid="connect-ai">
            <div className="space-y-1">
                <h2 className="flex items-center gap-2 text-[15px] font-semibold tracking-tightish">Let an AI draw on this board</h2>
                <p className="text-[13px] leading-relaxed text-muted-foreground">Claude, Cursor or any MCP client can read and edit this board live, next to you.</p>
            </div>

            <CopyField value={url} label="MCP server URL" testId="mcp-url" icon={<Sparkles className="h-3.5 w-3.5 text-claude" />} />

            <div className="space-y-3">
                <div className="flex flex-wrap gap-1">
                    {CLIENTS.map((c) => (
                        <button
                            key={c.id}
                            type="button"
                            aria-pressed={client === c.id}
                            className={cn('relative rounded-full px-3 py-1 text-xs font-medium transition-colors', client === c.id ? 'text-primary-foreground' : 'text-muted-foreground hover:bg-secondary hover:text-foreground')}
                            onClick={() => setClient(c.id)}
                        >
                            {client === c.id && <motion.span layoutId="client-pill" className="absolute inset-0 rounded-full bg-primary" transition={{ type: 'spring', visualDuration: 0.25, bounce: 0.15 }} />}
                            <span className="relative z-10">{c.name}</span>
                        </button>
                    ))}
                </div>
                <AnimatePresence mode="wait" initial={false}>
                    <motion.div
                        key={client}
                        initial={{ opacity: 0, y: 4 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -4, transition: { duration: 0.08 } }}
                        className="min-h-[72px] text-[12.5px] leading-relaxed text-muted-foreground"
                    >
                        {selected.steps(url)}
                    </motion.div>
                </AnimatePresence>
            </div>

            <div className="space-y-2 rounded-xl bg-secondary/60 p-3 text-xs text-muted-foreground">
                <p>
                    Then try: <span className="text-foreground">“Draw a flowchart of our signup flow.”</span>
                </p>
                <p className="flex items-start gap-1.5">
                    <ShieldAlert className="mt-px h-3.5 w-3.5 shrink-0 text-warning" />
                    Anyone with this URL can edit the board. Keep this tab open so the AI can reach it.
                </p>
            </div>
        </div>
    );
}
