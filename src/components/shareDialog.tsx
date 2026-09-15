import { Check, Copy, X } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { boardUrl } from '@/config';

export type ShareTab = 'collaborate' | 'ai';

export function CopyField({ value, label, testId, dense, copyLabel = 'Copy' }: { value: string; label: string; testId?: string; dense?: boolean; copyLabel?: string }) {
    const [copied, setCopied] = useState(false);
    useEffect(() => {
        if (!copied) return;
        const t = setTimeout(() => setCopied(false), 1500);
        return () => clearTimeout(t);
    }, [copied]);
    const Icon = copied ? Check : Copy;
    return (
        <div className={`flex gap-1.5 ${dense ? 'text-[11px]' : 'text-xs'}`}>
            <Input
                value={value}
                readOnly
                aria-label={label}
                className={`bg-gray-50 font-mono ${dense ? 'h-8 text-[11px]' : 'h-9 text-xs'}`}
                onFocus={(e) => e.target.select()}
                data-testid={testId}
            />
            <Button
                size={dense ? 'icon' : 'sm'}
                variant={dense ? 'outline' : 'default'}
                aria-label={copied ? 'Copied' : copyLabel}
                title={copied ? 'Copied' : label}
                onClick={async () => {
                    try {
                        await navigator.clipboard.writeText(value);
                        setCopied(true);
                    } catch {
                        /* clipboard unavailable (e.g. insecure context) */
                    }
                }}
                className={dense ? 'h-8 w-8 shrink-0 text-gray-600' : 'h-9 shrink-0 bg-indigo-500 px-3 hover:bg-indigo-600'}
            >
                <Icon className="h-3.5 w-3.5" />
                {!dense && <span>{copied ? 'Copied' : 'Copy'}</span>}
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
            <Card className="max-h-[90vh] w-full max-w-md overflow-y-auto" role="dialog" aria-label="Share board">
                <CardContent className="space-y-3 p-4">
                    <div className="flex items-center gap-2">
                        <div className="flex flex-1 gap-1 rounded-lg bg-gray-100 p-0.5 text-xs font-medium" role="tablist">
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
                        <Button variant="ghost" size="icon" aria-label="Close" className="h-7 w-7 shrink-0 text-gray-400 hover:text-gray-700" onClick={onClose}>
                            <X className="h-4 w-4" />
                        </Button>
                    </div>

                    {tab === 'collaborate' ? (
                        <div className="space-y-3">
                            <p className="text-sm text-gray-500">Anyone with this link can view and edit this board in real time.</p>
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
