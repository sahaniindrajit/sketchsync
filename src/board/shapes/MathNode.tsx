import { useEffect, useState } from 'react';
import { Image as KonvaImage, Rect, Text } from 'react-konva';
import type { MathShape } from '@/shared/protocol';
import { FONT_FAMILY, mathKey, mathSizes } from '../measure';

type Loaded = { image: HTMLImageElement; width: number; height: number; error?: string };

const imageCache = new Map<string, Promise<Loaded>>();
let rendererPromise: Promise<typeof import('../math/renderLatex')> | null = null;

function loadMath(shape: MathShape): Promise<Loaded> {
    const key = `${mathKey(shape.latex, shape.fontSize, shape.displayMode)}|${shape.strokeColor}`;
    let cached = imageCache.get(key);
    if (!cached) {
        rendererPromise ??= import('../math/renderLatex');
        cached = rendererPromise.then(async ({ loadMathJax, renderLatex }) => {
            const mj = await loadMathJax();
            return new Promise<Loaded>((resolve, reject) => {
                    const rendered = renderLatex(mj, shape.latex, shape.fontSize, shape.displayMode, shape.strokeColor);
                    if (!rendered.svg || rendered.error) return reject(new Error(rendered.error ?? 'Invalid LaTeX'));
                    mathSizes.set(mathKey(shape.latex, shape.fontSize, shape.displayMode), { width: rendered.width, height: rendered.height });
                    const image = new window.Image();
                    image.onload = () => resolve({ image, width: rendered.width, height: rendered.height, error: rendered.error });
                    image.onerror = () => reject(new Error('Could not draw formula'));
                    image.src = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(rendered.svg)}`;
            });
        });
        // Allow retrying after a failed load (e.g. offline).
        cached.catch(() => imageCache.delete(key));
        imageCache.set(key, cached);
        if (imageCache.size > 500) imageCache.delete(imageCache.keys().next().value!);
    }
    return cached;
}

/** Renders LaTeX with MathJax (lazy-loaded); shows the source while loading or on error. */
export function MathNode({ shape }: { shape: MathShape }) {
    const [state, setState] = useState<{ key: string; loaded?: Loaded; error?: string } | null>(null);
    const key = `${mathKey(shape.latex, shape.fontSize, shape.displayMode)}|${shape.strokeColor}`;

    useEffect(() => {
        let cancelled = false;
        loadMath(shape).then(
            (loaded) => !cancelled && setState({ key, loaded }),
            (err: Error) => !cancelled && setState({ key, error: err.message }),
        );
        return () => {
            cancelled = true;
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [key]);

    const current = state?.key === key ? state : null;
    if (current?.loaded) {
        return (
            <>
                <Rect width={current.loaded.width} height={current.loaded.height} fill="rgba(0,0,0,0)" />
                <KonvaImage image={current.loaded.image} width={current.loaded.width} height={current.loaded.height} />
            </>
        );
    }
    const fallbackWidth = Math.max(40, shape.latex.length * shape.fontSize * 0.45);
    return (
        <>
            <Rect width={fallbackWidth} height={shape.fontSize * 1.6} fill="rgba(0,0,0,0)" />
            <Text text={shape.latex} fontSize={shape.fontSize * 0.8} fontFamily="monospace" fill={current?.error ? '#e03131' : shape.strokeColor} opacity={current?.error ? 1 : 0.5} />
            {current?.error && <Text y={shape.fontSize * 1.1} text={current.error} fontSize={12} fontFamily={FONT_FAMILY} fill="#e03131" />}
        </>
    );
}
