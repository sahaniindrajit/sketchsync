import { motion } from 'motion/react';
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

export function SectionHeading({ eyebrow, title, children, className, center, small }: { eyebrow: string; title: React.ReactNode; children?: React.ReactNode; className?: string; center?: boolean; small?: boolean }) {
    return (
        <Reveal className={cn('max-w-2xl space-y-4', center && 'mx-auto text-center', className)}>
            <p className="font-mono text-[12px] uppercase tracking-[0.08em] text-muted-foreground">{eyebrow}</p>
            <h2 className={cn('text-balance font-semibold leading-[1.02] tracking-[-0.04em]', small ? 'text-[clamp(26px,3.4vw,38px)]' : 'text-[clamp(32px,5vw,56px)]')}>{title}</h2>
            {children && <p className="text-pretty text-[17px] leading-relaxed text-muted-foreground">{children}</p>}
        </Reveal>
    );
}
