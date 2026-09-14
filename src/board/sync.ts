import { io, type Socket } from 'socket.io-client';
import { v4 as uuidv4 } from 'uuid';
import { BACKEND_URL } from '@/config';
import { applyOp, applyOps, sortByZ, splitOp } from '@/shared/ops';
import {
    EVENTS,
    isPermanentError,
    parseOpId,
    PROTOCOL_VERSION,
    type ErrorCode,
    type JoinAck,
    type Op,
    type OpAck,
    type OpBroadcast,
    type Shape,
} from '@/shared/protocol';
import { canMerge, isUrgent, mergeOps } from './opQueue';
import { adoptOrphanPending, holdTabLock, loadBoard, saveBoard, savePending } from './persistence';
import { setShapes, useBoard } from './store';

const FLUSH_INTERVAL_MS = 40;
const SAVE_DEBOUNCE_MS = 400;
/** Client-side pacing, comfortably under the server's rate limit. */
const SEND_RATE_PER_SECOND = 60;
const SEND_BURST = 100;
const MIN_BACKOFF_MS = 500;
const MAX_BACKOFF_MS = 30_000;

export interface RoomSyncOptions {
    backendUrl?: string;
    /** Injected for tests. */
    socketFactory?: (url: string) => Socket;
}

interface Pending {
    opId: string;
    op: Op;
    /** Currently in flight on this connection. */
    sent: boolean;
    /** Emitted at least once under its current id: the server may know it, so nothing may be merged into it. */
    dispatched: boolean;
    /** Part of re-uploading a board the server lost. */
    seed?: boolean;
}

/**
 * Keeps one board in sync with its backend room.
 *
 * - View = last server-confirmed board + this tab's pending ops.
 * - The server applies each client's ops strictly in order ("<clientId>:<n>")
 *   and echoes every op to everyone, so all clients converge on one order.
 * - Every (re)join uses a fresh client id and retires the old ones; pending
 *   ops the server hasn't processed are re-issued under the new id. Late
 *   packets from a dead connection can therefore never be applied twice.
 * - Retryable failures rewind and resend in order; permanent rejections drop
 *   just that op.
 */
export class RoomSync {
    readonly tabId = uuidv4();
    private clientId = uuidv4();
    private retiredIds = new Set<string>();
    private counter = 0;
    private socket: Socket | null = null;
    private joined = false;
    private confirmed = new Map<string, Shape>();
    private pending: Pending[] = [];
    /** Bumped whenever in-flight acks become irrelevant (rewind, disconnect, re-join). */
    private epoch = 0;
    private flushTimer: ReturnType<typeof setTimeout> | null = null;
    private saveTimer: ReturnType<typeof setTimeout> | null = null;
    private joinTimer: ReturnType<typeof setTimeout> | null = null;
    private stopped = false;
    private joinGeneration = 0;
    private warnedStorage = false;
    private tokens = SEND_BURST;
    private lastRefill = Date.now();
    private pausedUntil = 0;
    private sendBackoff = MIN_BACKOFF_MS;
    private joinBackoff = MIN_BACKOFF_MS;
    private releaseTabLock: () => void = () => {};

    constructor(
        readonly roomId: string,
        private readonly options: RoomSyncOptions = {},
    ) {}

    start() {
        this.releaseTabLock = holdTabLock(this.tabId);
        this.confirmed = new Map(loadBoard(this.roomId).confirmed.map((s) => [s.id, s]));
        useBoard.setState({
            roomId: this.roomId,
            connection: 'connecting',
            connectionError: null,
            dispatch: (op) => this.dispatch(op),
        });
        this.rebuildView();
        window.addEventListener('pagehide', this.saveNow);

        // Recover edits left unconfirmed by closed/reloaded tabs before connecting.
        void adoptOrphanPending(this.roomId, this.tabId)
            .catch(() => [])
            .then((orphans) => {
                if (this.stopped) return;
                if (orphans.length) {
                    for (const o of orphans) {
                        const parsed = parseOpId(o.opId);
                        if (parsed) this.retiredIds.add(parsed.clientId);
                    }
                    this.pending = [...orphans.map((o) => ({ opId: o.opId, op: o.op, sent: false, dispatched: true })), ...this.pending];
                    this.rebuildView();
                    this.scheduleSave();
                }
                this.connect();
            });
    }

