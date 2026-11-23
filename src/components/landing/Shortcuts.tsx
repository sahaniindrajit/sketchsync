import { motion } from 'motion/react';
import { useEffect, useState } from 'react';
import { cn } from '@/lib/utils';
import { Reveal, SectionHeading } from './Reveal';

const KEYS = [
    ['V', 'Select'],
    ['H', 'Pan'],
    ['P', 'Pencil'],
    ['R', 'Rectangle'],
    ['O', 'Ellipse'],
    ['D', 'Diamond'],
    ['A', 'Arrow'],
    ['L', 'Line'],
    ['T', 'Text'],
    ['M', 'Math'],
    ['E', 'Eraser'],
] as const;

export function Shortcuts() {
    const [pressed, setPressed] = useState<string | null>(null);
    useEffect(() => {
        const down = (e: KeyboardEvent) => {
            if (e.metaKey || e.ctrlKey || e.altKey || (e.target as HTMLElement)?.tagName === 'INPUT') return;
            const k = e.key.toUpperCase();
            if (KEYS.some(([key]) => key === k)) setPressed(k);
        };
        const up = () => setPressed(null);
        window.addEventListener('keydown', down);
        window.addEventListener('keyup', up);
        return () => {
            window.removeEventListener('keydown', down);
            window.removeEventListener('keyup', up);
        };
    }, []);

    return (
        <section>
            <SectionHeading eyebrow="Keyboard first" title="Every tool is one key away.">
                Try them here. The same keys work on the board, and <span className="kbd">⌘</span> <span className="kbd">K</span> finds everything else.
            </SectionHeading>
            <Reveal className="mt-10 flex flex-wrap gap-2.5">
                {KEYS.map(([k, label]) => {
                    const on = pressed === k;
                    return (
                        <div key={k} className="flex flex-col items-center gap-2">
                            <motion.div
                                animate={{ y: on ? 3 : 0, scale: on ? 0.96 : 1 }}
                                transition={{ type: 'spring', visualDuration: 0.12, bounce: 0.4 }}
                                className={cn(
                                    'flex h-14 w-14 items-center justify-center rounded-xl border bg-card font-mono text-[17px] font-medium shadow-[0_3px_0_hsl(var(--border))] transition-colors duration-100',
                                    on ? 'border-accent text-accent shadow-[0_0px_0_hsl(var(--border)),0_0_0_4px_hsl(var(--accent)/0.15)]' : 'border-border text-foreground',
                                )}
                            >
                                {k}
                            </motion.div>
                            <span className={cn('text-[11.5px] transition-colors', on ? 'text-accent' : 'text-muted-foreground')}>{label}</span>
                        </div>
                    );
                })}
            </Reveal>
        </section>
    );
}
