import { ArrowLeft, Plus, Sparkles } from 'lucide-react';
import { motion, useReducedMotion } from 'motion/react';
import { Link } from 'react-router-dom';
import Footer from '@/components/footer';
import Navbar from '@/components/navbar';

export default function NotFound() {
    const reduced = useReducedMotion();
    return (
        <div className="flex min-h-screen flex-col bg-background">
            <Navbar />
            <main className="mx-auto flex w-full max-w-6xl flex-1 items-center px-[max(16px,env(safe-area-inset-left))] py-20">
                <div className="grid w-full items-center gap-12 md:grid-cols-[1fr_1.1fr] md:items-start">
                    <div className="max-w-[480px]">
                        <p className="font-mono text-[12px] uppercase tracking-[0.08em] text-muted-foreground">Error 404</p>
                        <h1 className="mt-3 text-[clamp(36px,5vw,56px)] font-semibold leading-[1.02] tracking-[-0.04em]">Page not found</h1>
                        <p className="mt-4 text-[17px] leading-relaxed text-muted-foreground">This page or board doesn't exist. Check the link you were sent, or start a fresh board.</p>
                        <div className="mt-8 flex flex-wrap gap-2.5">
                            <Link to="/board" className="inline-flex h-11 items-center gap-2 rounded-xl bg-primary px-5 text-[14.5px] font-medium text-primary-foreground transition-transform active:scale-[0.97]">
                                <Plus className="h-4 w-4" /> New board
                            </Link>
                            <Link to="/" className="inline-flex h-11 items-center gap-2 rounded-xl border border-border bg-card px-5 text-[14.5px] font-medium transition-colors hover:bg-secondary">
                                <ArrowLeft className="h-4 w-4" /> Home
                            </Link>
                        </div>
                    </div>
                    <div className="dot-grid relative aspect-[5/4] w-full overflow-hidden rounded-2xl border border-border bg-card">
                        <svg viewBox="0 0 500 400" className="absolute inset-0 h-full w-full text-foreground" aria-hidden>
                            <motion.path
                                d="M82 290 C 130 210, 190 330, 250 230 S 360 140, 440 200"
                                fill="none"
                                stroke="currentColor"
                                strokeWidth="3"
                                strokeLinecap="round"
                                initial={{ pathLength: reduced ? 1 : 0 }}
                                animate={{ pathLength: 1 }}
                                transition={{ duration: 1.4, ease: 'easeInOut' }}
                            />
                            <motion.path d="M424 186 L442 202 L420 210" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" initial={{ opacity: reduced ? 1 : 0 }} animate={{ opacity: 1 }} transition={{ delay: 1.35 }} />
                            <text x="458" y="200" fontSize="30" fontWeight="700" className="fill-foreground" fontFamily="Inter, sans-serif">
                                ?
                            </text>
                            <rect x="40" y="280" width="40" height="40" rx="9" fill="none" stroke="currentColor" strokeWidth="2.5" />
                            <text x="60" y="345" textAnchor="middle" fontSize="13" className="fill-muted-foreground" fontFamily="Inter, sans-serif">
                                you are here
                            </text>
                        </svg>
                        <motion.div
                            className="absolute right-[8%] top-[10%] flex items-start gap-0.5"
                            initial={reduced ? false : { opacity: 0, x: -30, y: 10 }}
                            animate={{ opacity: 1, x: 0, y: 0 }}
                            transition={{ delay: 1.2, type: 'spring', visualDuration: 0.6, bounce: 0.2 }}
                        >
                            <svg width="16" height="20" viewBox="0 0 16 22" aria-hidden>
                                <path d="M0 0 L0 18 L4.8 13.5 L8 20.5 L11 19.2 L7.9 12.4 L14.3 12.2 Z" className="fill-claude" stroke="white" strokeWidth="1.4" />
                            </svg>
                            <span className="mt-4 flex items-center gap-1.5 rounded-lg rounded-tl-sm bg-[#b4532f] px-2.5 py-1.5 text-[12.5px] font-medium text-white shadow-chrome">
                                <Sparkles className="h-3 w-3" /> I couldn't find it either.
                            </span>
                        </motion.div>
                    </div>
                </div>
            </main>
            <Footer />
        </div>
    );
}
