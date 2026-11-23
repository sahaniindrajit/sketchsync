import { motion, useInView } from 'motion/react';
import { useRef } from 'react';
import { cn } from '@/lib/utils';

/** One small rise-in when a block first scrolls into view. */
export function Reveal({ children, className, delay = 0 }: { children: React.ReactNode; className?: string; delay?: number }) {
    return (
        <motion.div
            initial={{ opacity: 0, y: 14 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.2 }}
            transition={{ type: 'spring', visualDuration: 0.6, bounce: 0, delay }}
            className={cn(className)}
        >
            {children}
        </motion.div>
    );
}

export function SectionHeading({ eyebrow, title, children, className, center }: { eyebrow: string; title: React.ReactNode; children?: React.ReactNode; className?: string; center?: boolean }) {
    return (
        <Reveal className={cn('max-w-2xl space-y-4', center && 'mx-auto text-center', className)}>
            <p className="font-mono text-[12px] uppercase tracking-[0.08em] text-muted-foreground">{eyebrow}</p>
            <h2 className="text-balance text-[clamp(32px,5vw,56px)] font-semibold leading-[1.02] tracking-[-0.04em]">{title}</h2>
            {children && <p className="text-pretty text-[17px] leading-relaxed text-muted-foreground">{children}</p>}
        </Reveal>
    );
}

/** Adds `paused` while the element is off-screen, so CSS loops stop. */
export function usePauseOffscreen<T extends HTMLElement>() {
    const ref = useRef<T>(null);
    const inView = useInView(ref, { margin: '100px' });
    return [ref, inView ? '' : 'paused'] as const;
}
