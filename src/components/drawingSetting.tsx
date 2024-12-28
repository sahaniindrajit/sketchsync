'use client'

import { useState } from 'react'
import { Slider } from '@/components/ui/slider'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card } from '@/components/ui/card'
import { Plus, Copy } from 'lucide-react'

interface DrawingSettingsProps {
    strokeColor: string
    backgroundColor: string
    strokeWidth: number
    onStrokeColorChange: (color: string) => void
    onBackgroundColorChange: (color: string) => void
    onStrokeWidthChange: (width: number) => void
}

const strokeColors = ['#000000', '#FF0000', '#00FF00', '#0000FF', '#FFA500', '#FF8C00']
const backgroundColors = ['#FFFFFF', '#FFE4E1', '#90EE90', '#ADD8E6', '#FFFFE0', '#98FB98']
const colors = [
    ['#FFFFFF', '#F8F8F8', '#333333', '#000000', '#8B4513'],
    ['#008080', '#4682B4', '#4B0082', '#FF1493', '#FF69B4'],
    ['#228B22', '#32CD32', '#FFA500', '#FF4500', '#FF0000']
]
const shades = ['#FFF5E6', '#FFE6CC', '#FFD699', '#FFC266', '#FFAD33']

export default function DrawingSettings({
    strokeColor,
    backgroundColor,
    strokeWidth,
    onStrokeColorChange,
    onBackgroundColorChange,
    onStrokeWidthChange
}: DrawingSettingsProps) {
    const [hexCode, setHexCode] = useState('#f08c00')
    const [showColorPicker, setShowColorPicker] = useState<'stroke' | 'background' | null>(null)

    const handleColorSelect = (color: string) => {
        if (showColorPicker === 'stroke') {
            onStrokeColorChange(color)
        } else if (showColorPicker === 'background') {
            onBackgroundColorChange(color)
        }

    }

    return (
        <div className="flex flex-col gap-4">
            <Card className="p-4 w-64 space-y-6 bg-white/90 backdrop-blur-sm shadow-lg">
                <div className="space-y-2">
                    <h3 className="text-sm font-medium">Stroke</h3>
                    <div className="flex flex-wrap gap-2">
                        {strokeColors.map((color) => (
                            <button
                                key={color}
                                className={`w-8 h-8 rounded-lg border-2 ${strokeColor === color ? 'border-blue-500' : 'border-transparent'
                                    }`}
                                style={{ backgroundColor: color }}
                                onClick={() => onStrokeColorChange(color)}
                            />
                        ))}
                        <Button
                            variant="outline"
                            size="icon"
                            className="w-8 h-8"
                            onClick={() => setShowColorPicker(prev => prev === 'stroke' ? null : 'stroke')}
                        >
                            <Plus className="h-4 w-4" />
                        </Button>
                    </div>
                </div>

                <div className="space-y-2">
                    <h3 className="text-sm font-medium">Background</h3>
                    <div className="flex flex-wrap gap-2">
                        {backgroundColors.map((color) => (
                            <button
                                key={color}
                                className={`w-8 h-8 rounded-lg border-2 ${backgroundColor === color ? 'border-blue-500' : 'border-transparent'
                                    }`}
                                style={{ backgroundColor: color }}
                                onClick={() => onBackgroundColorChange(color)}
                            />
                        ))}
                        <Button
                            variant="outline"
                            size="icon"
                            className="w-8 h-8"
                            onClick={() => setShowColorPicker(prev => prev === 'background' ? null : 'background')}
                        >
                            <Plus className="h-4 w-4" />
                        </Button>
                    </div>
                </div>

                <div className="space-y-2">
                    <h3 className="text-sm font-medium">Stroke width</h3>
                    <Slider
                        value={[strokeWidth]}
                        min={1}
                        max={20}
                        step={1}
                        className="w-full"
                        onValueChange={(value) => onStrokeWidthChange(value[0])}
                    />
                </div>
            </Card>

            {showColorPicker && (
                <Card className="p-4 w-64 space-y-6 bg-white/90 backdrop-blur-sm shadow-lg">
                    <div className="space-y-2">
                        <h3 className="text-sm font-medium">Colors</h3>
                        <div className="grid grid-cols-5 gap-2">
                            {colors.flat().map((color) => (
                                <button
                                    key={color}
                                    className="w-8 h-8 rounded-lg border-2 border-transparent hover:border-blue-500"
                                    style={{ backgroundColor: color }}
                                    onClick={() => handleColorSelect(color)}
                                />
                            ))}
                        </div>
                    </div>

                    <div className="space-y-2">
                        <h3 className="text-sm font-medium">Shades</h3>
                        <div className="flex gap-2">
                            {shades.map((shade) => (
                                <button
                                    key={shade}
                                    className="w-8 h-8 rounded-lg border-2 border-transparent hover:border-blue-500"
                                    style={{ backgroundColor: shade }}
                                    onClick={() => handleColorSelect(shade)}
                                />
                            ))}
                        </div>
                    </div>

                    <div className="space-y-2">
                        <h3 className="text-sm font-medium">Hex code</h3>
                        <div className="flex gap-2">
                            <Input
                                value={hexCode}
                                onChange={(e) => setHexCode(e.target.value)}
                                className="font-mono"
                            />
                            <Button
                                variant="outline"
                                size="icon"
                                className="flex-shrink-0"
                                onClick={() => handleColorSelect(hexCode)}
                            >
                                <Copy className="h-4 w-4" />
                            </Button>
                        </div>
                    </div>
                </Card>
            )}
        </div>
    )
}

