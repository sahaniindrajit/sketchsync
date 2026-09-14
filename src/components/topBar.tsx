import { Menu } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { AppMenu, type MenuActions } from './menu';

export function TopBar({ actions }: { actions: MenuActions }) {
    const [showMenu, setShowMenu] = useState(false);
    const containerRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (!showMenu) return;
        function handleClickOutside(event: PointerEvent) {
            if (containerRef.current && !containerRef.current.contains(event.target as Node)) setShowMenu(false);
        }
        document.addEventListener('pointerdown', handleClickOutside);
        return () => document.removeEventListener('pointerdown', handleClickOutside);
    }, [showMenu]);

    return (
        <div className="fixed left-4 top-4 z-50" ref={containerRef}>
            <Button
                variant="outline"
                size="icon"
                aria-label="Menu"
                className="h-10 w-10 rounded-full bg-white shadow-md hover:bg-gray-100"
                onClick={() => setShowMenu((v) => !v)}
            >
                <Menu className="h-5 w-5" />
            </Button>
            {showMenu && <AppMenu actions={actions} onClose={() => setShowMenu(false)} />}
        </div>
    );
}
