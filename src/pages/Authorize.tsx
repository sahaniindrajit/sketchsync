import { Check, Loader2, Sparkles } from 'lucide-react';
import { motion } from 'motion/react';
import { useEffect, useMemo, useState } from 'react';
import { Navigate, useSearchParams } from 'react-router-dom';
import { Avatar } from '@/components/account';
import { LogoMark } from '@/components/logo';
import { api, ensureAccount, useAccount } from '@/lib/account';

/**
 * Consent screen for the personal MCP connector. The backend's /oauth/authorize validates the
 * request and sends the browser here; approving posts the decision and follows the redirect back
 * to the AI app.
 */
export default function Authorize() {
    const [search] = useSearchParams();
    const params = useMemo(() => Object.fromEntries(search.entries()), [search]);
    const status = useAccount((s) => s.status);
    const user = useAccount((s) => s.user);
    const [request, setRequest] = useState<{ clientName: string; redirectHost: string } | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [busy, setBusy] = useState<'approve' | 'deny' | null>(null);

    useEffect(() => {
        document.title = 'Connect an app · SketchSync';
        void ensureAccount();
        api<{ clientName: string; redirectHost: string }>(`/oauth/request?${search}`)
            .then(setRequest)
            .catch((err) => setError(err instanceof Error ? err.message : 'This connection request is not valid'));
    }, [search]);

    if (status === 'signed-out') return <Navigate to={`/signin?reason=connect&next=${encodeURIComponent(`/authorize?${search}`)}`} replace />;

    const decide = async (approve: boolean) => {
        setBusy(approve ? 'approve' : 'deny');
        try {
            const { redirect } = await api<{ redirect: string }>('/oauth/decision', { method: 'POST', body: { params, approve } });
            window.location.assign(redirect);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Something went wrong');
            setBusy(null);
        }
    };

    const name = request?.clientName ?? 'An app';
    return (
        <main className="dot-grid relative flex min-h-[100dvh] items-center justify-center bg-background px-4 py-10">
            <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_center,transparent_30%,hsl(var(--background))_75%)]" />
            <motion.div
                initial={{ opacity: 0, y: 10, filter: 'blur(4px)' }}
                animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
                transition={{ type: 'spring', visualDuration: 0.45, bounce: 0 }}
                className="relative w-full max-w-[400px] rounded-2xl border border-border bg-card p-7 shadow-lift"
            >
                <div className="flex items-center gap-3">
                    <LogoMark className="h-9 w-9" />
                    <svg width="44" height="10" viewBox="0 0 44 10" aria-hidden className="text-border">
                        <path d="M2 5 H42" stroke="currentColor" strokeWidth="1.5" strokeDasharray="3 4" strokeLinecap="round" />
                    </svg>
                    <span className="flex h-9 w-9 items-center justify-center rounded-[11px] bg-claude/15 text-claude">
                        <Sparkles className="h-[18px] w-[18px]" />
                    </span>
                </div>
                {error ? (
                    <>
                        <h1 className="mt-5 text-[20px] font-semibold tracking-tightish">Can't connect</h1>
                        <p role="alert" className="mt-2 text-[14px] leading-relaxed text-muted-foreground">
                            {error}
                        </p>
                    </>
                ) : !request || status === 'unknown' ? (
                    <div className="mt-6 flex h-28 items-center justify-center text-muted-foreground">
                        <Loader2 className="h-5 w-5 animate-spin" />
                    </div>
                ) : (
                    <>
                        <h1 className="mt-5 text-[20px] font-semibold leading-snug tracking-tightish">
                            Let <span className="text-claude">{name}</span> use your SketchSync boards?
                        </h1>
                        <ul className="mt-4 space-y-2 text-[13.5px] text-muted-foreground">
                            {['See the list of boards you can open', 'Read and draw on boards you can edit', 'Create and rename boards for you'].map((t) => (
                                <li key={t} className="flex gap-2.5">
                                    <Check className="mt-0.5 h-4 w-4 shrink-0 text-success" />
                                    {t}
                                </li>
                            ))}
                        </ul>
                        <p className="mt-4 text-[12.5px] leading-relaxed text-muted-foreground">
                            Its changes show up live for everyone on the board, marked as {name}. You can disconnect it any time from your boards page. It can't delete boards or change who they're shared with.
                        </p>
                        {user && (
                            <div className="mt-5 flex items-center gap-2.5 rounded-lg bg-secondary/70 px-3 py-2">
                                <Avatar user={user} size={24} />
                                <span className="min-w-0 flex-1 truncate text-[13px]">
                                    Signed in as <b className="font-medium text-foreground">{user.email ?? user.name}</b>
                                </span>
                            </div>
                        )}
                        <div className="mt-5 flex gap-2">
                            <button
                                type="button"
                                disabled={!!busy}
                                onClick={() => decide(false)}
                                className="flex h-10 flex-1 items-center justify-center rounded-lg border border-border text-[14px] font-medium transition-colors hover:bg-secondary"
                            >
                                {busy === 'deny' ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Cancel'}
                            </button>
                            <button
                                type="button"
                                disabled={!!busy}
                                onClick={() => decide(true)}
                                className="flex h-10 flex-1 items-center justify-center rounded-lg bg-primary text-[14px] font-medium text-primary-foreground transition-transform active:scale-[0.98]"
                            >
                                {busy === 'approve' ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Allow'}
                            </button>
                        </div>
                        <p className="mt-3 text-center text-[11.5px] text-muted-foreground">You'll go back to {request.redirectHost}.</p>
                    </>
                )}
            </motion.div>
        </main>
    );
}
