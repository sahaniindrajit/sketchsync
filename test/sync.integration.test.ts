/**
 * Runs the real backend (sibling repo, as a child process) and checks RoomSync end-to-end.
 * Skipped when ../sketchsync-Backend is not present.
 */
import { spawn, type ChildProcess } from 'node:child_process';
import { existsSync } from 'node:fs';
import path from 'node:path';
import { io as ioClient, type Socket } from 'socket.io-client';
import { v4 as uuidv4 } from 'uuid';
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { saveBoard } from '@/board/persistence';
import { resetBoardState, useBoard } from '@/board/store';
import { RoomSync } from '@/board/sync';
import { EVENTS, PROTOCOL_VERSION, type OpBroadcast, type Shape } from '@/shared/protocol';

const backendDir = path.resolve(__dirname, '../../sketchsync-Backend');
const hasBackend = existsSync(path.join(backendDir, 'src/index.ts'));
const socketOf = (sync: RoomSync) => (sync as unknown as { socket: Socket }).socket;
const pendingOf = (sync: RoomSync) => (sync as unknown as { pending: unknown[] }).pending;
const port = 4100 + Math.floor(Math.random() * 800);
const url = `http://127.0.0.1:${port}`;

async function startBackend(env: Record<string, string> = {}, onPort = port): Promise<ChildProcess> {
    // Run node directly (not the tsx wrapper) so killing the process really stops the server.
    const child = spawn(process.execPath, ['--import', 'tsx', 'src/index.ts'], {
        cwd: backendDir,
        env: { ...process.env, PORT: String(onPort), NODE_ENV: 'test', SOCKET_JOINS_PER_MINUTE: '6000', ...env },
        stdio: 'ignore',
    });
    const deadline = Date.now() + 15000;
    while (Date.now() < deadline) {
        try {
            if ((await fetch(`http://127.0.0.1:${onPort}/ping`)).ok) return child;
        } catch {
            /* not up yet */
        }
        await new Promise((r) => setTimeout(r, 100));
    }
    child.kill();
    throw new Error('backend did not start');
}

async function stopBackend(child: ChildProcess | undefined) {
    if (!child || child.exitCode !== null) return;
    await new Promise<void>((resolve) => {
        child.once('exit', () => resolve());
        child.kill('SIGKILL');
    });
}

const rect = (id: string, x = 0): Shape => ({
    id,
    type: 'rect',
    x,
    y: 0,
    width: 50,
    height: 50,
    rotation: 0,
    opacity: 1,
    strokeColor: '#1e1e1e',
    strokeWidth: 2,
    fillColor: 'transparent',
    z: 1,
    updatedAt: 0,
    createdBy: 'user:test',
});

const waitFor = async (fn: () => boolean, timeout = 3000) => {
    const start = Date.now();
    while (!fn()) {
        if (Date.now() - start > timeout) throw new Error('waitFor timed out');
        await new Promise((r) => setTimeout(r, 20));
    }
};

