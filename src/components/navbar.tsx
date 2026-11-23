import { ArrowRight, Github, Moon, Sun } from 'lucide-react';
import { motion, useMotionValueEvent, useScroll } from 'motion/react';
import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Logo } from '@/components/logo';
import { useTheme } from '@/lib/theme';
import { cn } from '@/lib/utils';

export default function Navbar() {
    const { scrollY } = useScroll();
    const [scrolled, setScrolled] = useState(false);
    useMotionValueEvent(scrollY, 'change', (v) => setScrolled(v > 8));
    const theme = useTheme((s) => s.resolved);
    const toggle = useTheme((s) => s.toggle);

    return (
        <header className="sticky top-0 z-50 px-[max(16px,env(safe-area-inset-left))] pt-[env(safe-area-inset-top)]">
            <motion.nav
                className={cn(
                    'mx-auto mt-3 flex h-14 max-w-[calc(72rem-2rem)] items-center justify-between rounded-2xl border px-3 transition-[background-color,border-color,box-shadow] duration-300 sm:px-4',
                    scrolled ? 'border-border/80 bg-[hsl(var(--background)/0.94)] shadow-chrome backdrop-blur-xl backdrop-saturate-150' : 'border-transparent',
                )}
            >
                <Link to="/" aria-label="SketchSync home" className="flex items-center">
                    <Logo />
                </Link>
                <div className="flex items-center gap-1 text-[13.5px] text-muted-foreground">
                    <a href="#features" className="hidden rounded-lg px-3 py-1.5 transition-colors hover:text-foreground md:block">Features</a>
                    <a href="#mcp" className="hidden rounded-lg px-3 py-1.5 transition-colors hover:text-foreground md:block">Connect AI</a>
                    <a href="https://github.com/sahaniindrajit/sketchsync" target="_blank" rel="noreferrer" aria-label="GitHub" className="hidden h-9 w-9 sm:flex items-center justify-center rounded-lg transition-colors hover:bg-secondary hover:text-foreground">
                        <Github className="h-[18px] w-[18px]" strokeWidth={1.75} />
                    </a>
                    <button type="button" aria-label={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'} onClick={toggle} className="flex h-9 w-9 items-center justify-center rounded-lg transition-colors hover:bg-secondary hover:text-foreground">
                        <motion.span key={theme} initial={{ rotate: -60, opacity: 0 }} animate={{ rotate: 0, opacity: 1 }}>
                            {theme === 'dark' ? <Sun className="h-[18px] w-[18px]" strokeWidth={1.75} /> : <Moon className="h-[18px] w-[18px]" strokeWidth={1.75} />}
                        </motion.span>
                    </button>
                    <Link to="/board" className="group ml-1 flex h-9 items-center gap-1.5 rounded-lg bg-primary px-3.5 text-[13.5px] font-medium text-primary-foreground transition-transform active:scale-[0.97]">
                        Open a board
                        <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" />
                    </Link>
                </div>
            </motion.nav>
        </header>
    );
}
