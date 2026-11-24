import { Github, Loader2 } from 'lucide-react';
import { motion } from 'motion/react';
import { useEffect, useState } from 'react';
import { Link, Navigate, useNavigate, useSearchParams } from 'react-router-dom';
import { GoogleIcon } from '@/components/account';
import { LogoMark } from '@/components/logo';
import { completeSignIn, devSignIn, ensureAccount, importLocalBoards, startSignIn, useAccount, type User } from '@/lib/account';
import { cn } from '@/lib/utils';

const safeNext = (next: string | null) => (next && next.startsWith('/') && !next.startsWith('//') ? next : '/boards');

/** After any sign-in: bring this browser's boards along, then continue. */
async function afterSignIn(user: User, navigate: (to: string, opts?: { replace?: boolean; state?: unknown }) => void, next: string) {
    let imported = 0;
    try {
        imported = await importLocalBoards(user);
    } catch {
        /* not critical: they can still open them by link */
    }
    navigate(next, { replace: true, state: imported ? { imported } : undefined });
}

function Shell({ children }: { children: React.ReactNode }) {
    return (
        <main className="dot-grid relative flex min-h-[100dvh] items-center justify-center bg-background px-4 py-10">
            <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_center,transparent_30%,hsl(var(--background))_75%)]" />
            <motion.div
                initial={{ opacity: 0, y: 10, filter: 'blur(4px)' }}
                animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
                transition={{ type: 'spring', visualDuration: 0.45, bounce: 0 }}
                className="relative w-full max-w-[380px] rounded-2xl border border-border bg-card p-7 shadow-lift"
            >
                {children}
            </motion.div>
        </main>
    );
}

