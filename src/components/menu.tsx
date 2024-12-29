'use client'

import React from 'react'
import { ImageIcon, Users, HelpCircle, Trash2, Github, Twitter, Briefcase } from 'lucide-react'

interface MenuProps {
    onClose: () => void
    handleExport: () => void
    handleLiveCollab: () => void
    handleReset: () => void

}

export const AppMenu = React.memo<MenuProps>(function AppMenu({ handleExport, handleLiveCollab, handleReset }) {


    const handleHelp = () => {
        window.open('https://github.com/sahaniindrajit/sketchsync/issues', '_blank');
    };

    const handleGitHub = () => {
        window.open('https://github.com/sahaniindrajit/sketchsync', '_blank');
    };

    const handleTwitter = () => {
        window.open('https://x.com/sahani_indrajit', '_blank');
    };

    const handelPortfolio = () => {
        window.open('https://www.indrajitsahani.com/', '_blank');
    }

    const menuItems = [
        { icon: ImageIcon, label: 'Export image...', onClick: handleExport },
        { icon: Users, label: 'Live collaboration...', highlight: true, onClick: handleLiveCollab },
        { icon: HelpCircle, label: 'Help', onClick: handleHelp },
        { icon: Trash2, label: 'Reset the canvas', onClick: handleReset },
        { icon: Github, label: 'GitHub', highlight: true, onClick: handleGitHub },
        { icon: Twitter, label: 'Follow us', onClick: handleTwitter },
        { icon: Briefcase, label: 'Developer Portfolio', highlight: true, onClick: handelPortfolio }
    ];

    return (
        <div
            className="absolute top-0 left-0 mt-14 w-64 bg-white rounded-lg shadow-lg border py-2 z-50"
        >
            <div className="px-1">
                {menuItems.map((item) => (
                    <button
                        key={item.label}
                        className={`w-full flex items-center gap-2 px-3 py-1.5 text-sm hover:bg-gray-100 rounded-md ${item.highlight ? 'text-indigo-600' : 'text-gray-700'
                            }`}

                        onClick={item.onClick}
                    >
                        <item.icon className="h-4 w-4" />
                        <span className="flex-1 text-left">{item.label}</span>

                    </button>
                ))}
            </div>

        </div>
    )
})

