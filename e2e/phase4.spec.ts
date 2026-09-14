import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StreamableHTTPClientTransport } from '@modelcontextprotocol/sdk/client/streamableHttp.js';
import { expect, test, type Page } from '@playwright/test';
import { writeFileSync } from 'node:fs';
import type { LineShape } from '../src/shared/protocol';
import { BACKEND, openNewBoard, selectTool, shapes, waitForShapes } from './helpers';

type ToolResult = { content: { type: string; text?: string; data?: string }[]; isError?: boolean };

async function mcp(roomId: string) {
    const client = new Client({ name: 'claude-ai', version: '1.0.0' });
    await client.connect(new StreamableHTTPClientTransport(new URL(`${BACKEND}/mcp/${roomId}`)));
    return {
        client,
        call: async (tool: string, args: Record<string, unknown> = {}) => (await client.callTool({ name: tool, arguments: args })) as ToolResult,
    };
}

/** Number of math shapes that finished rendering as images on the canvas. */
async function renderedMathCount(page: Page) {
    return page.evaluate(() => {
        const Konva = (window as unknown as { Konva: { stages: { find(selector: string): { getParent(): { id(): string } | null }[] }[] } }).Konva;
        const board = (window as unknown as { __board: { getState(): { shapes: Map<string, { type: string }> } } }).__board;
        const mathIds = new Set(Array.from(board.getState().shapes.entries()).filter(([, s]) => s.type === 'math').map(([id]) => id));
        return Konva.stages[0].find('Image').filter((node) => mathIds.has(node.getParent()?.id() ?? '')).length;
    });
}

test('AI flowcharts and worked solutions render on the canvas', async ({ page }) => {
    const roomId = await openNewBoard(page);
    const { client, call } = await mcp(roomId);
    const chart = await call('create_flowchart', {
        title: 'Order process',
        nodes: [
            { id: 'start', label: 'Order placed', kind: 'terminal' },
            { id: 'stock', label: 'In stock?', kind: 'decision' },
            { id: 'ship', label: 'Ship order' },
            { id: 'wait', label: 'Back-order item', kind: 'note' },
            { id: 'done', label: 'Done', kind: 'terminal' },
        ],
        edges: [
            { from: 'start', to: 'stock' },
            { from: 'stock', to: 'ship', label: 'yes' },
            { from: 'stock', to: 'wait', label: 'no' },
            { from: 'wait', to: 'stock' },
            { from: 'ship', to: 'done' },
        ],
        x: 300,
        y: 80,
    });
    expect(chart.isError).toBeFalsy();
    const solution = await call('write_solution', {
        title: 'Solve x² − 5x + 6 = 0',
        steps: [{ text: 'Factor.', latex: '(x-2)(x-3)=0' }, { text: 'Solve each factor.', latex: 'x-2=0 \\;\\text{or}\\; x-3=0' }],
        answer: 'x=2 \\text{ or } x=3',
    });
    expect(solution.isError).toBeFalsy();

    await waitForShapes(page, (l) => l.filter((s) => s.type === 'math').length === 3 && l.some((s) => s.id === 'stock'));
    const arrows = (await shapes(page)).filter((s) => s.type === 'arrow') as LineShape[];
    expect(arrows).toHaveLength(5);
    await expect.poll(() => renderedMathCount(page), { timeout: 15_000 }).toBe(3);

    // Zoom to fit everything and take a look.
    await page.getByLabel('Zoom to fit').click();
    await page.waitForTimeout(400);
    await page.screenshot({ path: 'e2e/screenshots/phase4-board.png' });

    // Export still works with MathJax images on the canvas (no tainted canvas).
    const download = page.waitForEvent('download');
    await page.getByLabel('Download PNG').click();
    const file = await download;
    expect(file.suggestedFilename()).toBe('SketchSync-image.png');
    expect(page.getByRole('status').filter({ hasText: /error/i })).toHaveCount(0);

    // The AI's own rendered view includes the math.
    const img = await call('get_board_image');
    writeFileSync('e2e/screenshots/phase4-ai-view.png', Buffer.from(img.content.find((c) => c.type === 'image')!.data!, 'base64'));
    await client.close();
});

