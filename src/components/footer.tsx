import { Link } from 'react-router-dom';
import { Logo } from '@/components/logo';

const groups = [
    {
        title: 'Product',
        links: [
            ['Open a board', '/board'],
            ['Connect your AI', '/#mcp'],
            ['Features', '/#features'],
        ],
    },
    {
        title: 'Open source',
        links: [
            ['Frontend on GitHub', 'https://github.com/sahaniindrajit/sketchsync'],
            ['Backend & MCP server', 'https://github.com/sahaniindrajit/sketchsync-Backend'],
            ['Report an issue', 'https://github.com/sahaniindrajit/sketchsync/issues'],
        ],
    },
    {
        title: 'Maker',
        links: [
            ['Indrajit Sahani', 'https://www.indrajitsahani.com/'],
            ['X / Twitter', 'https://x.com/sahani_indrajit'],
        ],
    },
] as const;

export default function Footer() {
    return (
        <footer className="mx-auto max-w-6xl px-[max(16px,env(safe-area-inset-left))]">
            <div className="grid gap-10 border-t border-border py-14 md:grid-cols-[1.4fr_1fr_1fr_1fr]">
                <div className="space-y-3">
                    <Logo />
                    <p className="max-w-xs text-[14px] leading-relaxed text-muted-foreground">The realtime whiteboard that people and their AI assistants draw on together.</p>
                </div>
                {groups.map((g) => (
                    <nav key={g.title} className="space-y-3" aria-label={g.title}>
                        <h3 className="text-[13px] font-semibold">{g.title}</h3>
                        <ul className="space-y-2 text-[14px] text-muted-foreground">
                            {g.links.map(([label, href]) => (
                                <li key={href}>
                                    {href.startsWith('/') ? (
                                        href.includes('#') ? (
                                            <a href={href} className="transition-colors hover:text-foreground">{label}</a>
                                        ) : (
                                            <Link to={href} className="transition-colors hover:text-foreground">{label}</Link>
                                        )
                                    ) : (
                                        <a href={href} target="_blank" rel="noreferrer" className="transition-colors hover:text-foreground">
                                            {label}
                                        </a>
                                    )}
                                </li>
                            ))}
                        </ul>
                    </nav>
                ))}
            </div>
            <div className="flex items-center justify-between border-t border-border/70 py-5 text-[12.5px] text-muted-foreground">
                <span>© {new Date().getFullYear()} SketchSync</span>
                <span>Open source under the ISC license</span>
            </div>
        </footer>
    );
}