export default function SignIn() {
    const [params] = useSearchParams();
    const next = safeNext(params.get('next'));
    const navigate = useNavigate();
    const status = useAccount((s) => s.status);
    const enabled = useAccount((s) => s.enabled);
    const providers = useAccount((s) => s.providers);
    const [error, setError] = useState(params.get('error'));
    const [busy, setBusy] = useState<string | null>(null);
    const [email, setEmail] = useState('');
    const [name, setName] = useState('');

    useEffect(() => {
        document.title = 'Sign in · SketchSync';
        void ensureAccount();
    }, []);

    if (status === 'signed-in' && !busy) return <Navigate to={next} replace />;

    const reason = params.get('reason');
    return (
        <Shell>
            <Link to="/" aria-label="SketchSync home" className="inline-flex">
                <LogoMark className="h-8 w-8" />
            </Link>
            <h1 className="mt-5 text-[22px] font-semibold tracking-tightish">{reason === 'board' ? 'Sign in to open this board' : reason === 'connect' ? 'Sign in to connect your AI' : 'Sign in to SketchSync'}</h1>
            <p className="mt-1.5 text-[14px] leading-relaxed text-muted-foreground">Keep every board in one place, invite people to each one, and let your AI work across all of them.</p>

            {error && (
                <p role="alert" className="mt-4 rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-[13px] text-destructive">
                    {error}
                </p>
            )}

            {enabled === null ? (
                <div className="mt-6 flex h-24 items-center justify-center text-muted-foreground">
                    <Loader2 className="h-5 w-5 animate-spin" />
                </div>
            ) : !enabled ? (
                <div className="mt-6 space-y-3 text-[13px] text-muted-foreground">
                    <p>Accounts aren't turned on for this server yet. You can still draw: boards are saved in this browser and shared by link.</p>
                    <Link to="/board" className="inline-flex h-10 items-center rounded-lg bg-primary px-4 text-[14px] font-medium text-primary-foreground">
                        Open a board
                    </Link>
                </div>
            ) : (
                <div className="mt-6 space-y-2.5">
                    {(['google', 'github'] as const)
                        // Only providers this server has set up.
                        .filter((p) => providers?.[p])
                        .map((p) => {
                        const on = providers?.[p];
                        return (
                            <button
                                key={p}
                                type="button"
                                disabled={!on || !!busy}
                                title={on ? undefined : `${p === 'google' ? 'Google' : 'GitHub'} sign-in isn't set up on this server`}
                                onClick={() => {
                                    setBusy(p);
                                    startSignIn(p, next);
                                }}
                                className="flex h-11 w-full items-center justify-center gap-2.5 rounded-lg border border-border bg-card text-[14px] font-medium transition-[background-color,transform] hover:bg-secondary active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-45"
                            >
                                {busy === p ? <Loader2 className="h-4 w-4 animate-spin" /> : p === 'google' ? <GoogleIcon className="h-[18px] w-[18px]" /> : <Github className="h-[18px] w-[18px]" />}
                                Continue with {p === 'google' ? 'Google' : 'GitHub'}
                            </button>
                        );
                    })}

                    {!providers?.google && !providers?.github && !providers?.dev && (
                        <p className="text-[13px] text-muted-foreground">Sign-in isn't set up on this server yet.</p>
                    )}
                    {providers?.dev && (
                        <form
                            className="mt-5 space-y-2 border-t border-dashed border-border pt-5"
                            onSubmit={async (e) => {
                                e.preventDefault();
                                setBusy('dev');
                                setError(null);
                                try {
                                    const user = await devSignIn(email, name || undefined);
                                    await afterSignIn(user, navigate, next);
                                } catch (err) {
                                    setError(err instanceof Error ? err.message : 'Sign-in failed');
                                    setBusy(null);
                                }
                            }}
                        >
                            <p className="font-mono text-[11px] uppercase tracking-[0.08em] text-muted-foreground">Developer sign-in</p>
                            <input
                                type="email"
                                required
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                placeholder="you@example.com"
                                aria-label="Email"
                                className="h-10 w-full rounded-lg border border-input bg-background px-3 text-[14px] outline-none focus:border-ring focus:ring-[3px] focus:ring-ring/15"
                            />
                            <input
                                value={name}
                                onChange={(e) => setName(e.target.value)}
                                placeholder="Name (optional)"
                                aria-label="Name"
                                className="h-10 w-full rounded-lg border border-input bg-background px-3 text-[14px] outline-none focus:border-ring focus:ring-[3px] focus:ring-ring/15"
                            />
                            <button type="submit" disabled={!!busy} className={cn('flex h-10 w-full items-center justify-center rounded-lg bg-primary text-[14px] font-medium text-primary-foreground', busy && 'opacity-70')}>
                                {busy === 'dev' ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Sign in'}
                            </button>
                        </form>
                    )}
                </div>
            )}
            <p className="mt-6 text-[12px] leading-relaxed text-muted-foreground">
                No account needed to draw.{' '}
                <Link to="/board" className="font-medium text-foreground underline-offset-4 hover:underline">
                    Open a board without signing in
                </Link>
            </p>
        </Shell>
    );
}

/** Codes being exchanged: React may run the effect twice in development, and a code works once. */
const exchanges = new Map<string, Promise<User>>();

/** Lands here from Google/GitHub with a one-time code. */
export function AuthCallback() {
    const [params] = useSearchParams();
    const navigate = useNavigate();
    const [error, setError] = useState<string | null>(null);
    useEffect(() => {
        const code = params.get('code');
        const next = safeNext(params.get('next'));
        if (!code) {
            navigate('/signin', { replace: true });
            return;
        }
        let cancelled = false;
        if (!exchanges.has(code)) exchanges.set(code, completeSignIn(code));
        exchanges
            .get(code)!
            .then((user) => {
                if (!cancelled) return afterSignIn(user, navigate, next);
            })
            .catch((err) => {
                if (!cancelled) setError(err instanceof Error ? err.message : 'Sign-in failed');
            });
        return () => {
            cancelled = true;
        };
        // Runs once: the code works only one time.
    }, []); // eslint-disable-line react-hooks/exhaustive-deps
    return (
        <Shell>
            {error ? (
                <>
                    <h1 className="text-[18px] font-semibold">Sign-in didn't finish</h1>
                    <p className="mt-2 text-[14px] text-muted-foreground">{error}</p>
                    <Link to="/signin" className="mt-5 inline-flex h-10 items-center rounded-lg bg-primary px-4 text-[14px] font-medium text-primary-foreground">
                        Try again
                    </Link>
                </>
            ) : (
                <div className="flex items-center gap-3 text-[14px] text-muted-foreground">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Signing you in…
                </div>
            )}
        </Shell>
    );
}
