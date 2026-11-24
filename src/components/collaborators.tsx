import * as Popover from '@radix-ui/react-popover';
import { Check, ChevronDown, Globe2, Loader2, Lock, Eye, X } from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';
import { api, useAccount, type BoardInfo, type LinkAccess, type Member } from '@/lib/account';
import { cn } from '@/lib/utils';
import { Avatar } from './account';

const LINK_OPTIONS: { value: LinkAccess; label: string; detail: string; icon: typeof Globe2 }[] = [
    { value: 'edit', label: 'Anyone with the link can edit', detail: 'No account needed', icon: Globe2 },
    { value: 'view', label: 'Anyone with the link can view', detail: 'Only collaborators can edit', icon: Eye },
    { value: 'off', label: 'Only collaborators', detail: 'The link alone opens nothing', icon: Lock },
];

const ROLE_TEXT = { owner: 'Owner', editor: 'Can edit', viewer: 'Can view' } as const;

function RolePicker({ value, onChange, onRemove, disabled }: { value: 'editor' | 'viewer'; onChange: (r: 'editor' | 'viewer') => void; onRemove?: () => void; disabled?: boolean }) {
    const [open, setOpen] = useState(false);
    const item = 'flex w-full items-center gap-2 rounded-md px-2.5 py-1.5 text-[13px] outline-none transition-colors hover:bg-secondary focus-visible:bg-secondary';
    return (
        <Popover.Root open={open} onOpenChange={setOpen}>
            <Popover.Trigger disabled={disabled} className="flex h-7 items-center gap-1 rounded-md px-2 text-[12.5px] text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground disabled:opacity-50">
                {ROLE_TEXT[value]}
                <ChevronDown className="h-3 w-3" />
            </Popover.Trigger>
            <Popover.Portal>
                <Popover.Content align="end" sideOffset={4} className="chrome chrome-solid pointer-events-auto z-[80] w-40 rounded-lg p-1">
                    {(['editor', 'viewer'] as const).map((r) => (
                        <button
                            key={r}
                            type="button"
                            className={item}
                            onClick={() => {
                                setOpen(false);
                                if (r !== value) onChange(r);
                            }}
                        >
                            <Check className={cn('h-3.5 w-3.5', r === value ? 'opacity-100' : 'opacity-0')} />
                            {ROLE_TEXT[r]}
                        </button>
                    ))}
                    {onRemove && (
                        <button
                            type="button"
                            className={cn(item, 'mt-1 border-t border-border/70 pt-1.5 text-destructive hover:bg-destructive/10')}
                            onClick={() => {
                                setOpen(false);
                                onRemove();
                            }}
                        >
                            <X className="h-3.5 w-3.5" />
                            Remove
                        </button>
                    )}
                </Popover.Content>
            </Popover.Portal>
        </Popover.Root>
    );
}

/**
 * Sharing for boards saved to an account: the link setting and the people invited to this board.
 * Only the owner can change either; everyone else sees who has access.
 */
