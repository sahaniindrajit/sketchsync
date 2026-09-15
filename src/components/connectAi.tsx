import { ShieldAlert } from 'lucide-react';
import { useState } from 'react';
import { mcpUrl } from '@/config';
import { CopyField } from './shareDialog';

const CLIENTS = [
    {
        id: 'claude',
        name: 'Claude',
        steps: () => (
            <ol className="list-decimal space-y-0.5 pl-4">
                <li>
                    Open <b>Settings → Connectors</b> (web or desktop).
                </li>
                <li>
                    <b>Add custom connector</b>, name it “SketchSync”, paste the URL above.
                </li>
                <li>Enable it in a chat and ask Claude to draw.</li>
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
            <div className="space-y-1.5">
                <p>
                    Add to <code className="rounded bg-gray-100 px-1">.cursor/mcp.json</code>, or <code className="rounded bg-gray-100 px-1">.vscode/mcp.json</code> under a{' '}
                    <code className="rounded bg-gray-100 px-1">servers</code> key:
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
                Any client that supports remote <b>Streamable HTTP</b> MCP servers works — add the URL above as a remote server.
            </p>
        ),
    },
] as const;

export function ConnectAiPanel({ roomId }: { roomId: string }) {
    const url = mcpUrl(roomId);
    const [client, setClient] = useState<(typeof CLIENTS)[number]['id']>('claude');
    const selected = CLIENTS.find((c) => c.id === client)!;

    return (
        <div className="space-y-3" data-testid="connect-ai">
            <p className="text-sm text-gray-500">Let Claude or any MCP client read and draw on this board, live.</p>

            <CopyField value={url} label="MCP server URL" testId="mcp-url" />

            <div className="space-y-2">
                <div className="flex flex-wrap gap-1.5">
                    {CLIENTS.map((c) => (
                        <button
                            key={c.id}
                            className={`rounded-full px-2.5 py-1 text-xs transition-colors ${
                                client === c.id ? 'bg-indigo-50 text-indigo-700' : 'text-gray-500 hover:bg-gray-100'
                            }`}
                            onClick={() => setClient(c.id)}
                        >
                            {c.name}
                        </button>
                    ))}
                </div>
                <div className="text-xs leading-relaxed text-gray-600">{selected.steps(url)}</div>
            </div>

            <div className="space-y-1 border-t pt-3 text-xs text-gray-400">
                <p>Then ask: “Draw a flowchart of our signup flow.”</p>
                <p className="flex items-start gap-1.5">
                    <ShieldAlert className="mt-px h-3.5 w-3.5 shrink-0" />
                    Anyone with this URL can edit the board. Keep this tab open so the AI can reach it.
                </p>
            </div>
        </div>
    );
}
