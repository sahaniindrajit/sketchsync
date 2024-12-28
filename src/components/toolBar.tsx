import { Square, Circle, ArrowRight, Pencil, Type, Image, Hand, Eraser, Download } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'

const tools = [
    { id: 'select', icon: Hand, label: 'Select' },
    { id: 'rectangle', icon: Square, label: 'Rectangle' },
    { id: 'circle', icon: Circle, label: 'Circle' },
    { id: 'arrow', icon: ArrowRight, label: 'Arrow' },
    { id: 'pencil', icon: Pencil, label: 'Pencil' },
    { id: 'text', icon: Type, label: 'Text' },
    { id: 'image', icon: Image, label: 'Image' },
    { id: 'eraser', icon: Eraser, label: 'Eraser' },
    { id: 'download', icon: Download, label: 'Download' },
]

interface ToolbarProps {
    selectedTool: string
    onToolSelect: (tool: string) => void
    handleUpload: (e: React.ChangeEvent<HTMLInputElement>) => void
    handleUploadButtonClick: () => void
    handelDownload: () => void
    fileInputRef: React.RefObject<HTMLInputElement>
}

export function Toolbar({ selectedTool, onToolSelect, handleUpload, handleUploadButtonClick, handelDownload, fileInputRef }: ToolbarProps) {
    return (
        <div className="fixed top-4 left-1/2 -translate-x-1/2 flex items-center gap-1 p-1 bg-white border rounded-lg shadow-sm z-10">
            {tools.map((tool) => (
                <Tooltip key={tool.id}>
                    <TooltipTrigger asChild>
                        {(tool.id) === 'image' && (
                            <>
                                <input
                                    type="file"
                                    ref={fileInputRef}
                                    style={{ display: "none" }}
                                    onChange={handleUpload}
                                    accept="image/*"
                                />
                                <Button
                                    variant={selectedTool === tool.id ? "secondary" : "ghost"}
                                    size="icon"
                                    onClick={() => {
                                        onToolSelect(tool.id);
                                        handleUploadButtonClick()
                                    }}
                                    className="w-9 h-9"
                                >
                                    <tool.icon className="h-5 w-5" />
                                    <span className="sr-only">{tool.label}</span>
                                </Button>
                            </>
                        ) || ((tool.id === 'download') && (
                            <>
                                <Button
                                    variant={selectedTool === tool.id ? "secondary" : "ghost"}
                                    size="icon"
                                    onClick={() => {
                                        onToolSelect(tool.id);
                                        handelDownload()
                                    }}
                                    className="w-9 h-9"
                                >
                                    <tool.icon className="h-5 w-5" />
                                    <span className="sr-only">{tool.label}</span>
                                </Button>
                            </>
                        )) ||
                            <Button
                                variant={selectedTool === tool.id ? "secondary" : "ghost"}
                                size="icon"
                                onClick={() => onToolSelect(tool.id)}
                                className="w-9 h-9"
                            >
                                <tool.icon className="h-5 w-5" />
                                <span className="sr-only">{tool.label}</span>
                            </Button>
                        }
                    </TooltipTrigger>
                    <TooltipContent>
                        <p>{tool.label}</p>
                    </TooltipContent>
                </Tooltip>
            ))}
        </div>
    )
}