export function Collaborators({ board, onChange }: { board: BoardInfo; onChange: (b: BoardInfo) => void }) {
    const me = useAccount((s) => s.user);
    const owner = board.role === 'owner';
    const [members, setMembers] = useState<Member[] | null>(null);
    const [email, setEmail] = useState('');
    const [role, setRole] = useState<'editor' | 'viewer'>('editor');
    const [busy, setBusy] = useState(false);
    const [message, setMessage] = useState<{ text: string; error?: boolean } | null>(null);
    const [linkOpen, setLinkOpen] = useState(false);

    const load = useCallback(() => {
        api<{ members: Member[] }>(`/boards/${board.id}/members`)
            .then((r) => setMembers(r.members))
            .catch(() => setMembers([]));
    }, [board.id]);
    useEffect(load, [load]);

    const run = async (fn: () => Promise<{ members?: Member[] } | void>, success?: string) => {
        setMessage(null);
        try {
            const result = await fn();
            if (result && result.members) setMembers(result.members);
            if (success) setMessage({ text: success });
        } catch (err) {
            setMessage({ text: err instanceof Error ? err.message : 'Something went wrong', error: true });
        }
    };

    const link = LINK_OPTIONS.find((o) => o.value === board.linkAccess)!;

    return (
        <div className="space-y-4" data-testid="collaborators">
            {owner && (
                <form
                    className="flex gap-1.5"
                    onSubmit={async (e) => {
                        e.preventDefault();
                        if (!email.trim()) return;
                        setBusy(true);
                        await run(async () => {
                            const r = await api<{ result: 'added' | 'invited'; members: Member[] }>(`/boards/${board.id}/members`, { method: 'POST', body: { email: email.trim(), role } });
                            setMessage({ text: r.result === 'added' ? `Added ${email.trim()}.` : `Invited ${email.trim()}. They'll get access when they sign in with that email.` });
                            setEmail('');
                            return r;
                        });
                        setBusy(false);
                    }}
                >
                    <div className="flex min-w-0 flex-1 items-center rounded-lg border border-input bg-background pr-1 transition-colors focus-within:border-ring focus-within:ring-[3px] focus-within:ring-ring/15">
                        <input
                            type="email"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            onKeyDown={(e) => e.stopPropagation()}
                            placeholder="Add people by email"
                            aria-label="Email to invite"
                            className="h-9 min-w-0 flex-1 bg-transparent px-3 text-[13.5px] outline-none placeholder:text-muted-foreground"
                        />
                        <RolePicker value={role} onChange={setRole} />
                    </div>
                    <button type="submit" disabled={busy || !email.trim()} className="flex h-9 shrink-0 items-center rounded-lg bg-primary px-3.5 text-[13px] font-medium text-primary-foreground disabled:opacity-50">
                        {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Invite'}
                    </button>
                </form>
            )}
            {message && (
                <p role={message.error ? 'alert' : 'status'} className={cn('text-[12.5px]', message.error ? 'text-destructive' : 'text-muted-foreground')}>
                    {message.text}
                </p>
            )}

            <div>
                <p className="mb-1.5 text-[12px] font-medium text-muted-foreground">People with access</p>
                {members === null ? (
                    <div className="h-9 animate-pulse rounded-md bg-secondary" />
                ) : (
                    <ul className="space-y-0.5" aria-label="People with access">
                        {members.map((m) => (
                            <li key={m.userId ?? m.email} className="flex items-center gap-2.5 py-1">
                                {m.userId ? (
                                    <Avatar user={{ id: m.userId, name: m.name, avatarUrl: m.avatarUrl }} size={28} />
                                ) : (
                                    <span className="flex h-7 w-7 items-center justify-center rounded-full border border-dashed border-border text-[11px] text-muted-foreground">@</span>
                                )}
                                <div className="min-w-0 flex-1">
                                    <p className="truncate text-[13px] font-medium">
                                        {m.name}
                                        {m.userId && m.userId === me?.id && <span className="font-normal text-muted-foreground"> (you)</span>}
                                    </p>
                                    {(m.pending || (m.email && m.email !== m.name)) && <p className="truncate text-[12px] text-muted-foreground">{m.pending ? 'Invited, not signed in yet' : m.email}</p>}
                                </div>
                                {m.role === 'owner' || !owner ? (
                                    <span className="px-2 text-[12.5px] text-muted-foreground">{ROLE_TEXT[m.role]}</span>
                                ) : (
                                    <RolePicker
                                        value={m.role}
                                        onChange={(r) => run(() => api(`/boards/${board.id}/members`, { method: 'PATCH', body: { ...(m.userId ? { userId: m.userId } : { email: m.email }), role: r } }))}
                                        onRemove={() => run(() => api(`/boards/${board.id}/members`, { method: 'DELETE', body: m.userId ? { userId: m.userId } : { email: m.email } }))}
                                    />
                                )}
                            </li>
                        ))}
                    </ul>
                )}
            </div>

            <div className="border-t border-border/70 pt-4">
                <p className="mb-1.5 text-[12px] font-medium text-muted-foreground">Link access</p>
                <Popover.Root open={linkOpen} onOpenChange={setLinkOpen}>
                    <Popover.Trigger
                        disabled={!owner}
                        aria-label="Link access"
                        className="flex w-full items-center gap-3 rounded-lg px-1 py-1 text-left transition-colors enabled:hover:bg-secondary disabled:cursor-default"
                    >
                        <span className={cn('flex h-8 w-8 shrink-0 items-center justify-center rounded-lg', board.linkAccess === 'off' ? 'bg-secondary text-muted-foreground' : 'bg-accent/12 text-accent')}>
                            <link.icon className="h-4 w-4" />
                        </span>
                        <span className="min-w-0 flex-1">
                            <span className="block truncate text-[13px] font-medium">{link.label}</span>
                            <span className="block truncate text-[12px] text-muted-foreground">{link.detail}</span>
                        </span>
                        {owner && <ChevronDown className="h-4 w-4 text-muted-foreground" />}
                    </Popover.Trigger>
                    <Popover.Portal>
                        <Popover.Content align="start" sideOffset={4} className="chrome chrome-solid pointer-events-auto z-[80] w-[var(--radix-popover-trigger-width)] rounded-lg p-1">
                            {LINK_OPTIONS.map((o) => (
                                <button
                                    key={o.value}
                                    type="button"
                                    onClick={() => {
                                        setLinkOpen(false);
                                        if (o.value === board.linkAccess) return;
                                        void run(async () => {
                                            const r = await api<{ board: BoardInfo }>(`/boards/${board.id}`, { method: 'PATCH', body: { linkAccess: o.value } });
                                            onChange({ ...board, ...r.board });
                                        });
                                    }}
                                    className="flex w-full items-center gap-2.5 rounded-md px-2.5 py-2 text-left outline-none transition-colors hover:bg-secondary focus-visible:bg-secondary"
                                >
                                    <o.icon className="h-4 w-4 shrink-0 text-muted-foreground" />
                                    <span className="min-w-0 flex-1">
                                        <span className="block text-[13px]">{o.label}</span>
                                        <span className="block text-[11.5px] text-muted-foreground">{o.detail}</span>
                                    </span>
                                    <Check className={cn('h-3.5 w-3.5', o.value === board.linkAccess ? 'opacity-100' : 'opacity-0')} />
                                </button>
                            ))}
                        </Popover.Content>
                    </Popover.Portal>
                </Popover.Root>
            </div>
        </div>
    );
}
