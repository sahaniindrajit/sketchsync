import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Navigate, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { Board, type BoardHandle } from '@/board/Board';
import { createBoard, getLastBoardId } from '@/board/persistence';
import { resetBoardState, useBoard } from '@/board/store';
import { RoomSync } from '@/board/sync';
import { DrawingSettings } from '@/components/drawingSetting';
import { ShareDialog, type ShareTab } from '@/components/shareDialog';
import { AiActivityToast } from '@/components/aiActivity';
import { ConnectAiPanel } from '@/components/connectAi';
import { ConnectionBadge, NoticeToast, ZoomControls } from '@/components/statusBar';
import { Toolbar } from '@/components/toolBar';
import { TopBar } from '@/components/topBar';
import { TooltipProvider } from '@/components/ui/tooltip';
import NotFound from '@/components/404';
import { isValidRoomId } from '@/shared/protocol';

const downloadDataUrl = (dataUrl: string, name: string) => {
    const link = document.createElement('a');
    link.download = name;
    link.href = dataUrl;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
};

/** `/board` → the last board created in this browser, or a new one. */
export function BoardRedirect() {
    const roomId = useMemo(() => getLastBoardId() ?? createBoard(), []);
    return <Navigate to={`/board/${roomId}`} replace />;
}

/** Old share links: `/live?roomId=<id>`. */
export function LegacyLiveRedirect() {
    const [params] = useSearchParams();
    const roomId = params.get('roomId');
    return <Navigate to={roomId && isValidRoomId(roomId) ? `/board/${roomId.toLowerCase()}` : '/board'} replace />;
}

export default function BoardPage() {
    const { roomId: rawRoomId } = useParams();
    const roomId = rawRoomId && isValidRoomId(rawRoomId) ? rawRoomId.toLowerCase() : null;
    if (!roomId) return <NotFound />;
    return <BoardScreen key={roomId} roomId={roomId} />;
}

function BoardScreen({ roomId }: { roomId: string }) {
    const navigate = useNavigate();
    const handle = useRef<BoardHandle | null>(null);
    const [share, setShare] = useState<ShareTab | null>(null);
    const isEmpty = useBoard((s) => s.shapes.size === 0);
    const hasEditor = useBoard((s) => s.editing !== null);

    useEffect(() => {
        resetBoardState(roomId, new Map());
        const sync = new RoomSync(roomId);
        sync.start();
        return () => sync.stop();
    }, [roomId]);

    useEffect(() => {
        document.title = 'SketchSync - Board';
        return () => {
            document.title = 'SketchSync - Online Collaborative Whiteboard';
        };
    }, []);

    const onReady = useCallback((h: BoardHandle) => {
        handle.current = h;
    }, []);

    const onDownload = useCallback(async () => {
        const dataUrl = await handle.current?.exportPng();
        if (dataUrl) downloadDataUrl(dataUrl, 'SketchSync-image.png');
        else useBoard.getState().notify('Nothing to export yet');
    }, []);

    const onImage = useCallback((file: File) => {
        void handle.current?.addImage(file);
    }, []);

    const actions = useMemo(
        () => ({
            onExport: onDownload,
            onShare: () => setShare('collaborate'),
            onConnectAi: () => setShare('ai'),
            onNewBoard: () => navigate(`/board/${createBoard()}`),
            onReset: () => {
                if (useBoard.getState().shapes.size && window.confirm('Clear the whole board for everyone?')) {
                    useBoard.getState().dispatch({ kind: 'clear' });
                }
            },
        }),
        [navigate, onDownload],
    );

    return (
        <TooltipProvider>
            <div className="fixed inset-0 overflow-hidden">
                <Board onReady={onReady} />
                <TopBar actions={actions} />
                <Toolbar onImage={onImage} onDownload={onDownload} />
                <ConnectionBadge onShare={() => setShare('collaborate')} onConnectAi={() => setShare('ai')} />
                <div className="absolute left-4 top-1/2 z-10 -translate-y-1/2">
                    <DrawingSettings />
                </div>
                <ZoomControls onFit={() => handle.current?.zoomToFit()} />
                <NoticeToast />
                <AiActivityToast onJump={(box) => handle.current?.zoomToFit(box)} />
                {isEmpty && !hasEditor && (
                    <div className="pointer-events-none absolute inset-0 z-[5] flex items-center justify-center text-gray-400">
                        <div className="text-center">
                            <div className="mb-2 text-2xl font-bold">Welcome to SketchSync</div>
                            <div className="text-sm">Pick a tool &amp; start drawing, or share the board to collaborate.</div>
                        </div>
                    </div>
                )}
                {share && (
                    <ShareDialog
                        roomId={roomId}
                        tab={share}
                        onTab={setShare}
                        onClose={() => setShare(null)}
                        aiPanel={<ConnectAiPanel roomId={roomId} />}
                    />
                )}
            </div>
        </TooltipProvider>
    );
}
