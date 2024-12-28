import { Toolbar } from "@/components/toolBar"
import { TooltipProvider } from "@/components/ui/tooltip"
import { activeToolState, fillColorState, strokeColorState, strokeWidthState } from "@/recoil/atoms/toolBarState"
import { Arrow } from "@/types/shape.types";
import { KonvaEventObject } from "konva/lib/Node";
import React, { useCallback, useState, useRef } from "react";
import { Layer, Stage, Image as KonvaImage, Rect as KonvaRect, Arrow as KonvaArrow } from "react-konva";
import { useRecoilState } from "recoil"

const downloadURI = (uri: string | undefined, name: string) => {
    const link = document.createElement("a");
    link.download = name;
    link.href = uri || "";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link)
}

// eslint-disable-next-line no-empty-pattern
export const Board = React.memo(function Board({ }) {
    const [activeTool, setActiveTool] = useRecoilState(activeToolState);
    const [strokeColor, setStrokeColor] = useRecoilState(strokeColorState);
    const [strokeWidth, setStrokeWidth] = useRecoilState(strokeWidthState);
    const [fillColor, setFillColor] = useRecoilState(fillColorState);
    //const [x, setX] = useState(0);
    //const [y, setY] = useState(0);
    const [image, setImage] = useState<HTMLImageElement>();
    const [arrow, setArrow] = useState<Arrow>();
    const fileRef = useRef<HTMLInputElement>(null);
    const isPaintRef = useRef(false)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const stageRef = useRef<any>(null)


    const handleDownload = useCallback(() => {
        const dataURI = stageRef?.current?.toDataURL({ devicePixelRatio })
        downloadURI(dataURI, 'SketchSync-image.png');
    }, []);

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

    const onStageMouseDown = useCallback((e: KonvaEventObject<MouseEvent>) => {
        if (activeTool === 'select') return;
        isPaintRef.current = true;
        const stage = stageRef.current;
        const pos = stage?.getPointerPosition();
        const x = pos?.x || 0
        const y = pos?.y || 0
        switch (activeTool) {

            case 'arrow':
                setArrow({ id: '1', color: { fillColor }, strokeColor: { strokeColor }, strokeWidth: { strokeWidth }, points: [x, y, x, y] })
        }
    }, [activeTool, fillColor, strokeColor, strokeWidth]);
    const onStageMouseUp = useCallback(() => { }, []);
    const onStageMouseMove = useCallback(() => { }, []);



    return (
        <>
            <div>

                <TooltipProvider>
                    <Toolbar
                        selectedTool={activeTool}
                        onToolSelect={setActiveTool}
                        handleUpload={handleUpload}
                        handleUploadButtonClick={onUploadButtonClick}
                        handelDownload={handleDownload}
                        fileInputRef={fileRef}
                    />
                    <h1>
                        {activeTool}
                    </h1>
                </TooltipProvider>

                <Stage
                    width={window.innerWidth}
                    height={window.innerHeight}
                    ref={stageRef}
                    onMouseDown={onStageMouseDown}
                    onMouseMove={onStageMouseMove}
                    onMouseUp={onStageMouseUp}
                >
                    <Layer>
                        <KonvaRect
                            x={0}
                            y={0}
                            height={window.innerHeight}
                            width={window.innerHeight}
                            fill="white"
                            id="bg"
                        />
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
                        {
                            arrow && (
                                <KonvaArrow
                                    key={arrow.id}
                                    id={arrow.id}
                                    points={arrow.points}
                                    fill={arrow.color.fillColor}
                                    stroke={arrow.strokeColor.strokeColor}
                                    strokeWidth={arrow.strokeWidth.strokeWidth}
                                />
                            )
                        }
                    </Layer>

                </Stage>

            </div>
        </>
    )
});