describe.skipIf(!hasBackend)('RoomSync against the real backend', () => {
    let backend: ChildProcess | undefined;
    let sync: RoomSync | null = null;
    const peers: Socket[] = [];

    beforeAll(async () => {
        backend = await startBackend();
    }, 20000);

    afterAll(async () => {
        await stopBackend(backend);
    });

    /** Reads the server's copy of a room (joins it as an observer). */
    const serverShapes = async (roomId: string): Promise<Map<string, Shape>> => {
        const socket = ioClient(url, { transports: ['websocket'], forceNew: true });
        try {
            await new Promise<void>((r) => socket.once('connect', () => r()));
            const ack = await socket.emitWithAck(EVENTS.join, { roomId, clientId: uuidv4(), protocolVersion: PROTOCOL_VERSION });
            return new Map((ack.shapes as Shape[]).map((s) => [s.id, s]));
        } finally {
            socket.disconnect();
        }
    };

    const waitForServer = async (roomId: string, fn: (shapes: Map<string, Shape>) => boolean, timeout = 4000) => {
        const start = Date.now();
        for (;;) {
            if (fn(await serverShapes(roomId))) return;
            if (Date.now() - start > timeout) throw new Error('waitForServer timed out');
            await new Promise((r) => setTimeout(r, 50));
        }
    };

    beforeEach(() => {
        localStorage.clear();
    });

    afterEach(() => {
        sync?.stop();
        sync = null;
        peers.splice(0).forEach((p) => p.disconnect());
    });

    const startSync = (roomId: string) => {
        resetBoardState(roomId, new Map());
        sync = new RoomSync(roomId, {
            backendUrl: url,
            socketFactory: (url) => ioClient(url, { transports: ['websocket'], forceNew: true, reconnectionDelay: 50, reconnectionDelayMax: 100 }),
        });
        sync.start();
        return sync;
    };

    const peer = async (roomId: string) => {
        const socket = ioClient(url, { transports: ['websocket'], forceNew: true });
        peers.push(socket);
        await new Promise<void>((r) => socket.once('connect', () => r()));
        const clientId = uuidv4();
        const ack = await socket.emitWithAck(EVENTS.join, { roomId, clientId, protocolVersion: PROTOCOL_VERSION });
        const received: OpBroadcast[] = [];
        socket.on(EVENTS.op, (op: OpBroadcast) => received.push(op));
        let n = 0;
        const send = (op: unknown) => socket.emitWithAck(EVENTS.op, { roomId, opId: `${clientId}:${++n}`, op });
        return { socket, ack, received, send };
    };

    const image = (id: string, bytes: number): Shape => ({
        ...rect(id),
        type: 'image',
        src: `data:image/png;base64,${'A'.repeat(Math.floor((bytes * 4) / 3 / 4) * 4)}`,
    } as Shape);

    const online = () => waitFor(() => useBoard.getState().connection === 'online', 10000);
    const viewMatchesServer = async (roomId: string) => {
        const server = await serverShapes(roomId);
        const view = useBoard.getState().shapes;
        return server.size === view.size && Array.from(server.values()).every((s) => JSON.stringify(s) === JSON.stringify(view.get(s.id)));
    };

    it('seeds a fresh room from the local cache and syncs local ops to peers', async () => {
        const roomId = uuidv4();
        saveBoard(roomId, { confirmed: [rect('cached')] });
        startSync(roomId);
        await online();
        await waitForServer(roomId, (shapes) => shapes.has('cached'));

        const p = await peer(roomId);
        useBoard.getState().dispatch({ kind: 'add', shapes: [rect('new')] });
        for (let i = 1; i <= 10; i++) useBoard.getState().dispatch({ kind: 'update', patches: [{ id: 'new', changes: { x: i } }] });
        await waitForServer(roomId, (shapes) => shapes.get('new')?.x === 10);
        await waitFor(() => p.received.some((o) => o.op.kind === 'update'));
        // Ten rapid updates are coalesced into far fewer network ops.
        expect(p.received.filter((o) => o.op.kind === 'update').length).toBeLessThan(5);
        await waitFor(() => pendingOf(sync!).length === 0);
    });

    it('applies ops from other participants', async () => {
        const roomId = uuidv4();
        startSync(roomId);
        await online();
        const p = await peer(roomId);
        await p.send({ kind: 'add', shapes: [rect('remote', 42)] });
        await waitFor(() => useBoard.getState().shapes.get('remote')?.x === 42);
        await p.send({ kind: 'delete', ids: ['remote'] });
        await waitFor(() => !useBoard.getState().shapes.has('remote'));
    });

    it('prefers server state for known rooms and replays offline edits after reconnecting', async () => {
        const roomId = uuidv4();
        const p = await peer(roomId);
        await p.send({ kind: 'add', shapes: [rect('server-shape')] });
        saveBoard(roomId, { confirmed: [rect('stale-local')] });

        const s = startSync(roomId);
        await online();
        expect(Array.from(useBoard.getState().shapes.keys())).toEqual(['server-shape']);

        socketOf(s).io.engine.close();
        await waitFor(() => useBoard.getState().connection === 'offline');
        useBoard.getState().dispatch({ kind: 'add', shapes: [rect('offline-edit')] });
        useBoard.getState().dispatch({ kind: 'update', patches: [{ id: 'server-shape', changes: { x: 99 } }] });
        await online();
        await waitForServer(roomId, (shapes) => shapes.has('offline-edit') && shapes.get('server-shape')?.x === 99);
        await waitFor(() => p.received.some((o) => o.op.kind === 'add' && o.op.shapes[0].id === 'offline-edit'));
    });

    it('re-seeds the room from the browser when the server restarts, keeping edits made while it was down', async () => {
        const roomId = uuidv4();
        startSync(roomId);
        await online();
        useBoard.getState().dispatch({ kind: 'add', shapes: [rect('keep-me')] });
        await waitFor(() => pendingOf(sync!).length === 0);

        await stopBackend(backend);
        await waitFor(() => useBoard.getState().connection === 'offline', 5000);
        useBoard.getState().dispatch({ kind: 'add', shapes: [rect('made-while-down')] });
        useBoard.getState().dispatch({ kind: 'update', patches: [{ id: 'keep-me', changes: { x: 7 } }] });
        backend = await startBackend();
        await online();
        await waitForServer(roomId, (shapes) => shapes.has('made-while-down') && shapes.get('keep-me')?.x === 7);
    }, 30000);

    it('drops ops the server rejects and keeps showing the confirmed board', async () => {
        const roomId = uuidv4();
        startSync(roomId);
        await online();
        useBoard.getState().dispatch({ kind: 'add', shapes: [{ ...rect('bad'), strokeColor: 'not-a-color' }] });
        expect(useBoard.getState().shapes.has('bad')).toBe(true);
        await waitFor(() => useBoard.getState().notice?.kind === 'error');
        await waitFor(() => !useBoard.getState().shapes.has('bad'));
        expect(pendingOf(sync!)).toHaveLength(0);
    });

    it('reports protocol errors from the server', async () => {
        const roomId = uuidv4();
        resetBoardState(roomId, new Map());
        sync = new RoomSync(roomId, {
            backendUrl: url,
            socketFactory: (u) => {
                const socket = ioClient(u, { transports: ['websocket'], forceNew: true });
                const emit = socket.emit.bind(socket);
                socket.emit = ((event: string, payload: Record<string, unknown>, ...rest: unknown[]) =>
                    emit(event, event === EVENTS.join ? { ...payload, protocolVersion: 0 } : payload, ...rest)) as typeof socket.emit;
                return socket;
            },
        });
        sync.start();
        await waitFor(() => useBoard.getState().connection === 'error');
        expect(useBoard.getState().connectionError).toMatch(/Protocol mismatch/);
    });

    // ---- Regression tests for sync review findings ----

    it('joins and seeds boards larger than one socket message', async () => {
        const roomId = uuidv4();
        const shapes = [image('i1', 900_000), image('i2', 900_000), image('i3', 900_000), rect('r')];
        saveBoard(roomId, { confirmed: shapes });
        startSync(roomId);
        await online();
        await waitForServer(roomId, (s) => s.size === 4, 10000);
        // A second client joins the 2.7 MB board without trouble.
        const p = await peer(roomId);
        expect(p.ack.ok && p.ack.shapes.length).toBe(4);
        expect(useBoard.getState().connection).toBe('online');
    }, 30000);

    it('re-sends ops lost in a silently dead connection, without duplicating point appends', async () => {
        const roomId = uuidv4();
        const s = startSync(roomId);
        await online();
        useBoard.getState().dispatch({ kind: 'add', shapes: [{ ...rect('stroke'), type: 'freehand', points: [0, 0] } as Shape] });
        await waitForServer(roomId, (shapes) => shapes.has('stroke'));

        // Black-hole outgoing ops (e.g. Wi-Fi died but the socket hasn't noticed).
        const socket = socketOf(s);
        const realEmit = socket.emit.bind(socket);
        let dropping = true;
        socket.emit = ((event: string, ...args: unknown[]) => (dropping && event === EVENTS.op ? socket : realEmit(event, ...args))) as typeof socket.emit;
        for (let i = 1; i <= 5; i++) {
            useBoard.getState().dispatch({ kind: 'append-points', id: 'stroke', points: [i, i] });
            await new Promise((r) => setTimeout(r, 60));
        }
        useBoard.getState().dispatch({ kind: 'add', shapes: [rect('lost-rect')] });
        await new Promise((r) => setTimeout(r, 100));
        expect((await serverShapes(roomId)).has('lost-rect')).toBe(false);

        dropping = false;
        socket.io.engine.close();
        await waitFor(() => useBoard.getState().connection === 'offline');
        await online();
        await waitForServer(roomId, (shapes) => shapes.has('lost-rect'));
        const stroke = (await serverShapes(roomId)).get('stroke') as { points: number[] };
        expect(stroke.points).toEqual([0, 0, 1, 1, 2, 2, 3, 3, 4, 4, 5, 5]);
    });

    it('replays a partially delivered op stream exactly once', async () => {
        const roomId = uuidv4();
        const s = startSync(roomId);
        await online();
        useBoard.getState().dispatch({ kind: 'add', shapes: [{ ...rect('stroke'), type: 'freehand', points: [0, 0] } as Shape] });
        await waitFor(() => pendingOf(s).length === 0);
        // Deliver ops to the server but drop the echoes and acks, then reconnect.
        const socket = socketOf(s);
        const listeners = socket.listeners(EVENTS.op);
        socket.off(EVENTS.op);
        for (let i = 1; i <= 3; i++) {
            useBoard.getState().dispatch({ kind: 'append-points', id: 'stroke', points: [i, i] });
            await new Promise((r) => setTimeout(r, 60));
        }
        await waitForServer(roomId, (shapes) => (shapes.get('stroke') as { points: number[] }).points.length === 8);
        for (const l of listeners) socket.on(EVENTS.op, l);
        socket.io.engine.close();
        await waitFor(() => useBoard.getState().connection === 'offline');
        await online();
        await new Promise((r) => setTimeout(r, 300));
        expect(((await serverShapes(roomId)).get('stroke') as { points: number[] }).points).toEqual([0, 0, 1, 1, 2, 2, 3, 3]);
        expect((useBoard.getState().shapes.get('stroke') as { points: number[] }).points).toEqual([0, 0, 1, 1, 2, 2, 3, 3]);
    });

    it('delivers a large offline burst without hitting the rate limit', async () => {
        const roomId = uuidv4();
        const s = startSync(roomId);
        await online();
        socketOf(s).io.engine.close();
        await waitFor(() => useBoard.getState().connection === 'offline');
        for (let i = 0; i < 150; i++) {
            const id = `stroke-${i}`;
            useBoard.getState().dispatch({ kind: 'add', shapes: [{ ...rect(id), type: 'freehand', points: [0, 0] } as Shape] });
            useBoard.getState().dispatch({ kind: 'append-points', id, points: [1, 1] });
        }
        await online();
        await waitForServer(roomId, (shapes) => shapes.size === 150 && Array.from(shapes.values()).every((sh) => (sh as { points: number[] }).points.length === 4), 15000);
        expect(useBoard.getState().notice).toBeNull();
    }, 30000);

    it('converges with the server under concurrent conflicting edits', async () => {
        const roomId = uuidv4();
        const s = startSync(roomId);
        await online();
        useBoard.getState().dispatch({ kind: 'add', shapes: [rect('contested'), rect('victim', 200)] });
        const p = await peer(roomId);
        await waitFor(() => pendingOf(s).length === 0);
        for (let i = 0; i < 20; i++) {
            useBoard.getState().dispatch({ kind: 'update', patches: [{ id: 'contested', changes: { x: i * 2, strokeColor: '#ff0000' } }] });
            void p.send({ kind: 'update', patches: [{ id: 'contested', changes: { x: i * 2 + 1, strokeColor: '#00ff00' } }] });
            await new Promise((r) => setTimeout(r, 7));
        }
        // Delete vs move race.
        useBoard.getState().dispatch({ kind: 'update', patches: [{ id: 'victim', changes: { x: 500 } }] });
        void p.send({ kind: 'delete', ids: ['victim'] });
        await waitFor(() => pendingOf(s).length === 0, 5000);
        await new Promise((r) => setTimeout(r, 200));
        expect(await viewMatchesServer(roomId)).toBe(true);
    });

    it('keeps edits made while a seeding join is in flight', async () => {
        const roomId = uuidv4();
        saveBoard(roomId, { confirmed: [rect('cached')] });
        startSync(roomId);
        // Draw immediately, before the join ack arrives.
        useBoard.getState().dispatch({ kind: 'add', shapes: [rect('early')] });
        await online();
        await waitForServer(roomId, (shapes) => shapes.has('cached') && shapes.has('early'));
    });

    it('keeps unsent edits across a reload while offline', async () => {
        const roomId = uuidv4();
        const p = await peer(roomId);
        await p.send({ kind: 'add', shapes: [rect('server-shape')] });
        // First session can't reach the server.
        resetBoardState(roomId, new Map());
        const offline = new RoomSync(roomId, {
            backendUrl: 'http://127.0.0.1:1',
            socketFactory: (u) => ioClient(u, { transports: ['websocket'], forceNew: true, reconnection: false }),
        });
        offline.start();
        await new Promise((r) => setTimeout(r, 50));
        useBoard.getState().dispatch({ kind: 'add', shapes: [rect('drawn-offline')] });
        offline.stop();

        // "Reload" with the server reachable: the server's board wins, offline edits are replayed on top.
        startSync(roomId);
        await online();
        await waitForServer(roomId, (shapes) => shapes.has('server-shape') && shapes.has('drawn-offline'));
        expect(Object.keys(localStorage).filter((k) => k.startsWith(`sketchsync:pending:${roomId}`))).toHaveLength(0);
    });

    it('never merges new edits into an op the server may already have applied', async () => {
        const roomId = uuidv4();
        const s = startSync(roomId);
        await online();
        useBoard.getState().dispatch({ kind: 'add', shapes: [{ ...rect('stroke'), type: 'freehand', points: [0, 0] } as Shape] });
        await waitFor(() => pendingOf(s).length === 0);
        // The server gets the op but we never hear back…
        const socket = socketOf(s);
        const listeners = socket.listeners(EVENTS.op);
        socket.off(EVENTS.op);
        const realEmit = socket.emit.bind(socket);
        socket.emit = ((event: string, payload: unknown) => realEmit(event, payload)) as typeof socket.emit; // drop ack callbacks
        useBoard.getState().dispatch({ kind: 'append-points', id: 'stroke', points: [1, 1] });
        await waitForServer(roomId, (shapes) => (shapes.get('stroke') as { points: number[] }).points.length === 4);
        socket.emit = realEmit as typeof socket.emit;
        for (const l of listeners) socket.on(EVENTS.op, l);
        // …then the connection drops and the user keeps drawing.
        socket.io.engine.close();
        await waitFor(() => useBoard.getState().connection === 'offline');
        useBoard.getState().dispatch({ kind: 'append-points', id: 'stroke', points: [2, 2] });
        useBoard.getState().dispatch({ kind: 'append-points', id: 'stroke', points: [3, 3] });
        await online();
        await waitForServer(roomId, (shapes) => (shapes.get('stroke') as { points: number[] }).points.length === 8);
        await waitFor(() => pendingOf(s).length === 0);
        expect(((await serverShapes(roomId)).get('stroke') as { points: number[] }).points).toEqual([0, 0, 1, 1, 2, 2, 3, 3]);
        expect(await viewMatchesServer(roomId)).toBe(true);
    });

    it('splits large offline edits instead of exceeding the message size', async () => {
        const roomId = uuidv4();
        const s = startSync(roomId);
        await online();
        const bigStroke = (id: string): Shape =>
            ({ ...rect(id), type: 'freehand', points: Array.from({ length: 30_000 }, (_, i) => (i * 1.23456789) % 997) }) as Shape;
        for (const id of ['s1', 's2', 's3']) useBoard.getState().dispatch({ kind: 'add', shapes: [bigStroke(id)] });
        await waitFor(() => pendingOf(s).length === 0, 10000);
        socketOf(s).io.engine.close();
        await waitFor(() => useBoard.getState().connection === 'offline');
        // "Resize" all three strokes several times while offline (unrounded floats).
        for (let k = 1; k <= 3; k++) {
            for (const id of ['s1', 's2', 's3']) {
                const pts = (useBoard.getState().shapes.get(id) as { points: number[] }).points.map((v) => v * 1.0123456789);
                useBoard.getState().dispatch({ kind: 'update', patches: [{ id, changes: { points: pts } }] });
            }
        }
        const expected = (useBoard.getState().shapes.get('s3') as { points: number[] }).points;
        await online();
        await waitFor(() => pendingOf(s).length === 0, 15000);
        expect(useBoard.getState().connection).toBe('online');
        expect(((await serverShapes(roomId)).get('s3') as { points: number[] }).points).toEqual(expected);
    }, 30000);

    it('does not accept ops from a retired connection (late packets after reconnect)', async () => {
        const roomId = uuidv4();
        const s = startSync(roomId);
        await online();
        const oldClientId = (s as unknown as { clientId: string }).clientId;
        socketOf(s).io.engine.close();
        await waitFor(() => useBoard.getState().connection === 'offline');
        await online();
        // A straggler from the old connection arrives now.
        const straggler = ioClient(url, { transports: ['websocket'], forceNew: true });
        peers.push(straggler);
        await new Promise<void>((r) => straggler.once('connect', () => r()));
        const ack = await straggler.emitWithAck(EVENTS.join, { roomId, clientId: oldClientId, protocolVersion: PROTOCOL_VERSION });
        expect(ack.ok).toBe(true);
        const opAck = await straggler.emitWithAck(EVENTS.op, { roomId, opId: `${oldClientId}:1`, op: { kind: 'clear' } });
        expect(opAck).toMatchObject({ ok: false, code: 'forbidden' });
    });
});

