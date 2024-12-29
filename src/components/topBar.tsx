'use client'

import { useState, useEffect, useRef } from 'react'
import { Menu } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { AppMenu } from './menu'

interface MenuProps {
    handleExport: () => void
    handleLiveCollab: () => void
    handleReset: () => void
}

export function TopBar({ handleExport, handleLiveCollab, handleReset }: MenuProps) {
    const [showMenu, setShowMenu] = useState(false)
    const menuRef = useRef<HTMLDivElement>(null)
    const buttonRef = useRef<HTMLButtonElement>(null)

    useEffect(() => {
        function handleClickOutside(event: MouseEvent) {
            if (menuRef.current && !menuRef.current.contains(event.target as Node) &&
                buttonRef.current && !buttonRef.current.contains(event.target as Node)) {
                setShowMenu(false)
            }
        }

        document.addEventListener('mousedown', handleClickOutside)
        return () => document.removeEventListener('mousedown', handleClickOutside)
    }, [])

    const toggleMenu = () => {
        setShowMenu(!showMenu)
    }

    return (
        <div className="fixed top-4 left-4 z-50">
            <Button
                ref={buttonRef}
                variant="outline"
                size="icon"
                className="w-10 h-10 rounded-full bg-white shadow-md hover:bg-gray-100"
                onClick={toggleMenu}
            >
                <Menu className="h-5 w-5" />
                <span className="sr-only">Menu</span>
            </Button>
            {showMenu && <AppMenu handleExport={handleExport} handleLiveCollab={handleLiveCollab} handleReset={handleReset} onClose={() => setShowMenu(false)} />}
        </div>
    )
}

