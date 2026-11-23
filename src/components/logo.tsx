import { cn } from '@/lib/utils';

/** The SketchSync mark: an ink tile with one pen stroke ending in the AI's dot. */
export function LogoMark({ className }: { className?: string }) {
    return (
        <svg viewBox="0 0 24 24" className={cn('h-6 w-6', className)} aria-hidden>
            <rect x="1.5" y="1.5" width="21" height="21" rx="6.5" className="fill-foreground" />
            <path d="M6.5 16 C 9 8.5, 12.5 8.5, 16.6 7.6" className="stroke-background" strokeWidth="2.1" fill="none" strokeLinecap="round" />
            <circle cx="16.9" cy="7.5" r="2" className="fill-claude" />
        </svg>
    );
}

export function Logo({ className }: { className?: string }) {
    return (
        <span className={cn('inline-flex items-center gap-2 text-[15px] font-semibold tracking-tightish', className)}>
            <LogoMark />
            SketchSync
        </span>
    );
}
