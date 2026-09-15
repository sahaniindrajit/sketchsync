import { Bot, Maximize, Minus, Plus, Share2 } from 'lucide-react';
import { useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { useBoard } from '@/board/store';

export function ConnectionBadge({ onShare, onConnectAi }: { onShare: () => void; onConnectAi: () => void }) {
    const connection = useBoard((s) => s.connection);
    const error = useBoard((s) => s.connectionError);
    const styles = {
        online: ['bg-emerald-500', 'Live'],
        connecting: ['bg-amber-400 animate-pulse', 'Connecting…'],
        offline: ['bg-gray-400', 'Offline · saved locally'],
        error: ['bg-red-500', error ?? 'Connection error'],
    } as const;
    const [dot, text] = styles[connection];
    return (
        <div className="fixed right-4 top-4 z-10 flex items-center gap-2">
            <div className="flex items-center gap-1 rounded-full border bg-white p-1 shadow-sm">
                <span className="hidden items-center gap-2 pl-2 pr-1 text-xs text-gray-600 sm:flex" data-testid="connection-status" data-status={connection}>
                    <span className={`h-2 w-2 rounded-full ${dot}`} />
                    <span className="max-w-[14rem] truncate">{text}</span>
                </span>
                <button
                    className="flex h-7 items-center gap-1 rounded-full px-2 text-xs text-gray-600 hover:bg-gray-100 hover:text-gray-900"
                    onClick={onConnectAi}
                    aria-label="Connect your AI"
                >
                    <Bot className="h-4 w-4" />
                    <span className="hidden sm:inline">AI</span>
                </button>
            </div>
            <Button size="sm" className="h-9 rounded-full bg-indigo-500 px-4 hover:bg-indigo-600" onClick={onShare}>
                <Share2 className="mr-1 h-4 w-4" />
                Share
            </Button>
        </div>
    );
}

export function ZoomControls({ onFit }: { onFit: () => void }) {
    const viewport = useBoard((s) => s.viewport);
    const zoom = (factor: number | null) => {
        const state = useBoard.getState();
        const vp = state.viewport;
        const scale = factor === null ? 1 : Math.min(8, Math.max(0.1, vp.scale * factor));
        const cx = window.innerWidth / 2;
        const cy = window.innerHeight / 2;
        state.setViewport({ scale, x: cx - ((cx - vp.x) / vp.scale) * scale, y: cy - ((cy - vp.y) / vp.scale) * scale });
    };
    return (
        <div className="fixed bottom-4 left-4 z-10 flex items-center gap-0.5 rounded-lg border bg-white p-1 shadow-sm">
            <Button variant="ghost" size="icon" className="h-8 w-8" aria-label="Zoom out" onClick={() => zoom(1 / 1.2)}>
                <Minus className="h-4 w-4" />
            </Button>
            <button className="w-12 text-center text-xs tabular-nums text-gray-600 hover:text-gray-900" onClick={() => zoom(null)} title="Reset zoom" data-testid="zoom-level">
                {Math.round(viewport.scale * 100)}%
            </button>
            <Button variant="ghost" size="icon" className="h-8 w-8" aria-label="Zoom in" onClick={() => zoom(1.2)}>
                <Plus className="h-4 w-4" />
            </Button>
            <Button variant="ghost" size="icon" className="h-8 w-8" aria-label="Zoom to fit" onClick={onFit}>
                <Maximize className="h-4 w-4" />
            </Button>
        </div>
    );
}

export function NoticeToast() {
    const notice = useBoard((s) => s.notice);
    useEffect(() => {
        if (!notice) return;
        const t = setTimeout(() => {
            if (useBoard.getState().notice === notice) useBoard.setState({ notice: null });
        }, 4000);
        return () => clearTimeout(t);
    }, [notice]);
    if (!notice) return null;
    return (
        <div
            role="status"
            className={`fixed bottom-4 left-1/2 z-50 -translate-x-1/2 rounded-lg px-4 py-2 text-sm shadow-lg ${notice.kind === 'error' ? 'bg-red-600 text-white' : 'bg-gray-900 text-white'}`}
        >
            {notice.text}
        </div>
    );
}