test('users can write and edit LaTeX with the Math tool, and the AI can read it', async ({ page }) => {
    const roomId = await openNewBoard(page);
    await selectTool(page, 'math');
    await page.mouse.click(500, 300);
    const editor = page.getByTestId('text-editor');
    await expect(editor).toBeFocused();
    await page.keyboard.type('\\int_0^1 x^2\\,dx = \\frac{1}{3}');
    await page.keyboard.press('Escape');
    await waitForShapes(page, (l) => l.some((s) => s.type === 'math' && s.latex.startsWith('\\int_0^1')));
    await expect.poll(() => renderedMathCount(page), { timeout: 15_000 }).toBe(1);

    // Double-click to edit the formula.
    await selectTool(page, 'select');
    const math = (await shapes(page)).find((s) => s.type === 'math')!;
    await page.mouse.dblclick(math.x + 20, math.y + 15);
    await expect(editor).toBeFocused();
    await expect(editor).toHaveValue('\\int_0^1 x^2\\,dx = \\frac{1}{3}');
    await editor.fill('e^{i\\pi} + 1 = 0');
    await page.keyboard.press('Escape');
    await waitForShapes(page, (l) => l.some((s) => s.type === 'math' && s.latex === 'e^{i\\pi} + 1 = 0'));

    // Invalid LaTeX shows an error on the canvas instead of crashing.
    await selectTool(page, 'math');
    await page.mouse.click(500, 550);
    await expect(editor).toBeFocused();
    await page.keyboard.type('\\frac{1}{');
    await page.keyboard.press('Escape');
    await waitForShapes(page, (l) => l.filter((s) => s.type === 'math').length === 2);
    await page.waitForTimeout(500);
    await page.screenshot({ path: 'e2e/screenshots/phase4-user-math.png' });

    const { client, call } = await mcp(roomId);
    const board = await call('get_board');
    expect(board.content[0].text).toContain('e^{i\\\\pi} + 1 = 0');
    await client.close();
});

test('AI edits to a formula update the canvas live', async ({ page }) => {
    const roomId = await openNewBoard(page);
    const { client, call } = await mcp(roomId);
    await call('add_math', { latex: 'a^2 + b^2 = c^2', x: 400, y: 300, fontSize: 40 });
    await expect.poll(() => renderedMathCount(page), { timeout: 15_000 }).toBe(1);
    const id = (await shapes(page)).find((s) => s.type === 'math')!.id;
    const widthBefore = await page.evaluate((mid) => {
        const Konva = (window as unknown as { Konva: { stages: { findOne(sel: string): { getClientRect(): { width: number } } }[] } }).Konva;
        return Konva.stages[0].findOne(`#${mid}`).getClientRect().width;
    }, id);
    await call('update_shapes', { updates: [{ id, latex: '\\sum_{n=1}^{\\infty} \\frac{1}{n^2} = \\frac{\\pi^2}{6}', color: '#1971c2' }] });
    await waitForShapes(page, (l) => l.some((s) => s.type === 'math' && s.latex.startsWith('\\sum')));
    await expect
        .poll(() =>
            page.evaluate((mid) => {
                const Konva = (window as unknown as { Konva: { stages: { findOne(sel: string): { getClientRect(): { width: number } } }[] } }).Konva;
                return Konva.stages[0].findOne(`#${mid}`).getClientRect().width;
            }, id),
        )
        .not.toBe(widthBefore);
    await client.close();
});

test("closing an editor without typing doesn't undo someone else's change", async ({ page }) => {
    const roomId = await openNewBoard(page);
    const { client, call } = await mcp(roomId);
    await call('add_math', { latex: 'x', x: 500, y: 300, fontSize: 40 });
    await call('add_shapes', { shapes: [{ type: 'text', id: 'note', x: 500, y: 500, text: 'before' }] });
    await waitForShapes(page, (l) => l.length === 2);
    const math = (await shapes(page)).find((s) => s.type === 'math')!;

    // Open the math editor, then someone else edits the formula.
    await selectTool(page, 'select');
    await page.mouse.dblclick(math.x + 8, math.y + 12);
    await expect(page.getByTestId('text-editor')).toBeFocused();
    await call('update_shapes', { updates: [{ id: math.id, latex: 'y' }] });
    await waitForShapes(page, (l) => l.some((s) => s.type === 'math' && s.latex === 'y'));
    await page.keyboard.press('Escape');

    // Same for a text shape.
    await page.mouse.dblclick(510, 510);
    await expect(page.getByTestId('text-editor')).toBeFocused();
    await call('update_shapes', { updates: [{ id: 'note', text: 'after' }] });
    await waitForShapes(page, (l) => l.some((s) => s.id === 'note' && s.type === 'text' && s.text === 'after'));
    await page.mouse.click(1200, 800);

    await page.waitForTimeout(500);
    const board = (await call('get_board')).content[0].text!;
    expect(board).toContain('"latex": "y"');
    expect(board).toContain('"text": "after"');
    await client.close();
});
