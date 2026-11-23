import { Logo } from '@/components/logo';

const links = [
    ['GitHub', 'https://github.com/sahaniindrajit/sketchsync'],
    ['Backend & MCP server', 'https://github.com/sahaniindrajit/sketchsync-Backend'],
    ['Report an issue', 'https://github.com/sahaniindrajit/sketchsync/issues'],
    ['X / Twitter', 'https://x.com/sahani_indrajit'],
    ['Made by Indrajit Sahani', 'https://www.indrajitsahani.com/'],
] as const;

export default function Footer() {
    return (
        <footer className="border-t border-border">
            <div className="mx-auto flex max-w-6xl flex-col gap-8 px-[max(16px,env(safe-area-inset-left))] py-12 md:flex-row md:items-start md:justify-between">
                <div className="space-y-3">
                    <Logo />
                    <p className="max-w-xs text-[13.5px] leading-relaxed text-muted-foreground">The realtime whiteboard that people and their AI assistants draw on together.</p>
                </div>
                <nav className="grid grid-cols-2 gap-x-10 gap-y-2.5 text-[13.5px] text-muted-foreground sm:flex sm:flex-col">
                    {links.map(([label, href]) => (
                        <a key={href} href={href} target="_blank" rel="noreferrer" className="transition-colors hover:text-foreground">
                            {label}
                        </a>
                    ))}
                </nav>
            </div>
            <div className="mx-auto flex max-w-6xl items-center justify-between border-t border-border/60 px-[max(16px,env(safe-area-inset-left))] py-5 font-mono text-[11.5px] text-muted-foreground">
                <span>© {new Date().getFullYear()} SketchSync</span>
                <span>Open source · ISC</span>
            </div>
        </footer>
    );
}
