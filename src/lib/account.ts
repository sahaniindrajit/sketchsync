import { create } from 'zustand';
import { BACKEND_URL } from '@/config';
import { localBoardIds } from '@/board/persistence';
import type { BoardRole } from '@/shared/protocol';

/** Signed-in account. The session is a bearer token kept in this browser (the API is on another site, so no cookies). */

export interface User {
    id: string;
    name: string;
    email: string | null;
    avatarUrl: string | null;
}

export interface Providers {
    google: boolean;
    github: boolean;
    dev: boolean;
}

export type LinkAccess = 'edit' | 'view' | 'off';

export interface BoardSummary {
    id: string;
    title: string;
    role: BoardRole;
    linkAccess: LinkAccess;
    owner: { id: string; name: string; avatarUrl: string | null } | null;
    shapeCount: number;
    createdAt: string;
    updatedAt: string;
    relation: 'owned' | 'member' | 'visited';
}

export interface BoardInfo {
    id: string;
    title: string;
    titleAt: number;
    linkAccess: LinkAccess;
    role: BoardRole | null;
    owner?: User | null;
}

export interface Member {
    userId: string | null;
    email: string | null;
    name: string;
    avatarUrl: string | null;
    role: BoardRole;
    pending: boolean;
}

export interface Connection {
    clientId: string;
    name: string;
    connectedAt: string;
    lastUsedAt: string;
}

const TOKEN_KEY = 'sketchsync:session';
const NONCE_KEY = 'sketchsync:signin-nonce';

const read = (key: string, store: Storage | undefined = typeof localStorage !== 'undefined' ? localStorage : undefined) => {
    try {
        return store?.getItem(key) ?? null;
    } catch {
        return null;
    }
};
const write = (key: string, value: string | null, store: Storage | undefined = typeof localStorage !== 'undefined' ? localStorage : undefined) => {
    try {
        if (value === null) store?.removeItem(key);
        else store?.setItem(key, value);
    } catch {
        /* storage unavailable */
    }
};

export class ApiError extends Error {
    constructor(
        readonly status: number,
        message: string,
    ) {
        super(message);
    }
}

interface AccountState {
    /** `unknown` until the first check finishes. */
    status: 'unknown' | 'signed-in' | 'signed-out';
    /** Whether this server has accounts at all (it needs a database). Null until known. */
    enabled: boolean | null;
    providers: Providers | null;
    token: string | null;
    user: User | null;
    init: () => Promise<void>;
    setSession: (token: string, user: User) => void;
    signOut: () => Promise<void>;
}

export const useAccount = create<AccountState>()((set, get) => ({
    status: 'unknown',
    enabled: null,
    providers: null,
    token: read(TOKEN_KEY),
    user: null,
    init: async () => {
        const providers = await fetch(`${BACKEND_URL}/api/auth/providers`)
            .then((r) => (r.ok ? (r.json() as Promise<Providers>) : null))
            .catch(() => null);
        set({ providers, enabled: !!providers });
        const { token } = get();
        if (!providers || !token) {
            set({ status: 'signed-out', user: null });
            return;
        }
        try {
            const { user } = await api<{ user: User }>('/me');
            set({ status: 'signed-in', user });
        } catch (err) {
            // Offline: keep the token and try again next time; a rejected token is dropped.
            if (err instanceof ApiError && err.status === 401) write(TOKEN_KEY, null);
            set({ status: 'signed-out', user: null, token: err instanceof ApiError && err.status === 401 ? null : token });
        }
    },
    setSession: (token, user) => {
        write(TOKEN_KEY, token);
        set({ token, user, status: 'signed-in', enabled: true });
    },
    signOut: async () => {
        const { token } = get();
        if (token) await api('/auth/logout', { method: 'POST' }).catch(() => undefined);
        write(TOKEN_KEY, null);
        set({ token: null, user: null, status: 'signed-out' });
    },
}));

let initOnce: Promise<void> | null = null;
/** Starts the account check (once) and resolves when it's done. */
export function ensureAccount(): Promise<void> {
    if (!initOnce) initOnce = useAccount.getState().init();
    return initOnce;
}

/** Calls the backend REST API with the session token. */
export async function api<T = unknown>(path: string, init: { method?: string; body?: unknown } = {}): Promise<T> {
    const { token } = useAccount.getState();
    let res: Response;
    try {
        res = await fetch(`${BACKEND_URL}/api${path}`, {
            method: init.method ?? 'GET',
            headers: { ...(token ? { authorization: `Bearer ${token}` } : {}), ...(init.body !== undefined ? { 'content-type': 'application/json' } : {}) },
            body: init.body !== undefined ? JSON.stringify(init.body) : undefined,
        });
    } catch {
        throw new ApiError(0, "Can't reach the server. Check your connection.");
    }
    const data = (await res.json().catch(() => ({}))) as { error?: string };
    if (!res.ok) {
        if (res.status === 401 && token && path !== '/auth/logout') {
            write(TOKEN_KEY, null);
            useAccount.setState({ token: null, user: null, status: 'signed-out' });
        }
        throw new ApiError(res.status, data.error || `Request failed (${res.status})`);
    }
    return data as T;
}

/** Sends the browser to Google or GitHub. `next` is where to land afterwards. */
export function startSignIn(provider: 'google' | 'github', next: string) {
    const bytes = crypto.getRandomValues(new Uint8Array(24));
    const nonce = Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('');
    write(NONCE_KEY, nonce, sessionStorage);
    window.location.assign(`${BACKEND_URL}/api/auth/${provider}/start?${new URLSearchParams({ nonce, next })}`);
}

/** Finishes a provider sign-in (the one-time code from the callback URL). */
export async function completeSignIn(code: string): Promise<User> {
    const nonce = read(NONCE_KEY, sessionStorage) ?? '';
    write(NONCE_KEY, null, sessionStorage);
    const { token, user } = await api<{ token: string; user: User }>('/auth/exchange', { method: 'POST', body: { code, nonce } });
    useAccount.getState().setSession(token, user);
    return user;
}

/** Development servers only: sign in by email. */
export async function devSignIn(email: string, name?: string): Promise<User> {
    const { token, user } = await api<{ token: string; user: User }>('/auth/dev', { method: 'POST', body: { email, name } });
    useAccount.getState().setSession(token, user);
    return user;
}

/**
 * Adds boards drawn in this browser before signing in to the account (once per account).
 * Returns how many were added.
 */
export async function importLocalBoards(user: User): Promise<number> {
    const key = `sketchsync:imported:${user.id}`;
    if (read(key)) return 0;
    const ids = localBoardIds().slice(0, 200);
    if (!ids.length) {
        write(key, '1');
        return 0;
    }
    const { imported } = await api<{ imported: string[] }>('/boards/import', { method: 'POST', body: { ids } });
    write(key, '1');
    return imported.length;
}

export const relativeTime = (iso: string) => {
    const s = Math.max(0, (Date.now() - new Date(iso).getTime()) / 1000);
    if (s < 45) return 'just now';
    const m = Math.round(s / 60);
    if (m < 60) return `${m} min ago`;
    const h = Math.round(m / 60);
    if (h < 24) return `${h} h ago`;
    const d = Math.round(h / 24);
    if (d < 7) return `${d} d ago`;
    return new Date(iso).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: d > 300 ? 'numeric' : undefined });
};