    private connect() {
        const url = this.options.backendUrl ?? BACKEND_URL;
        const socket = this.options.socketFactory ? this.options.socketFactory(url) : io(url, { transports: ['websocket', 'polling'] });
        this.socket = socket;
        socket.on('connect', () => this.join());
        socket.on('disconnect', () => this.onDisconnect());
        socket.on('connect_error', () => {
            if (!this.stopped) useBoard.setState({ connection: 'offline' });
        });
        socket.on(EVENTS.op, (payload: OpBroadcast) => this.onServerOp(payload));
        if (socket.connected) this.join();
    }

    stop() {
        this.flush();
        this.stopped = true;
        this.saveNow(true);
        window.removeEventListener('pagehide', this.saveNow);
        for (const timer of [this.flushTimer, this.saveTimer, this.joinTimer]) if (timer) clearTimeout(timer);
        this.socket?.removeAllListeners();
        this.socket?.disconnect();
        this.socket = null;
        this.releaseTabLock();
        useBoard.setState({ dispatch: () => {} });
    }

    /** Applies an op locally right away and queues it for the server. */
    dispatch(op: Op) {
        for (const part of splitOp(op)) {
            const last = this.pending[this.pending.length - 1];
            if (last && !last.dispatched && canMerge(last.op, part)) last.op = mergeOps(last.op, part);
            else this.pending.push({ opId: this.nextOpId(), op: part, sent: false, dispatched: false });
        }
        setShapes(applyOp(useBoard.getState().shapes, op));
        this.scheduleSave();
        if (!this.joined) return;
        if (isUrgent(op)) this.flush();
        else this.scheduleFlush(FLUSH_INTERVAL_MS);
    }

    /** Sends queued ops, in order, as fast as pacing allows. */
    flush = () => {
        if (this.flushTimer) {
            clearTimeout(this.flushTimer);
            this.flushTimer = null;
        }
        if (!this.joined || !this.socket || this.stopped) return;
        const now = Date.now();
        if (now < this.pausedUntil) return this.scheduleFlush(this.pausedUntil - now);
        this.tokens = Math.min(SEND_BURST, this.tokens + ((now - this.lastRefill) / 1000) * SEND_RATE_PER_SECOND);
        this.lastRefill = now;
        for (const p of this.pending) {
            if (p.sent) continue;
            if (this.tokens < 1) return this.scheduleFlush(Math.ceil(1000 / SEND_RATE_PER_SECOND));
            this.tokens -= 1;
            this.send(p);
        }
    };

    private scheduleFlush(ms: number) {
        if (!this.flushTimer) this.flushTimer = setTimeout(this.flush, ms);
    }

    private send(p: Pending) {
        p.sent = true;
        p.dispatched = true;
        const epoch = this.epoch;
        this.socket!.timeout(20_000).emit(EVENTS.op, { roomId: this.roomId, opId: p.opId, op: p.op }, (err: Error | null, ack?: OpAck) => {
            if (this.stopped) return;
            if (err || !ack) {
                // No answer: if the connection is still up, resend from here in order.
                if (epoch === this.epoch && this.pending.includes(p)) this.rewind(p);
                return;
            }
            if (ack.ok) {
                this.sendBackoff = MIN_BACKOFF_MS;
                // Normally the echo already confirmed it; duplicates never echo.
                if (this.removePending(p)) this.rebuildView();
                return;
            }
            this.onOpError(p, ack.code, ack.error, epoch);
        });
    }

    private onOpError(p: Pending, code: ErrorCode, message: string, epoch: number) {
        if (epoch !== this.epoch || !this.pending.includes(p)) return;
        if (code === 'not_joined' || code === 'forbidden' || code === 'not_found') {
            this.rejoin();
            return;
        }
        if (!isPermanentError(code)) {
            this.rewind(p);
            return;
        }
        // The server refused the op for good: drop it and show the confirmed board.
        this.removePending(p);
        this.rebuildView();
        this.scheduleSave();
        useBoard.getState().notify(p.seed ? `Couldn't restore part of this board: ${message}` : message, 'error');
    }

