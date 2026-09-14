import type Konva from 'konva';
import React, { useEffect, useState } from 'react';
import { Arrow, Circle, Ellipse, Group, Image as KonvaImage, Line, Rect, Text } from 'react-konva';
import { arrowHeadSize, diamondPoints, isDotStroke, polylineMidpoint, resolveLinePoints } from '@/shared/geometry';
import { DEFAULTS, type LineShape, type Shape, type TextLabel } from '@/shared/protocol';
import { FONT_FAMILY, measureTextWidth } from '../measure';
import { MathNode } from './MathNode';

export interface ShapeNodeProps {
    shape: Shape;
    /** Binding targets of a line/arrow (passed separately so memoization notices when they move). */
    startTarget?: Shape;
    endTarget?: Shape;
    draggable: boolean;
    hidden: boolean;
    hideLabel: boolean;
    onDragMove: (e: Konva.KonvaEventObject<DragEvent>) => void;
    onDragEnd: (e: Konva.KonvaEventObject<DragEvent>) => void;
    onTransformEnd: (e: Konva.KonvaEventObject<Event>) => void;
}

const fillOf = (fill: string) => (fill === 'transparent' ? 'rgba(0,0,0,0)' : fill);

/** Group origin for a shape; bound lines draw in absolute coordinates. */
export function shapeOrigin(shape: Shape): { x: number; y: number } {
    if ((shape.type === 'line' || shape.type === 'arrow') && (shape.startBinding || shape.endBinding)) return { x: 0, y: 0 };
    return { x: shape.x, y: shape.y };
}

export const ShapeNode = React.memo(function ShapeNode(props: ShapeNodeProps) {
    const { shape, draggable, hidden, onDragMove, onDragEnd, onTransformEnd } = props;
    const origin = shapeOrigin(shape);
    const isBoundLine = (shape.type === 'line' || shape.type === 'arrow') && origin.x === 0 && origin.y === 0 && (shape.startBinding || shape.endBinding);
    return (
        <Group
            id={shape.id}
            name="shape"
            x={origin.x}
            y={origin.y}
            rotation={isBoundLine ? 0 : shape.rotation}
            opacity={shape.opacity}
            draggable={draggable}
            visible={!hidden}
            onDragMove={onDragMove}
            onDragEnd={onDragEnd}
            onTransformEnd={onTransformEnd}
        >
            <ShapeBody {...props} />
        </Group>
    );
});

function ShapeBody({ shape, startTarget, endTarget, hideLabel }: ShapeNodeProps) {
    const getShape = (id: string) => (id === startTarget?.id ? startTarget : id === endTarget?.id ? endTarget : undefined);
    switch (shape.type) {
        case 'rect':
            return (
                <>
                    <Rect
                        width={shape.width}
                        height={shape.height}
                        cornerRadius={shape.cornerRadius}
                        fill={fillOf(shape.fillColor)}
                        stroke={shape.strokeColor}
                        strokeWidth={shape.strokeWidth}
                        strokeEnabled={shape.strokeWidth > 0}
                        hitStrokeWidth={Math.max(12, shape.strokeWidth)}
                    />
                    {!hideLabel && <BoxLabel label={shape.label} width={shape.width} height={shape.height} fallbackColor={shape.strokeColor} />}
                </>
            );
        case 'ellipse':
            return (
                <>
                    <Ellipse
                        x={shape.width / 2}
                        y={shape.height / 2}
                        radiusX={Math.abs(shape.width / 2)}
                        radiusY={Math.abs(shape.height / 2)}
                        fill={fillOf(shape.fillColor)}
                        stroke={shape.strokeColor}
                        strokeWidth={shape.strokeWidth}
                        strokeEnabled={shape.strokeWidth > 0}
                        hitStrokeWidth={Math.max(12, shape.strokeWidth)}
                    />
                    {!hideLabel && <BoxLabel label={shape.label} width={shape.width} height={shape.height} fallbackColor={shape.strokeColor} />}
                </>
            );
        case 'diamond':
            return (
                <>
                    <Line
                        points={diamondPoints(shape.width, shape.height)}
                        closed
                        lineJoin="round"
                        fill={fillOf(shape.fillColor)}
                        stroke={shape.strokeColor}
                        strokeWidth={shape.strokeWidth}
                        strokeEnabled={shape.strokeWidth > 0}
                        hitStrokeWidth={Math.max(12, shape.strokeWidth)}
                    />
                    {!hideLabel && (
                        <BoxLabel label={shape.label} width={shape.width} height={shape.height} fallbackColor={shape.strokeColor} inset={0.2} />
                    )}
                </>
            );
        case 'line':
        case 'arrow':
            return <LinearBody shape={shape} getShape={getShape} hideLabel={hideLabel} />;
        case 'freehand':
            if (isDotStroke(shape.points)) {
                return <Circle x={shape.points[0] ?? 0} y={shape.points[1] ?? 0} radius={Math.max(1, shape.strokeWidth / 2)} fill={shape.strokeColor} hitStrokeWidth={12} />;
            }
            return (
                <Line
                    points={shape.points}
                    stroke={shape.strokeColor}
                    strokeWidth={shape.strokeWidth}
                    tension={DEFAULTS.freehandTension}
                    lineCap="round"
                    lineJoin="round"
                    hitStrokeWidth={Math.max(12, shape.strokeWidth)}
                    perfectDrawEnabled={false}
                />
            );
        case 'text':
            return (
                <Text
                    text={shape.text || ' '}
                    fontSize={shape.fontSize}
                    fontFamily={FONT_FAMILY}
                    fontStyle={shape.fontWeight === 'bold' ? 'bold' : 'normal'}
                    fill={shape.strokeColor}
                    width={shape.width}
                    wrap={shape.width ? 'word' : 'none'}
                    align={shape.align}
                    lineHeight={DEFAULTS.lineHeight}
                />
            );
        case 'math':
            return <MathNode shape={shape} />;
        case 'image':
            return <ImageBody src={shape.src} width={shape.width} height={shape.height} />;
    }
}

