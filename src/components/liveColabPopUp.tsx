'use client'

import { X, Copy } from 'lucide-react'
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { useState } from 'react'
import { useLocation } from 'react-router-dom'

export default function LiveCollabPopUp() {
    const [isOpen, setIsOpen] = useState(true);
    const location = useLocation();
    const { search } = location;

    const handleCopyLink = () => {
        navigator.clipboard.writeText(`https://sketchsync-sigma.vercel.app/live${search}`)
    }

    const onClose = () => {
        setIsOpen(false)
    }

    if (!isOpen) return null

    return (
        <div className="min-h-screen flex items-center justify-center bg-gray-100/50 p-4">
            <Card className="w-full max-w-xl relative">
                <Button
                    variant="ghost"
                    size="icon"
                    className="absolute right-2 top-2 text-gray-500 hover:text-gray-700"
                    onClick={onClose}
                >
                    <X className="h-4 w-4" />
                </Button>

                <CardContent className="p-6 space-y-6">
                    <h2 className="text-2xl font-semibold">Live collaboration</h2>

                    <div className="space-y-2">
                        <label htmlFor="link" className="block text-sm font-medium text-gray-700">
                            Link
                        </label>
                        <div className="flex gap-2">
                            <Input
                                id="link"
                                value={`live${search}`}
                                readOnly
                                className="bg-gray-50"
                            />
                            <Button
                                onClick={handleCopyLink}
                                className="flex-shrink-0 bg-indigo-500 hover:bg-indigo-600"
                            >
                                <Copy className="w-4 h-4 mr-2" />
                                Copy link
                            </Button>
                        </div>
                    </div>
                </CardContent>
            </Card>
        </div>
    )
}

