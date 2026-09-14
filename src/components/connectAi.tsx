import { Bot, ShieldAlert } from 'lucide-react';
import { useState } from 'react';
import { mcpUrl } from '@/config';
import { CopyField } from './shareDialog';

const CLIENTS = [
    {
        id: 'claude',
        name: 'Claude',
        steps: (url: string) => (
            <ol className="list-decimal space-y-1 pl-5">
                <li>
                    Open <b>Settings → Connectors</b> in Claude (web or desktop).
                </li>
                <li>
                    Choose <b>Add custom connector</b>, name it “SketchSync” and paste the URL above.
                </li>
                <li>Enable it in a chat and ask Claude to draw on your board.</li>
                <li className="list-none pt-1 text-xs text-gray-400">URL: {url}</li>
            </ol>
        ),
    },
    {
        id: 'claude-code',
        name: 'Claude Code',
        steps: (url: string) => (
            <div className="space-y-2">
                <p>Run this in your terminal:</p>
                <CopyField value={`claude mcp add --transport http sketchsync ${url}`} label="Claude Code command" />
            </div>
        ),
    },
    {
        id: 'cursor',
        name: 'Cursor / VS Code',
        steps: (url: string) => (
            <div className="space-y-2">
                <p>
                    Add this to <code className="rounded bg-gray-100 px-1">.cursor/mcp.json</code> (Cursor) or <code className="rounded bg-gray-100 px-1">.vscode/mcp.json</code> (VS Code, use
                    the <code className="rounded bg-gray-100 px-1">servers</code> key):
                </p>
                <CopyField value={JSON.stringify({ mcpServers: { sketchsync: { url } } })} label="MCP JSON config" />
            </div>
        ),
    },
    {
        id: 'other',
        name: 'Other',
        steps: () => (
            <p>
                Any MCP client that supports <b>Streamable HTTP</b> servers works: add a remote server with the URL above. ChatGPT supports it via developer-mode connectors.
            </p>
        ),
    },
] as const;

const EXAMPLES = [
    'Draw a flowchart of our user signup process',
    'Solve 2x² − 8x + 6 = 0 step by step on the board',
    'Look at my sketch and label each part',
    'Turn these sticky notes into a mind map',
];

export function ConnectAiPanel({ roomId }: { roomId: string }) {
    const url = mcpUrl(roomId);
    const [client, setClient] = useState<(typeof CLIENTS)[number]['id']>('claude');
    const selected = CLIENTS.find((c) => c.id === client)!;

    return (
        <div className="space-y-4" data-testid="connect-ai">
            <div className="flex items-start gap-3">
                <div className="rounded-lg bg-indigo-50 p-2 text-indigo-600">
                    <Bot className="h-5 w-5" />
                </div>
                <div>
                    <h2 className="text-xl font-semibold">Connect your AI</h2>
                    <p className="mt-1 text-sm text-gray-500">Let Claude or any MCP-compatible assistant read and draw on this board. Everyone here sees its changes live.</p>
                </div>
            </div>

            <div className="space-y-1.5">
                <label className="text-xs font-medium text-gray-600">MCP server URL for this board</label>
                <CopyField value={url} label="MCP server URL" testId="mcp-url" />
            </div>

            <div>
                <div className="mb-2 flex flex-wrap gap-1.5">
                    {CLIENTS.map((c) => (
                        <button
                            key={c.id}
                            className={`rounded-full border px-3 py-1 text-xs ${client === c.id ? 'border-indigo-500 bg-indigo-50 text-indigo-700' : 'border-gray-200 text-gray-600 hover:bg-gray-50'}`}
                            onClick={() => setClient(c.id)}
                        >
                            {c.name}
                        </button>
                    ))}
                </div>
                <div className="rounded-lg border bg-gray-50/60 p-3 text-sm text-gray-700">{selected.steps(url)}</div>
            </div>

            <div>
                <h3 className="mb-1.5 text-xs font-medium text-gray-600">Try asking</h3>
                <ul className="space-y-1 text-sm text-gray-600">
                    {EXAMPLES.map((e) => (
                        <li key={e}>“{e}”</li>
                    ))}
                </ul>
            </div>

            <p className="flex items-start gap-2 rounded-lg bg-amber-50 p-2.5 text-xs text-amber-800">
                <ShieldAlert className="mt-0.5 h-4 w-4 shrink-0" />
                Anyone with this URL can read and edit this board. Only share it with AI tools you trust. The board must be open in a browser (or opened recently) for the AI to reach it.
            </p>
        </div>
    );
}
