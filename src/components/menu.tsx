import { Bot, Briefcase, FilePlus, Github, HelpCircle, ImageIcon, Trash2, Twitter, Users } from 'lucide-react';
import React from 'react';

export interface MenuActions {
    onExport: () => void;
    onShare: () => void;
    onConnectAi: () => void;
    onNewBoard: () => void;
    onReset: () => void;
}

export const AppMenu = React.memo(function AppMenu({ actions, onClose }: { actions: MenuActions; onClose: () => void }) {
    const open = (url: string) => window.open(url, '_blank', 'noopener');
    const menuItems = [
        { icon: ImageIcon, label: 'Export image', onClick: actions.onExport },
        { icon: Users, label: 'Share & collaborate', highlight: true, onClick: actions.onShare },
        { icon: Bot, label: 'Connect your AI', highlight: true, onClick: actions.onConnectAi },
        { icon: FilePlus, label: 'New board', onClick: actions.onNewBoard },
        { icon: Trash2, label: 'Reset the canvas', onClick: actions.onReset },
        { icon: HelpCircle, label: 'Help', onClick: () => open('https://github.com/sahaniindrajit/sketchsync/issues') },
        { icon: Github, label: 'GitHub', onClick: () => open('https://github.com/sahaniindrajit/sketchsync') },
        { icon: Twitter, label: 'Follow us', onClick: () => open('https://x.com/sahani_indrajit') },
        { icon: Briefcase, label: 'Developer Portfolio', onClick: () => open('https://www.indrajitsahani.com/') },
    ];

    return (
        <div className="absolute left-0 top-0 z-50 mt-12 w-60 rounded-lg border bg-white py-2 shadow-lg" role="menu">
            <div className="px-1">
                {menuItems.map((item) => (
                    <button
                        key={item.label}
                        role="menuitem"
                        className={`flex w-full items-center gap-2 rounded-md px-3 py-1.5 text-sm hover:bg-gray-100 ${item.highlight ? 'text-indigo-600' : 'text-gray-700'}`}
                        onClick={() => {
                            onClose();
                            item.onClick();
                        }}
                    >
                        <item.icon className="h-4 w-4" />
                        <span className="flex-1 text-left">{item.label}</span>
                    </button>
                ))}
            </div>
        </div>
    );
});
