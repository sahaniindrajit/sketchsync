import { Check, Copy, X } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { boardUrl } from '@/config';

export type ShareTab = 'collaborate' | 'ai';

export function CopyField({ value, label, testId }: { value: string; label: string; testId?: string }) {
    const [copied, setCopied] = useState(false);
    useEffect(() => {
        if (!copied) return;
        const t = setTimeout(() => setCopied(false), 1500);
        return () => clearTimeout(t);
    }, [copied]);
    return (
        <div className="flex gap-2">
            <Input value={value} readOnly aria-label={label} className="bg-gray-50 font-mono text-xs" onFocus={(e) => e.target.select()} data-testid={testId} />
            <Button
                onClick={async () => {
                    try {
                        await navigator.clipboard.writeText(value);
                        setCopied(true);
                    } catch {
                        /* clipboard unavailable (e.g. insecure context) */
                    }
                }}
                className="shrink-0 bg-indigo-500 hover:bg-indigo-600"
            >
                {copied ? <Check className="mr-1 h-4 w-4" /> : <Copy className="mr-1 h-4 w-4" />}
                {copied ? 'Copied' : 'Copy'}
            </Button>
        </div>
    );
}

export function ShareDialog({ roomId, tab, onTab, onClose, aiPanel }: { roomId: string; tab: ShareTab; onTab: (tab: ShareTab) => void; onClose: () => void; aiPanel?: React.ReactNode }) {
    useEffect(() => {
        const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
        window.addEventListener('keydown', onKey);
        return () => window.removeEventListener('keydown', onKey);
    }, [onClose]);

    return (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-gray-900/30 p-4" onPointerDown={(e) => e.target === e.currentTarget && onClose()}>
            <Card className="relative max-h-[90vh] w-full max-w-xl overflow-y-auto" role="dialog" aria-label="Share board">
                <Button variant="ghost" size="icon" aria-label="Close" className="absolute right-2 top-2 text-gray-500 hover:text-gray-700" onClick={onClose}>
                    <X className="h-4 w-4" />
                </Button>
                <CardContent className="space-y-5 p-6">
                    <div className="flex gap-1 rounded-lg bg-gray-100 p-1 text-sm font-medium" role="tablist">
                        {(
                            [
                                ['collaborate', 'Collaborate'],
                                ['ai', 'Connect your AI'],
                            ] as const
                        ).map(([id, label]) => (
                            <button
                                key={id}
                                role="tab"
                                aria-selected={tab === id}
                                className={`flex-1 rounded-md px-3 py-1.5 ${tab === id ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-800'}`}
                                onClick={() => onTab(id)}
                            >
                                {label}
                            </button>
                        ))}
                    </div>

                    {tab === 'collaborate' ? (
                        <div className="space-y-4">
                            <div>
                                <h2 className="text-xl font-semibold">Live collaboration</h2>
                                <p className="mt-1 text-sm text-gray-500">Anyone with this link can view and edit this board in real time.</p>
                            </div>
                            <CopyField value={boardUrl(roomId)} label="Board link" testId="board-link" />
                        </div>
                    ) : (
                        aiPanel
                    )}
                </CardContent>
            </Card>
        </div>
    );
}
