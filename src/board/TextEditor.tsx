import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { isLinear, polylineMidpoint, resolveLinePoints } from '@/shared/geometry';
import { DEFAULTS, type MathShape, type TextShape } from '@/shared/protocol';
import { FONT_FAMILY } from './measure';
import { makeShape } from './shapeFactory';
import { useBoard, type EditingState } from './store';

/** HTML textarea overlaid on the canvas for editing text shapes and labels. */
export function TextEditor({ editing }: { editing: EditingState }) {
    const viewport = useBoard((s) => s.viewport);
    const shapes = useBoard((s) => s.shapes);
    const defaults = { strokeColor: useBoard((s) => s.strokeColor), fontSize: useBoard((s) => s.fontSize) };
    const ref = useRef<HTMLTextAreaElement>(null);
    const committed = useRef(false);

    const shape = 'shapeId' in editing ? shapes.get(editing.shapeId) : undefined;
    const isMath = editing.kind === 'math' || editing.kind === 'new-math';
    const initial =
        editing.kind === 'text' && shape?.type === 'text'
            ? shape.text
            : editing.kind === 'math' && shape?.type === 'math'
              ? shape.latex
              : editing.kind === 'label' && shape && 'label' in shape
                ? (shape.label?.text ?? '')
                : '';
    const [value, setValue] = useState(initial);
    // What the editor opened with: if the user didn't change it, closing must not overwrite
    // edits someone else made meanwhile.
    const openedWith = useRef(initial);

    useEffect(() => {
        const el = ref.current;
        if (!el) return;
        // Focus after the pointer event that opened the editor has finished.
        const t = setTimeout(() => {
            el.focus();
            el.setSelectionRange(el.value.length, el.value.length);
        }, 0);
        return () => clearTimeout(t);
    }, []);

    useLayoutEffect(() => {
        const el = ref.current;
        if (!el) return;
        el.style.height = '0px';
        el.style.height = `${el.scrollHeight}px`;
        if (editing.kind !== 'label' && !isMath) {
            el.style.width = '0px';
            el.style.width = `${Math.max(el.scrollWidth + 4, 20)}px`;
        }
    }, [value, viewport.scale, editing.kind, isMath]);

    const commit = () => {
        if (committed.current) return;
        committed.current = true;
        const state = useBoard.getState();
        const text = value.replace(/\s+$/, '');
        const untouched = value === openedWith.current;
        if (editing.kind === 'new-math') {
            if (text.trim()) {
                const newShape = makeShape<MathShape>({
                    type: 'math',
                    x: editing.x,
                    y: editing.y,
                    latex: text.trim(),
                    fontSize: Math.max(DEFAULTS.mathFontSize, state.fontSize),
                    displayMode: true,
                    strokeWidth: 0,
                    fillColor: 'transparent',
                });
                state.dispatch({ kind: 'add', shapes: [newShape] });
            }
        } else if (untouched && 'shapeId' in editing) {
            // Nothing to save.
        } else if (editing.kind === 'math' && shape?.type === 'math') {
            if (!text.trim()) state.dispatch({ kind: 'delete', ids: [shape.id] });
            else if (text.trim() !== shape.latex) state.dispatch({ kind: 'update', patches: [{ id: shape.id, changes: { latex: text.trim() } }] });
        } else if (editing.kind === 'new-text') {
            if (text.trim()) {
                const newShape = makeShape<TextShape>({
                    type: 'text',
                    x: editing.x,
                    y: editing.y,
                    text,
                    fontSize: state.fontSize,
                    fontWeight: 'normal',
                    align: 'left',
                    strokeWidth: 0,
                    fillColor: 'transparent',
                });
                state.dispatch({ kind: 'add', shapes: [newShape] });
            }
        } else if (shape) {
            if (editing.kind === 'text') {
                if (!text.trim()) state.dispatch({ kind: 'delete', ids: [shape.id] });
                else if (shape.type === 'text' && text !== shape.text) state.dispatch({ kind: 'update', patches: [{ id: shape.id, changes: { text } }] });
            } else if ('label' in shape || shape.type === 'rect' || shape.type === 'ellipse' || shape.type === 'diamond' || isLinear(shape)) {
                const current = 'label' in shape ? shape.label : undefined;
                if (!text.trim()) {
                    if (current) state.dispatch({ kind: 'update', patches: [{ id: shape.id, changes: { label: null } }] });
                } else if (text !== current?.text) {
                    state.dispatch({ kind: 'update', patches: [{ id: shape.id, changes: { label: { ...current, text } } }] });
                }
            }
        }
        state.setEditing(null);
    };

    if ('shapeId' in editing && !shape) return null;

    const toScreen = (x: number, y: number) => ({ left: x * viewport.scale + viewport.x, top: y * viewport.scale + viewport.y });
    let style: React.CSSProperties;

    if (editing.kind === 'label' && shape) {
        const fontSize = ('label' in shape && shape.label?.fontSize) || DEFAULTS.labelFontSize;
        let box: { x: number; y: number; width: number; height: number };
        if (isLinear(shape)) {
            const mid = polylineMidpoint(resolveLinePoints(shape, (id) => shapes.get(id)));
            box = { x: mid.x - 100, y: mid.y - fontSize, width: 200, height: fontSize * 2 };
        } else {
            const s = shape as { x: number; y: number; width: number; height: number };
            box = { x: s.x, y: s.y, width: s.width, height: s.height };
        }
        const { left, top } = toScreen(box.x, box.y);
        style = {
            left,
            top: top + (box.height * viewport.scale) / 2,
            width: box.width * viewport.scale,
            transform: 'translateY(-50%)',
            fontSize: fontSize * viewport.scale,
            textAlign: 'center',
            color: ('label' in shape && shape.label?.color) || shape.strokeColor,
        };
    } else if (isMath) {
        const x = 'x' in editing ? editing.x : shape!.x;
        const y = 'y' in editing ? editing.y : shape!.y;
        const { left, top } = toScreen(x, y);
        style = {
            left,
            top,
            fontSize: 16,
            fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace',
            color: '#1e1e1e',
            background: '#ffffff',
            border: '1px solid #a5b4fc',
            borderRadius: 6,
            padding: '6px 8px',
            minWidth: 220,
            boxShadow: '0 4px 12px rgba(0,0,0,0.08)',
        };
    } else {
        const textShape = shape?.type === 'text' ? shape : undefined;
        const x = 'x' in editing ? editing.x : textShape!.x;
        const y = 'y' in editing ? editing.y : textShape!.y;
        const { left, top } = toScreen(x, y);
        const fontSize = textShape?.fontSize ?? defaults.fontSize;
        style = {
            left,
            top,
            fontSize: fontSize * viewport.scale,
            fontWeight: textShape?.fontWeight === 'bold' ? 700 : 400,
            color: textShape?.strokeColor ?? defaults.strokeColor,
            textAlign: textShape?.align ?? 'left',
            width: textShape?.width ? textShape.width * viewport.scale : undefined,
            transform: textShape?.rotation ? `rotate(${textShape.rotation}deg)` : undefined,
            transformOrigin: 'top left',
        };
    }

    return (
        <textarea
            ref={ref}
            data-testid="text-editor"
            value={value}
            onChange={(e) => setValue(e.target.value)}
            onBlur={commit}
            onKeyDown={(e) => {
                e.stopPropagation();
                if (e.key === 'Escape' || (e.key === 'Enter' && (e.metaKey || e.ctrlKey))) {
                    e.preventDefault();
                    commit();
                }
            }}
            placeholder={editing.kind === 'label' ? 'Label' : isMath ? 'LaTeX, e.g. \\frac{a}{b}  (Esc to finish)' : 'Type…'}
            spellCheck={false}
            className="absolute z-20 resize-none overflow-hidden whitespace-pre bg-transparent p-0 outline-none placeholder:text-gray-300"
            style={{
                fontFamily: FONT_FAMILY,
                lineHeight: DEFAULTS.lineHeight,
                whiteSpace: editing.kind === 'label' || style.width ? 'pre-wrap' : 'pre',
                minWidth: 20,
                border: 'none',
                ...style,
            }}
        />
    );
}