    /** Marks `from` and everything after it unsent and retries after a backoff. */
    private rewind(from: Pending) {
        this.epoch++;
        const index = this.pending.indexOf(from);
        for (let i = Math.max(0, index); i < this.pending.length; i++) this.pending[i].sent = false;
        this.pausedUntil = Date.now() + this.sendBackoff;
        this.sendBackoff = Math.min(MAX_BACKOFF_MS, this.sendBackoff * 2);
        this.scheduleFlush(this.pausedUntil - Date.now());
    }

    private rejoin() {
        this.joined = false;
        this.epoch++;
        for (const p of this.pending) p.sent = false;
        this.join();
    }

    private join() {
        const socket = this.socket;
        if (!socket || this.stopped) return;
        if (this.joinTimer) {
            clearTimeout(this.joinTimer);
            this.joinTimer = null;
        }
        const generation = ++this.joinGeneration;
        const joinClientId = uuidv4();
        const retire = new Set(this.retiredIds);
        retire.add(this.clientId);
        for (const p of this.pending) {
            const parsed = parseOpId(p.opId);
            if (parsed) retire.add(parsed.clientId);
        }
        socket.timeout(15_000).emit(
            EVENTS.join,
            {
                roomId: this.roomId,
                clientId: joinClientId,
                protocolVersion: PROTOCOL_VERSION,
                pendingOpIds: this.pending.map((p) => p.opId),
                retireClientIds: Array.from(retire),
            },
            (err: Error | null, ack?: JoinAck) => {
                if (this.stopped || generation !== this.joinGeneration) return;
                if (err || !ack) {
                    useBoard.setState({ connection: 'offline' });
                    this.retryJoin();
                    return;
                }
                if (!ack.ok) {
                    this.joined = false;
                    useBoard.setState({ connection: ack.code === 'protocol' ? 'error' : 'offline', connectionError: ack.error });
                    if (ack.code !== 'protocol') this.retryJoin();
                    return;
                }
                this.onJoined(joinClientId, retire, ack.shapes, ack.fresh, ack.appliedOpIds);
            },
        );
    }

    private retryJoin() {
        if (this.stopped || !this.socket?.connected) return; // Socket.IO reconnects and re-joins on its own.
        const delay = this.joinBackoff;
        this.joinBackoff = Math.min(MAX_BACKOFF_MS, this.joinBackoff * 2);
        this.joinTimer = setTimeout(() => this.join(), delay);
    }

    private onJoined(clientId: string, retired: Set<string>, serverShapes: Shape[], fresh: boolean, appliedOpIds: string[]) {
        const applied = new Set(appliedOpIds);
        const remaining = this.pending.filter((p) => !applied.has(p.opId));
        const seed: Pending[] =
            fresh && this.confirmed.size > 0
                ? // The server lost this room (restart/eviction): upload our last known copy first.
                  splitOp({ kind: 'add', shapes: sortByZ(this.confirmed.values()) }).map((op) => ({ opId: '', op, sent: false, dispatched: false, seed: true }))
                : [];

        // Re-issue everything under the new client id, in order.
        this.clientId = clientId;
        this.counter = 0;
        for (const id of retired) this.retiredIds.delete(id);
        this.pending = [...seed, ...remaining];
        for (const p of this.pending) {
            p.opId = this.nextOpId();
            p.sent = false;
            p.dispatched = false;
        }
        this.confirmed = new Map(sortByZ(serverShapes).map((s) => [s.id, s]));
        this.joined = true;
        this.epoch++;
        this.joinBackoff = MIN_BACKOFF_MS;
        this.sendBackoff = MIN_BACKOFF_MS;
        this.pausedUntil = 0;
        this.rebuildView();
        useBoard.setState({ connection: 'online', connectionError: null });
        this.scheduleSave();
        this.flush();
    }

