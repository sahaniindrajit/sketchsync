import { Toolbar } from "@/components/toolBar"
import { TooltipProvider } from "@/components/ui/tooltip"
import { activeToolState } from "@/recoil/atoms/toolBarState"
import { useCallback, useState, useRef, useEffect } from "react";
import { Layer, Stage, Image as KonvaImage } from "react-konva";
import { useRecoilState } from "recoil"

export default function Board() {
    const [activeTool, setActiveTool] = useRecoilState(activeToolState);
    const [image, setImage] = useState<HTMLImageElement>();
    const fileRef = useRef<HTMLInputElement>(null);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const stageRef = useRef<any>(null)

    const [dimensions, setDimensions] = useState({ width: window.innerWidth, height: window.innerHeight });

    useEffect(() => {
        const handleResize = () => {
            setDimensions({ width: window.innerWidth, height: window.innerHeight });
        };
        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, []);

    const handleDownload = () => {
        console.log("hi")
    }
    const handleUpload = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files?.[0]) {
            const imageUrl = URL.createObjectURL(e.target.files?.[0]);
            const image = new Image(window.innerWidth / 4, window.innerHeight / 4);
            image.src = imageUrl;
            image.onload = () => {
                setImage(image);
            };
        }
        e.target.files = null;
    }, []);

    const onUploadButtonClick = useCallback(() => {
        fileRef?.current?.click();
    }, []);

    switch (activeTool) {
        case 'image':
            break;
        case 'download':
            handleDownload();
            break;
    }

    return (
        <div>
            <TooltipProvider>
                <Toolbar
                    selectedTool={activeTool}
                    onToolSelect={setActiveTool}
                    handleUpload={handleUpload}
                    handleUploadButtonClick={onUploadButtonClick}
                    fileInputRef={fileRef}
                />
                <h1>
                    {activeTool}
                </h1>
            </TooltipProvider>
            <Stage width={dimensions.width} height={dimensions.height} ref={stageRef}>
                <Layer>
                    {
                        image && (
                            <KonvaImage image={image}
                                x={0}
                                y={0}
                                height={window.innerHeight / 2}
                                width={window.innerHeight / 2}>

                            </KonvaImage>
                        )
                    }
                </Layer>

            </Stage>

        </div>
    )
}
