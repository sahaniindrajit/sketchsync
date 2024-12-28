import { Toolbar } from "@/components/toolBar"
import { TooltipProvider } from "@/components/ui/tooltip"
import { activeToolState, fillColorState, strokeColorState, strokeWidthState } from "@/recoil/atoms/toolBarState"
import { Arrow } from "@/types/shape.types";
import { KonvaEventObject } from "konva/lib/Node";
import React, { useCallback, useState, useRef } from "react";
import { Layer, Stage, Image as KonvaImage, Rect as KonvaRect, Arrow as KonvaArrow } from "react-konva";
import { useRecoilState } from "recoil"
import DrawingSettings from "./drawingSetting";

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
    const [isEmpty, setIsEmpty] = useState(true);
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
        const stage = stageRef?.current;
        const pos = stage?.getPointerPosition();
        const x = pos?.x || 0
        const y = pos?.y || 0
        setIsEmpty(false)
        switch (activeTool) {

            case 'arrow':
                setArrow({ id: '1', color: { fillColor }, strokeColor: { strokeColor }, strokeWidth: { strokeWidth }, points: [x, y, x, y] })
        }
    }, [activeTool, fillColor, strokeColor, strokeWidth]);
    const onStageMouseUp = useCallback(() => {
        isPaintRef.current = false;
    }, []);
    const onStageMouseMove = useCallback(() => {
        if (activeTool === 'select' || !isPaintRef.current) return;
        const stage = stageRef?.current;
        const pos = stage?.getPointerPosition();
        const x = pos?.x || 0
        const y = pos?.y || 0

        switch (activeTool) {

            case 'arrow':
                setArrow((prevArrow) => ({ ...prevArrow, points: [prevArrow?.points[0] || 0, prevArrow?.points[1] || 0, x, y] } as Arrow))
        }
    }, [activeTool]);



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
                <div className="absolute left-4 top-1/2 -translate-y-1/2 z-10">
                    <DrawingSettings
                        strokeColor={strokeColor}
                        backgroundColor={fillColor}
                        strokeWidth={strokeWidth}
                        onStrokeColorChange={setStrokeColor}
                        onBackgroundColorChange={setFillColor}
                        onStrokeWidthChange={setStrokeWidth}
                    />
                </div>

                {isEmpty && (
                    <div className="absolute inset-0 flex items-center justify-center text-gray-400 pointer-events-none z-10">
                        <div className="text-center">
                            <div className="text-2xl font-bold mb-2">Welcome to Drawing App</div>
                            <div className="text-sm">Pick a tool & start drawing!</div>
                        </div>
                    </div>
                )}


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