    private onDisconnect() {
        this.joined = false;
        this.epoch++;
        for (const p of this.pending) p.sent = false;
        // Anything Socket.IO buffered for the dead connection is re-issued after re-joining instead.
        if (this.socket) this.socket.sendBuffer = [];
        if (!this.stopped) useBoard.setState({ connection: 'offline' });
    }

    private onServerOp(payload: OpBroadcast) {
        if (payload.roomId !== this.roomId || !this.joined) return;
        this.confirmed = applyOp(this.confirmed, payload.op);
        const index = this.pending.findIndex((p) => p.opId === payload.opId);
        if (index === 0) {
            // Our oldest pending op, confirmed in order: the view already shows it.
            this.pending.shift();
            if (this.pending.length === 0) setShapes(this.confirmed);
        } else if (index > 0) {
            this.pending.splice(index, 1);
            this.rebuildView();
        } else if (this.pending.length === 0) {
            setShapes(this.confirmed);
        } else if (this.canApplyOnTop(payload.op)) {
            setShapes(applyOp(useBoard.getState().shapes, payload.op));
        } else {
            this.rebuildView();
        }
        this.scheduleSave();
        this.trackAi(payload);
    }

    /** A remote op commutes with pending ops when they touch different shapes (and nothing pending deletes). */
    private canApplyOnTop(op: Op): boolean {
        if (op.kind === 'delete' || op.kind === 'clear') return false;
        const touched = new Set<string>();
        for (const p of this.pending) {
            switch (p.op.kind) {
                case 'delete':
                case 'clear':
                    return false;
                case 'add':
                    p.op.shapes.forEach((s) => touched.add(s.id));
                    break;
                case 'update':
                    p.op.patches.forEach((x) => touched.add(x.id));
                    break;
                case 'append-points':
                    touched.add(p.op.id);
                    break;
            }
        }
        const ids = op.kind === 'add' ? op.shapes.map((s) => s.id) : op.kind === 'update' ? op.patches.map((x) => x.id) : [op.id];
        return ids.every((id) => !touched.has(id));
    }

    private trackAi(payload: OpBroadcast) {
        if (!payload.origin.startsWith('ai:')) return;
        const op = payload.op;
        const ids = op.kind === 'add' ? op.shapes.map((s) => s.id) : op.kind === 'update' ? op.patches.map((p) => p.id) : [];
        const prev = useBoard.getState().aiActivity;
        const sameBatch = prev && Date.now() - prev.at < 4000;
        useBoard.setState({
            aiActivity: {
                name: payload.origin.slice(3) || 'AI',
                shapeIds: sameBatch ? Array.from(new Set([...prev.shapeIds, ...ids])) : ids,
                at: Date.now(),
            },
        });
    }

    private removePending(p: Pending): boolean {
        const index = this.pending.indexOf(p);
        if (index < 0) return false;
        this.pending.splice(index, 1);
        return true;
    }

    /** View = confirmed board + pending local ops. */
    private rebuildView() {
        setShapes(this.pending.length ? applyOps(this.confirmed, this.pending.map((p) => p.op)) : this.confirmed);
    }

    private nextOpId() {
        return `${this.clientId}:${++this.counter}`;
    }

    private scheduleSave() {
        if (this.saveTimer) clearTimeout(this.saveTimer);
        this.saveTimer = setTimeout(() => this.saveNow(), SAVE_DEBOUNCE_MS);
    }

    private saveNow = (closing: boolean | Event = false) => {
        if (this.saveTimer) {
            clearTimeout(this.saveTimer);
            this.saveTimer = null;
        }
        const result = saveBoard(this.roomId, { confirmed: Array.from(this.confirmed.values()) });
        const pendingSaved = savePending(
            this.roomId,
            this.tabId,
            this.pending.map(({ opId, op }) => ({ opId, op })),
            closing === true,
        );
        if ((result !== 'saved' || !pendingSaved) && !this.warnedStorage) {
            this.warnedStorage = true;
            useBoard
                .getState()
                .notify(result === 'failed' || !pendingSaved ? 'Browser storage is full: this board is not fully cached locally.' : 'Browser storage is full: images are only kept on the server.', 'error');
        }
    };
}