describe.skipIf(!hasBackend)('RoomSync retries against a constrained backend', () => {
    const smallPort = port + 1000;
    const smallUrl = `http://127.0.0.1:${smallPort}`;
    let backend: ChildProcess | undefined;
    let sync: RoomSync | null = null;
    const sockets: Socket[] = [];

    beforeAll(async () => {
        backend = await startBackend({ MAX_ROOMS: '2', MAX_TOTAL_MB: '3' }, smallPort);
    }, 20000);
    afterAll(async () => {
        await stopBackend(backend);
    });
    afterEach(() => {
        sync?.stop();
        sync = null;
        sockets.splice(0).forEach((x) => x.disconnect());
        localStorage.clear();
    });

    const peerOn = async (roomId: string) => {
        const socket = ioClient(smallUrl, { transports: ['websocket'], forceNew: true });
        sockets.push(socket);
        await new Promise<void>((r) => socket.once('connect', () => r()));
        const clientId = uuidv4();
        const ack = await socket.emitWithAck(EVENTS.join, { roomId, clientId, protocolVersion: PROTOCOL_VERSION });
        let n = 0;
        return { socket, ack, send: (op: unknown) => socket.emitWithAck(EVENTS.op, { roomId, opId: `${clientId}:${++n}`, op }) };
    };

    const start = (roomId: string) => {
        resetBoardState(roomId, new Map());
        sync = new RoomSync(roomId, {
            backendUrl: smallUrl,
            socketFactory: (u) => ioClient(u, { transports: ['websocket'], forceNew: true, reconnectionDelay: 50, reconnectionDelayMax: 100 }),
        });
        sync.start();
    };

    it('retries joining while the server is at capacity, and retries uploads while storage is full', async () => {
        const a = await peerOn(uuidv4());
        const b = await peerOn(uuidv4());
        expect(a.ack.ok && b.ack.ok).toBe(true);
        await a.send({ kind: 'add', shapes: [{ ...rect('big'), type: 'image', src: `data:image/png;base64,${'A'.repeat(1_400_000)}` }] });

        const roomId = uuidv4();
        const image = (id: string) => ({ ...rect(id), type: 'image', src: `data:image/png;base64,${'B'.repeat(1_100_000)}` }) as Shape;
        saveBoard(roomId, { confirmed: [image('mine-1'), image('mine-2')] });
        start(roomId);
        // Both room slots are busy: the join is refused but retried.
        await waitFor(() => useBoard.getState().connectionError?.includes('capacity') === true, 5000);
        sockets[1].disconnect(); // frees room b for eviction
        await waitFor(() => useBoard.getState().connection === 'online', 10000);

        // Storage is full (1.4 MB + 2 x 1.1 MB > 3 MB): the second image waits instead of being dropped.
        await new Promise((r) => setTimeout(r, 1500));
        expect(useBoard.getState().shapes.size).toBe(2);
        await a.send({ kind: 'delete', ids: ['big'] });
        await waitFor(() => (sync as unknown as { pending: unknown[] }).pending.length === 0, 15000);
        const viewer = await peerOn(roomId);
        expect(viewer.ack.ok && viewer.ack.shapes.map((s: Shape) => s.id).sort()).toEqual(['mine-1', 'mine-2']);
    }, 40000);
});
