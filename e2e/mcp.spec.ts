import { writeFileSync } from 'node:fs';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StreamableHTTPClientTransport } from '@modelcontextprotocol/sdk/client/streamableHttp.js';
import { expect, test } from '@playwright/test';
import type { LineShape, Shape } from '../src/shared/protocol';
import { BACKEND, boardState, drag, openNewBoard, selectTool, shapes, waitForShapes, waitOnline } from './helpers';

type ToolResult = { content: { type: string; text?: string; data?: string }[]; isError?: boolean; structuredContent?: Record<string, unknown> };

async function mcpClient(roomId: string, name = 'claude-ai') {
    const client = new Client({ name, version: '1.0.0' });
    await client.connect(new StreamableHTTPClientTransport(new URL(`${BACKEND}/mcp/${roomId}`)));
    const call = async (tool: string, args: Record<string, unknown> = {}) => (await client.callTool({ name: tool, arguments: args })) as ToolResult;
    return { client, call };
}

test('an AI client draws on the board and viewers see it live', async ({ page, browser }) => {
    const roomId = await openNewBoard(page);
    const viewer = await (await browser.newContext({ viewport: { width: 1400, height: 900 } })).newPage();
    await viewer.goto(`/board/${roomId}`);
    await waitOnline(viewer);

    const { client, call } = await mcpClient(roomId);
    const result = await call('add_shapes', {
        shapes: [
            { type: 'ellipse', id: 'start', x: 300, y: 150, label: 'Start', fillColor: '#b2f2bb' },
            { type: 'rect', id: 'form', x: 300, y: 300, label: 'Fill in the signup form' },
            { type: 'diamond', id: 'valid', x: 310, y: 450, label: 'Valid?', fillColor: '#ffec99' },
            { type: 'rect', id: 'done', x: 650, y: 470, label: 'Create account', fillColor: '#a5d8ff' },
            { type: 'arrow', start: { shapeId: 'start' }, end: { shapeId: 'form' } },
            { type: 'arrow', start: { shapeId: 'form' }, end: { shapeId: 'valid' } },
            { type: 'arrow', start: { shapeId: 'valid' }, end: { shapeId: 'done' }, label: 'yes' },
            { type: 'arrow', start: { shapeId: 'valid' }, end: { shapeId: 'form' }, via: [{ x: 200, y: 510 }, { x: 200, y: 340 }], label: 'no' },
            { type: 'text', x: 650, y: 150, text: 'Signup flow', fontSize: 32, fontWeight: 'bold' },
        ],
    });
    expect(result.isError).toBeFalsy();

    for (const p of [page, viewer]) {
        await waitForShapes(p, (l) => l.length === 9);
        await expect(p.getByTestId('ai-activity')).toContainText('Claude');
    }
    const arrows = (await shapes(viewer)).filter((s) => s.type === 'arrow') as LineShape[];
    expect(arrows.every((a) => a.startBinding && a.endBinding)).toBe(true);
    await page.waitForTimeout(300);
    await page.screenshot({ path: 'e2e/screenshots/ai-flowchart.png' });

    // The AI moves a shape; connected arrows follow in the browser.
    await call('update_shapes', { updates: [{ id: 'done', dx: 100, dy: 60 }] });
    await waitForShapes(viewer, (l) => l.some((s) => s.id === 'done' && s.x === 750 && s.y === 530));

    // "Show" jumps to what the AI changed.
    await viewer.evaluate(() => {
        const w = window as unknown as { __board: { getState(): { setViewport(v: { x: number; y: number; scale: number }): void } } };
        w.__board.getState().setViewport({ x: -5000, y: -5000, scale: 1 });
    });
    await viewer.getByTestId('ai-activity').getByRole('button', { name: 'Show' }).click();
    const vp = await boardState<{ x: number; y: number }>(viewer, 'viewport');
    expect(vp.x).toBeGreaterThan(-2000);

    await client.close();
});

