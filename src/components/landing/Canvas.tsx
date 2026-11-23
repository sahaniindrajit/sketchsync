import { motion, useReducedMotion } from 'motion/react';
import { cn } from '@/lib/utils';

/**
 * The page is one board: sections sit in canvas frames (name label + selection handles),
 * and people leave sticky notes between them.
 */
export function Frame({ name, children, className, dark }: { name: string; children: React.ReactNode; className?: string; dark?: boolean }) {
    const handle = cn('absolute h-2 w-2 rounded-[2px] border bg-background', dark ? 'border-white/30 bg-[hsl(228_10%_8%)]' : 'border-accent/60');
    return (
        <div className={cn('relative rounded-[4px] border p-5 sm:p-10', dark ? 'border-white/15' : 'border-border bg-background/70 backdrop-blur-[1px]', className)}>
            <span className={cn('absolute -top-7 left-0 flex items-center gap-1.5 font-mono text-[11.5px]', dark ? 'text-white/45' : 'text-muted-foreground')}>
                <svg viewBox="0 0 12 12" className="h-3 w-3" aria-hidden>
                    <path d="M3 0 V12 M9 0 V12 M0 3 H12 M0 9 H12" stroke="currentColor" strokeWidth="1.2" fill="none" />
                </svg>
                {name}
            </span>
            <span className={cn(handle, '-left-1 -top-1')} aria-hidden />
            <span className={cn(handle, '-right-1 -top-1')} aria-hidden />
            <span className={cn(handle, '-bottom-1 -left-1')} aria-hidden />
            <span className={cn(handle, '-bottom-1 -right-1')} aria-hidden />
            {children}
        </div>
    );
}

const NOTE_COLORS = {
    yellow: 'bg-[#fff3bf] text-[#3d3200] dark:bg-[#4a3f12] dark:text-[#fff3bf]',
    blue: 'bg-[#dbeafe] text-[#10294a] dark:bg-[#1c3355] dark:text-[#dbeafe]',
    clay: 'bg-[#fbe3d8] text-[#4a2213] dark:bg-[#4a2a1e] dark:text-[#fbe3d8]',
} as const;

/** A sticky note left on the page by a collaborator (person or AI), with a hand-drawn arrow. */
export function Note({
    author,
    color = 'yellow',
    children,
    className,
    rotate = -2,
    arrow,
    ai,
}: {
    author: string;
    color?: keyof typeof NOTE_COLORS;
    children: React.ReactNode;
    className?: string;
    rotate?: number;
    arrow?: 'down' | 'down-left' | 'down-right';
    ai?: boolean;
}) {
    const reduced = useReducedMotion();
    const arrows = {
        down: 'M40 4 C 46 30, 36 52, 42 78 M34 68 L42 80 L50 69',
        'down-left': 'M70 4 C 64 34, 40 52, 14 74 M14 60 L12 76 L28 76',
        'down-right': 'M10 4 C 18 36, 44 54, 70 74 M56 76 L72 76 L68 60',
    } as const;
    return (
        <motion.div
            className={cn('pointer-events-none relative z-10 hidden w-max md:block', className)}
            initial={reduced ? false : { opacity: 0, y: 10, rotate: rotate - 4 }}
            whileInView={{ opacity: 1, y: 0, rotate }}
            viewport={{ once: true, amount: 0.8 }}
            transition={{ type: 'spring', visualDuration: 0.6, bounce: 0.3 }}
        >
            <div className={cn('max-w-[230px] rounded-[3px] px-3.5 pb-3 pt-2.5 text-[13.5px] leading-snug shadow-[0_10px_24px_-12px_rgba(0,0,0,0.35),0_1px_2px_rgba(0,0,0,0.08)]', NOTE_COLORS[color])}>
                <div className="mb-1 flex items-center gap-1.5 text-[11px] font-semibold opacity-70">
                    <svg width="10" height="12" viewBox="0 0 16 22" aria-hidden>
                        <path d="M0 0 L0 18 L4.8 13.5 L8 20.5 L11 19.2 L7.9 12.4 L14.3 12.2 Z" fill={ai ? 'hsl(var(--claude))' : '#1971c2'} />
                    </svg>
                    {author}
                </div>
                {children}
            </div>
            {arrow && (
                <svg viewBox="0 0 84 84" className="ml-6 h-16 w-16 text-foreground/40" aria-hidden>
                    <motion.path
                        d={arrows[arrow]}
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        initial={{ pathLength: reduced ? 1 : 0 }}
                        whileInView={{ pathLength: 1 }}
                        viewport={{ once: true }}
                        transition={{ duration: 0.7, delay: 0.3, ease: 'easeInOut' }}
                    />
                </svg>
            )}
        </motion.div>
    );
}
