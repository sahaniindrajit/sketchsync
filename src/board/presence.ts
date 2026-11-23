import { create } from 'zustand';
import { BOARD_TITLE_MAX, PRESENCE_NAME_MAX } from '@/shared/protocol';

/** Who else is on the board right now, and where their pointer is. Best-effort, never stored on the server. */

export interface Peer {
    id: string;
    name: string;
    color: string;
    x: number | null;
    y: number | null;
    at: number;
}

/** People colours. Orange-red is kept for AI agents. */
export const COLORS = ['#1971c2', '#2f9e44', '#9c36b5', '#0c8599', '#c2255c', '#5f3dc4', '#364fc7', '#087f5b'];
const ADJECTIVES = ['Amber', 'Brisk', 'Calm', 'Clever', 'Dapper', 'Eager', 'Gentle', 'Lucky', 'Nimble', 'Quiet', 'Swift', 'Witty'];
const ANIMALS = ['Otter', 'Falcon', 'Lynx', 'Heron', 'Panda', 'Fox', 'Koala', 'Orca', 'Raven', 'Gecko', 'Bison', 'Wren'];
const KEY = 'sketchsync:identity';
const pick = <T,>(list: T[]) => list[Math.floor(Math.random() * list.length)];

function loadIdentity(): { name: string; color: string } {
    try {
        const saved = JSON.parse(localStorage.getItem(KEY) ?? 'null');
        if (saved && typeof saved.name === 'string' && COLORS.includes(saved.color)) return { name: saved.name.slice(0, PRESENCE_NAME_MAX), color: saved.color };
    } catch {
        /* storage unavailable */
    }
    const identity = { name: `${pick(ADJECTIVES)} ${pick(ANIMALS)}`, color: pick(COLORS) };
    try {
        localStorage.setItem(KEY, JSON.stringify(identity));
    } catch {
        /* storage unavailable */
    }
    return identity;
}

interface PresenceState {
    me: { name: string; color: string };
    peers: Record<string, Peer>;
    roomId: string | null;
    /** The board's name; shared with collaborators through presence (newest wins). */
    title: string;
    titleAt: number;
    loadTitle: (roomId: string) => void;
    setTitle: (title: string, at?: number) => void;
    /** Sends this user's pointer (board coordinates). Set by RoomSync while connected. */
    send: (x: number | null, y: number | null) => void;
    /** Re-sends presence right away (after a rename). */
    announce: () => void;
    rename: (name: string) => void;
}

export const usePresence = create<PresenceState>()((set, get) => ({
    me: typeof window !== 'undefined' ? loadIdentity() : { name: 'Guest', color: COLORS[0] },
    peers: {},
    roomId: null,
    title: '',
    titleAt: 0,
    loadTitle: (roomId) => {
        let saved: { title?: string; at?: number } = {};
        try {
            saved = JSON.parse(localStorage.getItem(`sketchsync:title:${roomId}`) ?? '{}');
        } catch {
            /* storage unavailable */
        }
        set({ roomId, title: typeof saved.title === 'string' ? saved.title : '', titleAt: typeof saved.at === 'number' ? saved.at : 0 });
    },
    setTitle: (title, at = Date.now()) => {
        const clean = title.trim().slice(0, BOARD_TITLE_MAX);
        const { roomId } = get();
        set({ title: clean, titleAt: at });
        try {
            if (roomId) localStorage.setItem(`sketchsync:title:${roomId}`, JSON.stringify({ title: clean, at }));
        } catch {
            /* storage unavailable */
        }
    },
    send: () => {},
    announce: () => {},
    rename: (name) => {
        const clean = name.trim().slice(0, PRESENCE_NAME_MAX);
        if (!clean) return;
        const me = { ...get().me, name: clean };
        try {
            localStorage.setItem(KEY, JSON.stringify(me));
        } catch {
            /* storage unavailable */
        }
        set({ me });
    },
}));

export const initials = (name: string) =>
    name
        .split(/\s+/)
        .map((w) => w[0])
        .join('')
        .slice(0, 2)
        .toUpperCase();

/**
 * Display colours for everyone on the board, unique where possible: your own colour first,
 * then peers in a stable order, skipping colours already taken.
 */
export function assignColors(me: { color: string }, peers: Peer[]): Record<string, string> {
    const taken = new Set([me.color]);
    const out: Record<string, string> = {};
    for (const p of [...peers].sort((a, b) => a.id.localeCompare(b.id))) {
        const color = !taken.has(p.color) && COLORS.includes(p.color) ? p.color : COLORS.find((c) => !taken.has(c)) ?? p.color;
        taken.add(color);
        out[p.id] = color;
    }
    return out;
}
