import { create } from 'zustand';

export type ThemePreference = 'system' | 'light' | 'dark';
export type ResolvedTheme = 'light' | 'dark';

const KEY = 'sketchsync:theme';
const media = typeof window !== 'undefined' ? window.matchMedia('(prefers-color-scheme: dark)') : null;

function readPreference(): ThemePreference {
    try {
        const v = localStorage.getItem(KEY);
        return v === 'light' || v === 'dark' ? v : 'system';
    } catch {
        return 'system';
    }
}

const resolve = (pref: ThemePreference): ResolvedTheme => (pref === 'system' ? (media?.matches ? 'dark' : 'light') : pref);

function apply(theme: ResolvedTheme) {
    const root = document.documentElement;
    root.classList.toggle('dark', theme === 'dark');
    document.querySelector('meta[name="theme-color"]')?.setAttribute('content', theme === 'dark' ? '#0e0f11' : '#fafaf9');
}

interface ThemeState {
    preference: ThemePreference;
    resolved: ResolvedTheme;
    setPreference: (pref: ThemePreference) => void;
    toggle: () => void;
}

export const useTheme = create<ThemeState>()((set, get) => {
    const preference = readPreference();
    const resolved = resolve(preference);
    if (typeof document !== 'undefined') apply(resolved);
    media?.addEventListener('change', () => {
        if (get().preference !== 'system') return;
        const next = resolve('system');
        apply(next);
        set({ resolved: next });
    });
    return {
        preference,
        resolved,
        setPreference: (pref) => {
            try {
                if (pref === 'system') localStorage.removeItem(KEY);
                else localStorage.setItem(KEY, pref);
            } catch {
                /* storage unavailable */
            }
            const next = resolve(pref);
            apply(next);
            set({ preference: pref, resolved: next });
        },
        toggle: () => get().setPreference(get().resolved === 'dark' ? 'light' : 'dark'),
    };
});

/**
 * Display colour for canvas ink. Stored colours never change (other users and server
 * renders see the original); only near-black ink is lifted so it stays readable on the
 * dark board.
 */
export function displayInk(color: string, theme: ResolvedTheme): string {
    if (theme !== 'dark' || !color || color === 'transparent') return color;
    const hex = color.replace('#', '');
    const full = hex.length === 3 ? hex.split('').map((c) => c + c).join('') : hex.slice(0, 6);
    if (!/^[0-9a-fA-F]{6}$/.test(full)) return color;
    const r = parseInt(full.slice(0, 2), 16);
    const g = parseInt(full.slice(2, 4), 16);
    const b = parseInt(full.slice(4, 6), 16);
    const lum = (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255;
    return lum < 0.16 ? '#e6e6e9' : color;
}

/** Display colour for shape fills: pastels are toned down on the dark board so they don't glare. */
export function displayFill(color: string, theme: ResolvedTheme): string {
    if (theme !== 'dark' || !color || color === 'transparent') return color;
    const hex = color.replace('#', '');
    const full = hex.length === 3 ? hex.split('').map((c) => c + c).join('') : hex.slice(0, 6);
    if (!/^[0-9a-fA-F]{6}$/.test(full)) return color;
    const rgb = [0, 2, 4].map((i) => parseInt(full.slice(i, i + 2), 16));
    const lum = (0.2126 * rgb[0] + 0.7152 * rgb[1] + 0.0722 * rgb[2]) / 255;
    if (lum > 0.95) return '#1c1d21';
    if (lum < 0.55) return color;
    const bg = [0x16, 0x17, 0x1b];
    const mix = rgb.map((c, i) => Math.round(c * 0.42 + bg[i] * 0.58));
    return `#${mix.map((c) => c.toString(16).padStart(2, '0')).join('')}`;
}
