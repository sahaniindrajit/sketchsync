/**
 * LaTeX → SVG with MathJax, mirroring sketchsync-Backend/src/render/math.ts so
 * the canvas and the AI's rendered image agree on sizes. Uses MathJax's
 * self-contained browser bundle, loaded on first use.
 */
import mathjaxUrl from 'mathjax-full/es5/tex-svg-full.js?url';

export interface RenderedMath {
    svg: string;
    width: number;
    height: number;
    error?: string;
}

interface MathJaxGlobal {
    tex2svg: (latex: string, options: { display: boolean; em: number; ex: number; containerWidth: number }) => unknown;
    startup: { promise: Promise<void>; adaptor: { outerHTML(node: unknown): string; firstChild(node: unknown): unknown } };
}

const PACKAGES = ['base', 'ams', 'newcommand', 'boldsymbol', 'color', 'cancel', 'mhchem'];

let loading: Promise<MathJaxGlobal> | null = null;

export function loadMathJax(): Promise<MathJaxGlobal> {
    loading ??= new Promise<MathJaxGlobal>((resolve, reject) => {
        const w = window as unknown as { MathJax?: unknown };
        w.MathJax = {
            loader: { load: [] },
            tex: { packages: PACKAGES },
            svg: { fontCache: 'none' },
            startup: { typeset: false },
        };
        const script = document.createElement('script');
        script.src = mathjaxUrl;
        script.async = true;
        script.onload = () => {
            const mj = w.MathJax as MathJaxGlobal;
            mj.startup.promise.then(() => resolve(mj), reject);
        };
        script.onerror = () => {
            loading = null;
            reject(new Error('Could not load the math renderer'));
        };
        document.head.appendChild(script);
    });
    return loading;
}

const MAX_MATH_SIZE_PX = 20_000;
const MAX_MATH_SVG_BYTES = 400_000;
const UNSUPPORTED = /\\(tag|label|eqref|ref|notag|nonumber)\b/;

const escapeAttr = (s: string) => s.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;');

export function renderLatex(mj: MathJaxGlobal, latex: string, fontSize: number, displayMode: boolean, color: string): RenderedMath {
    const ex = fontSize / 2;
    const unsupported = latex.match(UNSUPPORTED);
    if (unsupported) return { svg: '', width: 1, height: 1, error: `\\${unsupported[1]} is not supported` };
    try {
        const node = mj.tex2svg(latex, { display: displayMode, em: fontSize, ex, containerWidth: 80 * fontSize });
        let svg = mj.startup.adaptor.outerHTML(mj.startup.adaptor.firstChild(node));
        const errorMatch = svg.match(/data-mjx-error="([^"]*)"/);
        const widthEx = Number.parseFloat(svg.match(/width="([\d.]+)ex"/)?.[1] ?? '0');
        const heightEx = Number.parseFloat(svg.match(/height="([\d.]+)ex"/)?.[1] ?? '0');
        const width = Math.max(1, Math.round(widthEx * ex * 100) / 100);
        const height = Math.max(1, Math.round(heightEx * ex * 100) / 100);
        svg = svg
            .replace(/ style="vertical-align:[^"]*"/, '')
            .replace(/width="[\d.]+ex"/, `width="${width}"`)
            .replace(/height="[\d.]+ex"/, `height="${height}"`)
            .replace(/currentColor/g, escapeAttr(color));
        if (!/xmlns=/.test(svg)) svg = svg.replace('<svg', '<svg xmlns="http://www.w3.org/2000/svg"');
        let error = errorMatch?.[1];
        if (!error && (widthEx <= 0 || heightEx <= 0 || width <= 1 || height <= 1)) error = 'The formula has no visible size';
        if (!error && (width > MAX_MATH_SIZE_PX || height > MAX_MATH_SIZE_PX)) error = 'The formula is too large';
        if (!error && svg.length > MAX_MATH_SVG_BYTES) error = 'The formula is too complex to render';
        return error ? { svg: '', width: 1, height: 1, error } : { svg, width, height };
    } catch (err) {
        return { svg: '', width: 1, height: 1, error: err instanceof Error ? err.message : 'Could not render LaTeX' };
    }
}
