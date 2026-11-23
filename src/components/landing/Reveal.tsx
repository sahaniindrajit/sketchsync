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

export function SectionHeading({ eyebrow, title, children, className }: { eyebrow: string; title: React.ReactNode; children?: React.ReactNode; className?: string }) {
    return (
        <Reveal className={cn('max-w-2xl space-y-4', className)}>
            <p className="font-mono text-[12px] uppercase tracking-[0.08em] text-muted-foreground">{eyebrow}</p>
            <h2 className="text-balance text-[clamp(28px,4vw,44px)] font-semibold leading-[1.05] tracking-[-0.035em]">{title}</h2>
            {children && <p className="text-pretty text-[16px] leading-relaxed text-muted-foreground">{children}</p>}
        </Reveal>
    );
}
