import * as Popover from '@radix-ui/react-popover';
import { LayoutGrid, LogOut, Moon, Sun } from 'lucide-react';
import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { initials } from '@/board/presence';
import { useAccount, type User } from '@/lib/account';
import { useTheme } from '@/lib/theme';
import { cn } from '@/lib/utils';

/** Colour for a person without a photo, stable per id. */
const AVATAR_COLORS = ['#1971c2', '#2f9e44', '#9c36b5', '#0c8599', '#c2255c', '#5f3dc4', '#364fc7', '#087f5b'];
export const colorFor = (id: string) => AVATAR_COLORS[Array.from(id).reduce((n, c) => (n * 31 + c.charCodeAt(0)) >>> 0, 7) % AVATAR_COLORS.length];

export function Avatar({ user, size = 28, className }: { user: Pick<User, 'id' | 'name' | 'avatarUrl'>; size?: number; className?: string }) {
    const [broken, setBroken] = useState(false);
    const style = { width: size, height: size, fontSize: Math.round(size * 0.38) };
    if (user.avatarUrl && !broken) {
        return <img src={user.avatarUrl} alt="" referrerPolicy="no-referrer" onError={() => setBroken(true)} className={cn('shrink-0 rounded-full object-cover', className)} style={style} />;
    }
    return (
        <span className={cn('flex shrink-0 items-center justify-center rounded-full font-semibold text-white', className)} style={{ ...style, backgroundColor: colorFor(user.id) }} aria-hidden>
            {initials(user.name || '?')}
        </span>
    );
}

/** Avatar button with the account menu: boards, theme, sign out. */
export function AccountMenu({ align = 'end', side = 'bottom' }: { align?: 'start' | 'end'; side?: 'top' | 'bottom' }) {
    const user = useAccount((s) => s.user);
    const signOut = useAccount((s) => s.signOut);
    const theme = useTheme((s) => s.resolved);
    const toggleTheme = useTheme((s) => s.toggle);
    const navigate = useNavigate();
    const [open, setOpen] = useState(false);
    if (!user) return null;
    const item = 'flex w-full items-center gap-2.5 rounded-md px-2.5 py-[7px] text-[13px] text-foreground outline-none transition-colors hover:bg-secondary focus-visible:bg-secondary';
    return (
        <Popover.Root open={open} onOpenChange={setOpen}>
            <Popover.Trigger aria-label="Account" className="flex h-9 w-9 items-center justify-center rounded-full transition-[box-shadow] hover:ring-4 hover:ring-secondary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
                <Avatar user={user} size={28} />
            </Popover.Trigger>
            <Popover.Portal>
                <Popover.Content
                    align={align}
                    side={side}
                    sideOffset={8}
                    className="chrome chrome-solid z-[70] w-64 rounded-xl p-1.5 data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=open]:zoom-in-95"
                >
                    <div className="flex items-center gap-2.5 px-2.5 pb-2.5 pt-2">
                        <Avatar user={user} size={32} />
                        <div className="min-w-0">
                            <p className="truncate text-[13px] font-medium">{user.name}</p>
                            {user.email && <p className="truncate text-[12px] text-muted-foreground">{user.email}</p>}
                        </div>
                    </div>
                    <div className="border-t border-border/70 pt-1.5">
                        <Link to="/boards" className={item} onClick={() => setOpen(false)}>
                            <LayoutGrid className="h-4 w-4 opacity-80" strokeWidth={1.75} />
                            Your boards
                        </Link>
                        <button type="button" className={item} onClick={toggleTheme}>
                            {theme === 'dark' ? <Sun className="h-4 w-4 opacity-80" strokeWidth={1.75} /> : <Moon className="h-4 w-4 opacity-80" strokeWidth={1.75} />}
                            {theme === 'dark' ? 'Light mode' : 'Dark mode'}
                        </button>
                    </div>
                    <div className="mt-1.5 border-t border-border/70 pt-1.5">
                        <button
                            type="button"
                            className={item}
                            onClick={async () => {
                                setOpen(false);
                                await signOut();
                                navigate('/');
                            }}
                        >
                            <LogOut className="h-4 w-4 opacity-80" strokeWidth={1.75} />
                            Sign out
                        </button>
                    </div>
                </Popover.Content>
            </Popover.Portal>
        </Popover.Root>
    );
}

export function GoogleIcon({ className }: { className?: string }) {
    return (
        <svg viewBox="0 0 24 24" className={className} aria-hidden>
            <path fill="#4285F4" d="M23.5 12.27c0-.85-.08-1.67-.22-2.45H12v4.64h6.45a5.5 5.5 0 0 1-2.39 3.61v3h3.86c2.26-2.09 3.58-5.16 3.58-8.8Z" />
            <path fill="#34A853" d="M12 24c3.24 0 5.95-1.07 7.93-2.91l-3.86-3c-1.08.72-2.45 1.15-4.07 1.15-3.13 0-5.78-2.11-6.73-4.96H1.29v3.1A12 12 0 0 0 12 24Z" />
            <path fill="#FBBC05" d="M5.27 14.28A7.2 7.2 0 0 1 4.9 12c0-.79.14-1.56.38-2.28v-3.1H1.29A12 12 0 0 0 0 12c0 1.94.46 3.77 1.29 5.38l3.98-3.1Z" />
            <path fill="#EA4335" d="M12 4.77c1.76 0 3.34.6 4.59 1.8l3.43-3.43A11.5 11.5 0 0 0 12 0 12 12 0 0 0 1.29 6.62l3.98 3.1C6.22 6.88 8.87 4.77 12 4.77Z" />
        </svg>
    );
}
