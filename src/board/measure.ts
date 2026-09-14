import type { Measurer } from '@/shared/geometry';
import { DEFAULTS } from '@/shared/protocol';

export const FONT_FAMILY = `${DEFAULTS.fontFamily}, Arial, sans-serif`;

let ctx: CanvasRenderingContext2D | null = null;
function context() {
    if (!ctx) ctx = document.createElement('canvas').getContext('2d');
    return ctx;
}

export function measureTextWidth(text: string, fontSize: number, fontWeight: 'normal' | 'bold' = 'normal'): number {
    const c = context();
    if (!c) return text.length * fontSize * 0.55;
    c.font = `${fontWeight === 'bold' ? 'bold ' : ''}${fontSize}px ${FONT_FAMILY}`;
    return c.measureText(text).width;
}

/** Word-wraps like Konva.Text with wrap="word". Linear in text length. */
export function wrapLines(text: string, fontSize: number, fontWeight: 'normal' | 'bold', width?: number): string[] {
    const lines: string[] = [];
    for (const paragraph of text.split('\n')) {
        if (!width) {
            lines.push(paragraph);
            continue;
        }
        let line = '';
        let lineWidth = 0;
        for (const token of paragraph.split(/(\s+)/)) {
            if (!token) continue;
            const tokenWidth = measureTextWidth(token, fontSize, fontWeight);
            const isSpace = /^\s+$/.test(token);
            if (line && !isSpace && lineWidth + tokenWidth > width) {
                lines.push(line.trimEnd());
                line = token;
                lineWidth = tokenWidth;
            } else if (!(isSpace && !line)) {
                line += token;
                lineWidth += tokenWidth;
            }
        }
        lines.push(line.trimEnd());
    }
    return lines;
}

/** Text/math sizes cached by the renderers (math sizes are filled in once rendered). */
export const mathSizes = new Map<string, { width: number; height: number }>();
export const mathKey = (latex: string, fontSize: number, displayMode: boolean) => `${displayMode ? 'D' : 'I'}|${fontSize}|${latex}`;

export const browserMeasurer: Measurer = {
    text(shape) {
        const lines = wrapLines(shape.text || ' ', shape.fontSize, shape.fontWeight, shape.width);
        const width = shape.width ?? Math.max(...lines.map((l) => measureTextWidth(l, shape.fontSize, shape.fontWeight)), 1);
        return { width, height: lines.length * shape.fontSize * DEFAULTS.lineHeight };
    },
    math(shape) {
        return (
            mathSizes.get(mathKey(shape.latex, shape.fontSize, shape.displayMode)) ?? {
                width: Math.max(1, shape.latex.length) * shape.fontSize * 0.45,
                height: shape.fontSize * 1.6,
            }
        );
    },
};
