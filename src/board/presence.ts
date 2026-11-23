import { create } from 'zustand';
import { PRESENCE_NAME_MAX } from '@/shared/protocol';

/** Who else is on the board right now, and where their pointer is. Best-effort, never stored on the server. */

export interface Peer {
    id: string;
    name: string;
    color: string;
    x: number | null;
    y: number | null;
    at: number;
}

const COLORS = ['#1971c2', '#2f9e44', '#e8590c', '#9c36b5', '#0c8599', '#c2255c', '#5f3dc4', '#e67700'];
const ADJECTIVES = ['Amber', 'Brisk', 'Calm', 'Clever', 'Dapper', 'Eager', 'Gentle', 'Lucky', 'Nimble', 'Quiet', 'Swift', 'Witty'];
const ANIMALS = ['Otter', 'Falcon', 'Lynx', 'Heron', 'Panda', 'Fox', 'Koala', 'Orca', 'Raven', 'Gecko', 'Bison', 'Wren'];
const KEY = 'sketchsync:identity';
const pick = <T,>(list: T[]) => list[Math.floor(Math.random() * list.length)];

function loadIdentity(): { name: string; color: string } {
    try {
        const saved = JSON.parse(localStorage.getItem(KEY) ?? 'null');
        if (saved && typeof saved.name === 'string' && /^#[0-9a-f]{6}$/i.test(saved.color)) return { name: saved.name.slice(0, PRESENCE_NAME_MAX), color: saved.color };
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
    /** Sends this user's pointer (board coordinates). Set by RoomSync while connected. */
    send: (x: number | null, y: number | null) => void;
    rename: (name: string) => void;
}

export const usePresence = create<PresenceState>()((set, get) => ({
    me: typeof window !== 'undefined' ? loadIdentity() : { name: 'Guest', color: COLORS[0] },
    peers: {},
    send: () => {},
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
