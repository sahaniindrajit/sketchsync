import { ArrowLeft, Plus } from 'lucide-react';
import { motion } from 'motion/react';
import { Link } from 'react-router-dom';
import { Logo } from '@/components/logo';

export default function NotFound() {
    return (
        <div className="dot-grid relative flex min-h-screen flex-col bg-background">
            <header className="px-6 py-5">
                <Link to="/">
                    <Logo />
                </Link>
            </header>
            <main className="flex flex-1 items-center justify-center px-6 pb-20">
                <div className="flex max-w-md flex-col items-center text-center">
                    <svg viewBox="0 0 220 120" className="h-28 w-56 text-foreground" aria-hidden>
                        <motion.path
                            d="M20 90 C 40 30, 70 20, 95 60 S 150 110, 200 30"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="3"
                            strokeLinecap="round"
                            strokeDasharray="1 0"
                            initial={{ pathLength: 0 }}
                            animate={{ pathLength: 1 }}
                            transition={{ duration: 1.2, ease: 'easeInOut' }}
                        />
                        <motion.circle cx="200" cy="30" r="6" className="fill-claude" initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ delay: 1.1, type: 'spring', bounce: 0.5 }} />
                    </svg>
                    <p className="mt-4 font-mono text-[12px] uppercase tracking-[0.08em] text-muted-foreground">Error 404</p>
                    <h1 className="mt-2 text-[34px] font-semibold tracking-[-0.035em]">Page Not Found</h1>
                    <p className="mt-3 text-[15px] leading-relaxed text-muted-foreground">This page or board doesn't exist. Check the link, or start a fresh board.</p>
                    <div className="mt-8 flex gap-2.5">
                        <Link to="/" className="inline-flex h-10 items-center gap-2 rounded-lg border border-border bg-card px-4 text-[14px] font-medium transition-colors hover:bg-secondary">
                            <ArrowLeft className="h-4 w-4" /> Home
                        </Link>
                        <Link to="/board" className="inline-flex h-10 items-center gap-2 rounded-lg bg-primary px-4 text-[14px] font-medium text-primary-foreground">
                            <Plus className="h-4 w-4" /> New board
                        </Link>
                    </div>
                </div>
            </main>
        </div>
    );
}