test('the AI can read and see what the user drew by hand', async ({ page }) => {
    const roomId = await openNewBoard(page);
    // The user sketches a house: a square, a roof and a door, plus a label.
    await selectTool(page, 'pencil');
    const stroke = async (pts: [number, number][]) => {
        await page.mouse.move(...pts[0]);
        await page.mouse.down();
        for (const p of pts.slice(1)) await page.mouse.move(p[0], p[1], { steps: 8 });
        await page.mouse.up();
    };
    await stroke([[500, 400], [700, 400], [700, 600], [500, 600], [500, 400]]);
    await stroke([[480, 410], [600, 290], [720, 410]]);
    await stroke([[580, 600], [580, 520], [620, 520], [620, 600]]);
    await selectTool(page, 'text');
    await page.mouse.click(760, 480);
    await expect(page.getByTestId('text-editor')).toBeFocused();
    await page.keyboard.type('my house');
    await page.keyboard.press('Escape');
    await waitForShapes(page, (l) => l.length === 4);
    await page.waitForTimeout(500);

    const { client, call } = await mcpClient(roomId);
    const board = (await call('get_board')).structuredContent as { shapeCount: number; hasHandDrawing: boolean; shapes: { type: string; text?: string }[] };
    expect(board.shapeCount).toBe(4);
    expect(board.hasHandDrawing).toBe(true);
    expect(board.shapes.find((s) => s.type === 'text')?.text).toBe('my house');

    const image = await call('get_board_image');
    const png = image.content.find((c) => c.type === 'image')!;
    writeFileSync('e2e/screenshots/ai-view-of-sketch.png', Buffer.from(png.data!, 'base64'));
    expect(image.content.find((c) => c.type === 'text')!.text).toMatch(/Board point =/);

    // The AI labels the user's drawing; the browser updates.
    const freehand = (await shapes(page)).filter((s) => s.type === 'freehand') as Shape[];
    await call('add_shapes', { shapes: [{ type: 'arrow', start: { x: 850, y: 350 }, end: { x: 720, y: 400 }, strokeColor: '#e03131' }, { type: 'text', x: 860, y: 330, text: 'roof', color: '#e03131' }] });
    await waitForShapes(page, (l) => l.some((s) => s.type === 'text' && s.text === 'roof'));
    expect(freehand).toHaveLength(3);
    await client.close();
});

test('user and AI edits interleave without losing anything', async ({ page }) => {
    const roomId = await openNewBoard(page);
    const { client, call } = await mcpClient(roomId, 'cursor');
    await selectTool(page, 'rect');
    const drawing = (async () => {
        for (let i = 0; i < 6; i++) await drag(page, [320 + i * 150, 620], [420 + i * 150, 700]);
    })();
    const ai = (async () => {
        for (let i = 0; i < 6; i++) {
            const r = await call('add_shapes', { shapes: [{ type: 'ellipse', x: 320 + i * 150, y: 200 }] });
            expect(r.isError).toBeFalsy();
        }
    })();
    await Promise.all([drawing, ai]);
    await waitForShapes(page, (l) => l.filter((s) => s.type === 'rect').length === 6 && l.filter((s) => s.type === 'ellipse').length === 6, 10_000);
    const fromAi = ((await call('get_board')).structuredContent as { shapeCount: number }).shapeCount;
    expect(fromAi).toBe(12);
    await expect(page.getByTestId('ai-activity')).toContainText('Cursor');
    await client.close();
});

test('the Connect AI dialog shows the board MCP URL and setup steps', async ({ page }) => {
    const roomId = await openNewBoard(page);
    await page.getByRole('button', { name: 'Connect your AI' }).click();
    await expect(page.getByTestId('mcp-url')).toHaveValue(`${BACKEND}/mcp/${roomId}`);
    await page.getByRole('button', { name: 'Claude Code' }).click();
    await expect(page.getByLabel('Claude Code command')).toHaveValue(`claude mcp add --transport http sketchsync ${BACKEND}/mcp/${roomId}`);
    await page.getByRole('tab', { name: 'Collaborate' }).click();
    await expect(page.getByTestId('board-link')).toBeVisible();
    await page.screenshot({ path: 'e2e/screenshots/share-dialog.png' });

    // The same dialog opens from the menu.
    await page.keyboard.press('Escape');
    await page.getByLabel('Menu').click();
    await page.getByRole('menuitem', { name: 'Connect your AI' }).click();
    await expect(page.getByTestId('connect-ai')).toBeVisible();
    await page.getByRole('button', { name: 'Claude', exact: true }).click();
    await page.screenshot({ path: 'e2e/screenshots/connect-ai.png' });
});
