import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Navigate, useLocation, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { Board, type BoardHandle } from '@/board/Board';
import { createBoard, getLastBoardId } from '@/board/persistence';
import { resetBoardState, useBoard } from '@/board/store';
import { RoomSync } from '@/board/sync';
import { AnimatePresence, motion } from 'motion/react';
import { DrawingSettings } from '@/components/drawingSetting';
import { ShareDialog, type ShareTab } from '@/components/shareDialog';
import { AiActivityToast } from '@/components/aiActivity';
import { CommandPalette } from '@/components/commandPalette';
import { ConnectAiPanel } from '@/components/connectAi';
import { LogoMark } from '@/components/logo';
import { ConnectionBadge, NoticeToast, ZoomControls } from '@/components/statusBar';
import { PeerCursors } from '@/components/presence';
import { Kbd } from '@/components/ui/kbd';
import { MOD } from '@/lib/platform';
import { Toolbar } from '@/components/toolBar';
import { TopBar } from '@/components/topBar';
import { TooltipProvider } from '@/components/ui/tooltip';
import NotFound from '@/components/404';
import { isValidRoomId } from '@/shared/protocol';
import { getShapeBounds, unionBoxes } from '@/shared/geometry';
import { browserMeasurer } from '@/board/measure';

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
    const { search } = useLocation();
    return <Navigate to={`/board/${roomId}${search}`} replace />;
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
    const [params, setParams] = useSearchParams();
    // `?connect=ai` (from the landing page) opens the Connect your AI dialog once.
    const [share, setShare] = useState<ShareTab | null>(() => (params.get('connect') === 'ai' ? 'ai' : null));
    const [ask] = useState(() => params.get('ask')?.slice(0, 200) ?? undefined);
    useEffect(() => {
        if (params.has('connect') || params.has('ask')) setParams({}, { replace: true });
    }, []); // eslint-disable-line react-hooks/exhaustive-deps
    const [palette, setPalette] = useState(false);
    const isEmpty = useBoard((s) => s.shapes.size === 0);
    const hasEditor = useBoard((s) => s.editing !== null);

    useEffect(() => {
        resetBoardState(roomId, new Map());
        const sync = new RoomSync(roomId);
        sync.start();
        return () => sync.stop();
    }, [roomId]);

    useEffect(() => {
        document.title = 'Board · SketchSync';
        return () => {
            document.title = 'SketchSync · The whiteboard your AI can draw on';
        };
    }, []);

    useEffect(() => {
        const onKey = (e: KeyboardEvent) => {
            if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
                e.preventDefault();
                setPalette((v) => !v);
            }
        };
        window.addEventListener('keydown', onKey);
        return () => window.removeEventListener('keydown', onKey);
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

    const onFit = useCallback(() => handle.current?.zoomToFit(), []);

    // Opening a board whose drawing is entirely off-screen: bring it into view once.
    useEffect(() => {
        let done = false;
        const check = () => {
            const { shapes, viewport } = useBoard.getState();
            if (done || !shapes.size || !handle.current) return;
            done = true;
            const box = unionBoxes(Array.from(shapes.values()).map((s) => getShapeBounds(s, (id) => shapes.get(id), browserMeasurer)));
            if (!box) return;
            const left = box.x * viewport.scale + viewport.x;
            const top = box.y * viewport.scale + viewport.y;
            const right = left + box.width * viewport.scale;
            const bottom = top + box.height * viewport.scale;
            if (right < 0 || bottom < 0 || left > window.innerWidth || top > window.innerHeight) handle.current.zoomToFit();
        };
        const t = setTimeout(check, 400);
        const unsub = useBoard.subscribe((s, prev) => {
            if (s.connection === 'online' && prev.connection !== 'online') setTimeout(check, 50);
        });
        return () => {
            clearTimeout(t);
            unsub();
        };
    }, [roomId]);

    const actions = useMemo(
        () => ({
            onExport: onDownload,
            onFit,
            onShare: () => setShare('collaborate'),
            onConnectAi: () => setShare('ai'),
            onNewBoard: () => navigate(`/board/${createBoard()}`),
            onReset: () => {
                if (useBoard.getState().shapes.size && window.confirm('Clear the whole board for everyone?')) {
                    useBoard.getState().dispatch({ kind: 'clear' });
                }
            },
        }),
        [navigate, onDownload, onFit],
    );

    return (
        <TooltipProvider>
            <div className="fixed inset-0 overflow-hidden bg-background">
                <Board onReady={onReady} />
                <PeerCursors />
                <AnimatePresence>{isEmpty && !hasEditor && <EmptyState />}</AnimatePresence>
                <TopBar actions={actions} onCommand={() => setPalette(true)} />
                <ConnectionBadge onShare={() => setShare('collaborate')} onConnectAi={() => setShare('ai')} />
                <DrawingSettings />
                <Toolbar onImage={onImage} onDownload={onDownload} />
                <ZoomControls onFit={onFit} />
                <NoticeToast />
                <AiActivityToast onJump={(box) => handle.current?.zoomToFit(box)} />
                <CommandPalette open={palette} onOpenChange={setPalette} actions={actions} onFit={onFit} />
                <AnimatePresence>
                    {share && (
                        <ShareDialog
                            key="share"
                            roomId={roomId}
                            tab={share}
                            onTab={setShare}
                            onClose={() => setShare(null)}
                            aiPanel={<ConnectAiPanel roomId={roomId} ask={ask} />}
                        />
                    )}
                </AnimatePresence>
            </div>
        </TooltipProvider>
    );
}

const hints = [
    ['P', 'Draw'],
    ['R', 'Shapes'],
    ['T', 'Text'],
    ['M', 'Math'],
] as const;

function EmptyState() {
    return (
        <motion.div
            initial={{ opacity: 0, y: 8, filter: 'blur(4px)' }}
            animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
            exit={{ opacity: 0, y: -6, filter: 'blur(4px)', transition: { duration: 0.2 } }}
            transition={{ type: 'spring', visualDuration: 0.5, bounce: 0.1, delay: 0.15 }}
            className="pointer-events-none absolute inset-0 z-[5] flex items-center justify-center px-6"
        >
            <div className="flex max-w-sm flex-col items-center text-center">
                <LogoMark className="mb-5 h-10 w-10 opacity-90" />
                <h1 className="text-[22px] font-semibold tracking-tightish text-foreground">Welcome to SketchSync</h1>
                <p className="mt-2 text-[14px] leading-relaxed text-muted-foreground">
                    Pick a tool and start drawing. Share the link to sketch together, or connect an AI to draw with you.
                </p>
                <div className="mt-6 flex flex-wrap items-center justify-center gap-x-4 gap-y-2 text-[12px] text-muted-foreground [@media(hover:none)]:hidden">
                    {hints.map(([k, label]) => (
                        <span key={k} className="flex items-center gap-1.5">
                            <Kbd>{k}</Kbd>
                            {label}
                        </span>
                    ))}
                    <span className="hidden items-center gap-1.5 sm:flex">
                        <Kbd>{MOD}</Kbd>
                        <Kbd>K</Kbd>
                        Commands
                    </span>
                </div>
            </div>
        </motion.div>
    );
}