function BoxLabel({ label, width, height, fallbackColor, inset = 0 }: { label?: TextLabel; width: number; height: number; fallbackColor: string; inset?: number }) {
    if (!label?.text) return null;
    const padX = Math.abs(width) * inset + 8;
    const padY = Math.abs(height) * inset + 4;
    return (
        <Text
            x={padX}
            y={padY}
            width={Math.max(1, Math.abs(width) - padX * 2)}
            height={Math.max(1, Math.abs(height) - padY * 2)}
            text={label.text}
            fontSize={label.fontSize ?? DEFAULTS.labelFontSize}
            fontFamily={FONT_FAMILY}
            fill={label.color ?? fallbackColor}
            align="center"
            verticalAlign="middle"
            wrap="word"
            lineHeight={DEFAULTS.lineHeight}
            listening={false}
        />
    );
}

function LinearBody({ shape, getShape, hideLabel }: { shape: LineShape; getShape: (id: string) => Shape | undefined; hideLabel: boolean }) {
    const bound = !!(shape.startBinding || shape.endBinding);
    const points = bound ? resolveLinePoints(shape, getShape) : shape.points;
    const head = arrowHeadSize(shape.strokeWidth);
    const common = {
        points,
        stroke: shape.strokeColor,
        strokeWidth: shape.strokeWidth,
        lineCap: 'round' as const,
        lineJoin: 'round' as const,
        hitStrokeWidth: Math.max(14, shape.strokeWidth),
    };
    const label = shape.label?.text && !hideLabel ? shape.label : null;
    let labelNode: React.ReactNode = null;
    if (label) {
        const mid = polylineMidpoint(points);
        const fontSize = label.fontSize ?? DEFAULTS.labelFontSize - 2;
        const lines = label.text.split('\n');
        const w = Math.max(...lines.map((l) => measureTextWidth(l, fontSize))) + 8;
        const h = lines.length * fontSize * DEFAULTS.lineHeight + 4;
        labelNode = (
            <Group x={mid.x - w / 2} y={mid.y - h / 2} listening={false}>
                <Rect width={w} height={h} fill="#ffffff" cornerRadius={3} />
                <Text
                    x={4}
                    y={2}
                    text={label.text}
                    fontSize={fontSize}
                    fontFamily={FONT_FAMILY}
                    fill={label.color ?? shape.strokeColor}
                    lineHeight={DEFAULTS.lineHeight}
                    align="center"
                />
            </Group>
        );
    }
    return (
        <>
            {shape.type === 'arrow' ? (
                <Arrow {...common} pointerLength={head} pointerWidth={head} fill={shape.strokeColor} />
            ) : (
                <Line {...common} />
            )}
            {labelNode}
        </>
    );
}

const imageCache = new Map<string, HTMLImageElement>();

function useHtmlImage(src: string): HTMLImageElement | null {
    const [image, setImage] = useState<HTMLImageElement | null>(() => {
        const cached = imageCache.get(src);
        return cached?.complete ? cached : null;
    });
    useEffect(() => {
        let cancelled = false;
        let img = imageCache.get(src);
        if (!img) {
            img = new window.Image();
            img.src = src;
            imageCache.set(src, img);
            if (imageCache.size > 200) imageCache.delete(imageCache.keys().next().value!);
        }
        if (img.complete && img.naturalWidth) {
            setImage(img);
            return;
        }
        const done = () => !cancelled && setImage(img!);
        img.addEventListener('load', done);
        return () => {
            cancelled = true;
            img!.removeEventListener('load', done);
        };
    }, [src]);
    return image;
}

function ImageBody({ src, width, height }: { src: string; width: number; height: number }) {
    const image = useHtmlImage(src);
    if (!image) return <Rect width={width} height={height} fill="#f3f4f6" stroke="#d1d5db" dash={[6, 4]} />;
    return <KonvaImage image={image} width={width} height={height} />;
}
