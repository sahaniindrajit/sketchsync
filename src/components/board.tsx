import { Toolbar } from "@/components/toolBar"
import { TooltipProvider } from "@/components/ui/tooltip"
import { activeToolState, fillColorState, strokeColorState, strokeWidthState } from "@/recoil/atoms/toolBarState"
import { Arrow, Rectangle, Circle, Scribble } from "@/types/shape.types";
import { KonvaEventObject } from "konva/lib/Node";
import { v4 as uuidv4 } from "uuid";
import React, { useCallback, useState, useRef } from "react";
import { Layer, Stage, Image as KonvaImage, Rect as KonvaRect, Arrow as KonvaArrow, Circle as KonvaCircle, Line as KonvaScribble, Transformer } from "react-konva";
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
    const [arrow, setArrow] = useState<Arrow[]>([]);
    const [rect, setRect] = useState<Rectangle[]>([]);
    const [circle, setCircle] = useState<Circle[]>([]);
    const [scribble, setScribble] = useState<Scribble[]>([])
    const fileRef = useRef<HTMLInputElement>(null);
    const isPaintRef = useRef(false);
    const currentShapeRef = useRef<string>();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const stageRef = useRef<any>(null)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const transformerRef = useRef<any>(null);


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
        const id = uuidv4();
        currentShapeRef.current = id;
        setIsEmpty(false)
        switch (activeTool) {

            case 'arrow':
                setArrow((prevArrows) => [...prevArrows, { id: id, color: { fillColor }, strokeColor: { strokeColor }, strokeWidth: { strokeWidth }, points: [x, y, x, y] }])
                break;
            case 'rectangle':
                setRect((prevRects) => [...prevRects, { id: id, color: { fillColor }, strokeColor: { strokeColor }, strokeWidth: { strokeWidth }, height: 1, width: 1, x, y }])
                break;
            case 'circle':
                setCircle((prevCircles) => [...prevCircles, { id: id, color: { fillColor }, strokeColor: { strokeColor }, strokeWidth: { strokeWidth }, radius: 1, x, y }])
                break;
            case 'pencil':
                setScribble((prevScribbles) => [...prevScribbles, { id: id, strokeColor: { strokeColor }, strokeWidth: { strokeWidth }, points: [x, y] }])
                break;


        }
    }, [activeTool, fillColor, strokeColor, strokeWidth]);
    const onStageMouseUp = useCallback(() => {
        isPaintRef.current = false;
    }, []);
    const onStageMouseMove = useCallback(() => {
        if (activeTool === 'select' || !isPaintRef.current) return;
        const stage = stageRef?.current;
        const id = currentShapeRef.current;
        const pos = stage?.getPointerPosition();
        const x = pos?.x || 0
        const y = pos?.y || 0

        switch (activeTool) {

            case 'arrow':
                setArrow((prevArrows) =>
                    prevArrows.map((prevArrow) =>
                        prevArrow.id === id ?
                            { ...prevArrow, points: [prevArrow?.points[0] || 0, prevArrow?.points[1] || 0, x, y] }
                            : prevArrow

                    )
                )
                break;
            case 'rectangle':
                setRect((preRects) =>
                    preRects.map((prevRect) =>
                        prevRect.id === id ?
                            { ...prevRect, height: y - (prevRect?.y || 0), width: x - (prevRect?.x || 0) }
                            : prevRect
                    ))
                break;
            case 'circle':
                setCircle((prevCircles) =>
                    prevCircles.map((prevCircle) =>
                        prevCircle.id === id ?
                            { ...prevCircle, radius: ((x - (prevCircle?.x || 1)) ** 2 + (y - (prevCircle?.y || 1)) ** 2) ** 0.5 }
                            : prevCircle
                    ))
                break;
            case 'pencil':
                setScribble((prevScribbles) =>
                    prevScribbles.map((prevScribble) =>
                        prevScribble.id === id ?
                            { ...prevScribble, points: [...(prevScribble?.points ?? []), x, y] }
                            : prevScribble
                    ))
                break;
        }
    }, [activeTool]);

    const onShapeClick = useCallback((e: KonvaEventObject<MouseEvent>) => {
        if (activeTool !== 'select') return;
        const currentTarget = e.currentTarget;
        transformerRef?.current?.node(currentTarget)
    }, [activeTool])



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
                            <div className="text-2xl font-bold mb-2">Welcome to SketchSync</div>
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
                                    width={window.innerHeight / 2}
                                    onClick={onShapeClick}
                                />
                            )
                        }
                        {
                            arrow.map((arrow) => (
                                <KonvaArrow
                                    key={arrow.id}
                                    id={arrow.id}
                                    points={arrow.points}
                                    fill={arrow.color.fillColor}
                                    stroke={arrow.strokeColor.strokeColor}
                                    strokeWidth={arrow.strokeWidth.strokeWidth}
                                    onClick={onShapeClick}
                                />
                            ))
                        }
                        {
                            rect.map((rect) => (
                                <KonvaRect
                                    key={rect.id}
                                    id={rect.id}
                                    fill={rect.color.fillColor}
                                    stroke={rect.strokeColor.strokeColor}
                                    strokeWidth={rect.strokeWidth.strokeWidth}
                                    height={rect.height}
                                    width={rect.width}
                                    x={rect.x}
                                    y={rect.y}
                                    onClick={onShapeClick}
                                />
                            ))
                        }
                        {
                            circle.map((circle) => (
                                <KonvaCircle
                                    key={circle.id}
                                    id={circle.id}
                                    fill={circle.color.fillColor}
                                    stroke={circle.strokeColor.strokeColor}
                                    strokeWidth={circle.strokeWidth.strokeWidth}
                                    radius={circle.radius}
                                    x={circle.x}
                                    y={circle.y}
                                    onClick={onShapeClick}
                                />
                            ))
                        }
                        {
                            scribble.map((scribble) => (
                                <KonvaScribble
                                    key={scribble.id}
                                    id={scribble.id}
                                    stroke={scribble.strokeColor.strokeColor}
                                    strokeWidth={scribble.strokeWidth.strokeWidth}
                                    points={scribble.points}
                                    lineCap="round"
                                    lineJoin="round"
                                    onClick={onShapeClick}
                                />
                            ))
                        }

                        <Transformer ref={transformerRef} />
                    </Layer>

                </Stage>

            </div>
        </>
    )
});
