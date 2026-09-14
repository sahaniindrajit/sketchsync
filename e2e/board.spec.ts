import { expect, test } from '@playwright/test';
import type { LineShape, Shape } from '../src/shared/protocol';
import { boardState, drag, openNewBoard, selectTool, shapes, waitForShapes, waitOnline } from './helpers';

const byType = (list: Shape[], type: string) => list.filter((s) => s.type === type);

test.describe('single-user board', () => {
    test('redirects /board to a room, shows welcome and connects', async ({ page }) => {
        const roomId = await openNewBoard(page);
        expect(roomId).toMatch(/^[0-9a-f-]{36}$/);
        await expect(page.getByText('Welcome to SketchSync')).toBeVisible();
        // Reopening /board returns to the same board.
        await page.goto('/board');
        await page.waitForURL(`**/board/${roomId}`);
    });

    test('draws rectangles, ellipses, diamonds, lines and freehand strokes', async ({ page }) => {
        await openNewBoard(page);
        await selectTool(page, 'rect');
        await drag(page, [400, 300], [550, 400]);
        await selectTool(page, 'ellipse');
        await drag(page, [600, 300], [700, 380]);
        await selectTool(page, 'diamond');
        await drag(page, [750, 300], [850, 400]);
        await selectTool(page, 'line');
        await drag(page, [400, 500], [600, 520]);
        await selectTool(page, 'pencil');
        await drag(page, [700, 500], [850, 600], 25);

        const list = await shapes(page);
        expect(byType(list, 'rect')[0]).toMatchObject({ width: 150, height: 100 });
        expect(byType(list, 'ellipse')).toHaveLength(1);
        expect(byType(list, 'diamond')).toHaveLength(1);
        expect((byType(list, 'line')[0] as LineShape).points).toEqual([0, 0, 200, 20]);
        const stroke = byType(list, 'freehand')[0] as LineShape;
        expect(stroke.points.length).toBeGreaterThan(10);
        await expect(page.getByText('Welcome to SketchSync')).toBeHidden();

        // A click without dragging does not leave a zero-size rectangle behind.
        await selectTool(page, 'rect');
        await page.mouse.click(1000, 700);
        expect(byType(await shapes(page), 'rect')).toHaveLength(1);
    });

    test('creates and edits text, and labels shapes', async ({ page }) => {
        await openNewBoard(page);
        await selectTool(page, 'text');
        await page.mouse.click(500, 400);
        const editor = page.getByTestId('text-editor');
        await expect(editor).toBeFocused();
        await page.keyboard.type('Hello board');
        await page.keyboard.press('Escape');
        await waitForShapes(page, (l) => l.some((s) => s.type === 'text' && s.text === 'Hello board'));

        // Double-click the text to edit it.
        await selectTool(page, 'select');
        await page.mouse.dblclick(520, 410);
        await expect(editor).toBeFocused();
        await page.keyboard.press('End');
        await page.keyboard.type('!');
        await page.mouse.click(1100, 750);
        await waitForShapes(page, (l) => l.some((s) => s.type === 'text' && s.text === 'Hello board!'));

        // Label a rectangle.
        await selectTool(page, 'rect');
        await drag(page, [300, 200], [460, 280]);
        await selectTool(page, 'select');
        await page.mouse.dblclick(380, 240);
        await expect(editor).toBeFocused();
        await page.keyboard.type('Start');
        await page.keyboard.press('Escape');
        await waitForShapes(page, (l) => l.some((s) => s.type === 'rect' && s.label?.text === 'Start'));

        // Empty text is discarded.
        await selectTool(page, 'text');
        await page.mouse.click(900, 600);
        await page.keyboard.press('Escape');
        expect(byType(await shapes(page), 'text')).toHaveLength(1);
    });

    test('selects, drags, resizes and deletes shapes', async ({ page }) => {
        await openNewBoard(page);
        await selectTool(page, 'rect');
        await drag(page, [400, 300], [500, 400]);
        await selectTool(page, 'select');
        await drag(page, [450, 302], [650, 502]);
        let rect = byType(await shapes(page), 'rect')[0] as Extract<Shape, { type: 'rect' }>;
        expect(rect.x).toBeCloseTo(600, 0);
        expect(rect.y).toBeCloseTo(500, 0);

        // Resize with the bottom-right transformer anchor.
        await drag(page, [700, 600], [760, 650]);
        rect = byType(await shapes(page), 'rect')[0] as typeof rect;
        expect(rect.width).toBeGreaterThan(140);
        expect(rect.height).toBeGreaterThan(130);

        await page.keyboard.press('Delete');
        await waitForShapes(page, (l) => l.length === 0);
    });

    test('arrows bind to shapes and follow them', async ({ page }) => {
        await openNewBoard(page);
        await selectTool(page, 'rect');
        await drag(page, [300, 300], [400, 400]);
        await drag(page, [700, 300], [800, 400]);
        await selectTool(page, 'arrow');
        await drag(page, [350, 350], [750, 350]);
        const arrow = byType(await shapes(page), 'arrow')[0] as LineShape;
        expect(arrow.startBinding).toBeTruthy();
        expect(arrow.endBinding).toBeTruthy();

        // Move the target; the arrow stays attached.
        await selectTool(page, 'select');
        await drag(page, [750, 302], [750, 502]);
        const list = await shapes(page);
        const target = list.find((s) => s.id === arrow.endBinding!.shapeId) as Extract<Shape, { type: 'rect' }>;
        expect(target.y).toBeCloseTo(500, 0);
        expect((list.find((s) => s.id === arrow.id) as LineShape).endBinding).toEqual(arrow.endBinding);
        await page.screenshot({ path: 'e2e/screenshots/arrow-binding.png' });
    });

    test('eraser removes only the shapes it touches', async ({ page }) => {
        await openNewBoard(page);
        await selectTool(page, 'rect');
        await drag(page, [300, 300], [400, 400]);
        await drag(page, [700, 300], [800, 400]);
        await selectTool(page, 'eraser');
        await drag(page, [290, 350], [320, 350]);
        await waitForShapes(page, (l) => l.length === 1);
    });

    test('style panel applies to new shapes and the current selection', async ({ page }) => {
        await openNewBoard(page);
        await selectTool(page, 'rect');
        await drag(page, [400, 300], [500, 400]);
        await selectTool(page, 'select');
        await page.mouse.click(450, 301);
        await page.getByLabel('Stroke #e03131').click();
        await page.getByLabel('Fill #a5d8ff').click();
        await waitForShapes(page, (l) => l[0]?.strokeColor === '#e03131' && l[0]?.fillColor === '#a5d8ff');
        expect(await boardState(page, 'strokeColor')).toBe('#e03131');
    });

    test('pans and zooms the canvas', async ({ page }) => {
        await openNewBoard(page);
        await page.getByLabel('Zoom in').click();
        await expect(page.getByTestId('zoom-level')).toHaveText('120%');
        await selectTool(page, 'hand');
        const zoomed = await boardState<{ x: number; y: number; scale: number }>(page, 'viewport');
        await drag(page, [600, 400], [700, 450]);
        const vp = await boardState<{ x: number; y: number; scale: number }>(page, 'viewport');
        expect(vp.x - zoomed.x).toBeCloseTo(100, 0);
        expect(vp.y - zoomed.y).toBeCloseTo(50, 0);
        expect(vp.scale).toBeCloseTo(1.2);
        // Shapes drawn while zoomed use board coordinates.
        await page.getByTestId('zoom-level').click();
        await selectTool(page, 'rect');
        const before = await boardState<{ x: number; y: number }>(page, 'viewport');
        await drag(page, [500, 500], [600, 600]);
        const rect = (await shapes(page))[0] as Extract<Shape, { type: 'rect' }>;
        expect(rect.x).toBeCloseTo(500 - before.x, 0);
        expect(rect.width).toBeCloseTo(100, 0);
    });

    test('persists across reloads and exports PNG', async ({ page }) => {
        const roomId = await openNewBoard(page);
        await selectTool(page, 'diamond');
        await drag(page, [400, 300], [500, 400]);
        await page.waitForTimeout(600);
        await page.reload();
        await waitOnline(page);
        await waitForShapes(page, (l) => l.length === 1 && l[0].type === 'diamond');
        expect(page.url()).toContain(roomId);

        const download = page.waitForEvent('download');
        await page.getByLabel('Download PNG').click();
        expect((await download).suggestedFilename()).toBe('SketchSync-image.png');
    });

    test('inserts an image', async ({ page }) => {
        await openNewBoard(page);
        // 2x2 red PNG
        const png = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAIAAAACCAYAAABytg0kAAAAFklEQVR42mP8z8DwnwEIGGEMBgYGAEeYAv9pVZL+AAAAAElFTkSuQmCC', 'base64');
        await page.getByTestId('image-input').setInputFiles({ name: 'dot.png', mimeType: 'image/png', buffer: png });
        await waitForShapes(page, (l) => l.length === 1 && l[0].type === 'image');
    });

    test('legacy /live links and invalid board ids', async ({ page }) => {
        const id = '3f2b8c1e-8d2a-4c5b-9e7f-1a2b3c4d5e6f';
        await page.goto(`/live?roomId=${id}`);
        await page.waitForURL(`**/board/${id}`);
        await page.goto('/board/not-a-room');
        await expect(page.getByText('Page Not Found')).toBeVisible();
    });

    test('migrates a drawing saved by the old version', async ({ page }) => {
        await page.goto('/');
        await page.evaluate(() => {
            localStorage.clear();
            localStorage.setItem('whiteboardData', JSON.stringify({ rect: [{ id: '0b9a3c1e-1111-4c5b-9e7f-1a2b3c4d5e6f', x: 100, y: 100, width: 80, height: 60, color: { fillColor: '#FFFFFF' }, strokeColor: { strokeColor: '#000000' }, strokeWidth: { strokeWidth: 2 } }] }));
        });
        await page.goto('/board');
        await waitOnline(page);
        await waitForShapes(page, (l) => l.length === 1 && l[0].type === 'rect');
    });

    test('menu: reset canvas and new board', async ({ page }) => {
        const roomId = await openNewBoard(page);
        await selectTool(page, 'rect');
        await drag(page, [400, 300], [500, 400]);
        page.once('dialog', (d) => d.accept());
        await page.getByLabel('Menu').click();
        await page.getByRole('menuitem', { name: 'Reset the canvas' }).click();
        await waitForShapes(page, (l) => l.length === 0);

        await page.getByLabel('Menu').click();
        await page.getByRole('menuitem', { name: 'New board' }).click();
        await page.waitForURL((url) => !url.pathname.includes(roomId) && /\/board\/[0-9a-f-]{36}$/.test(url.pathname));
    });
});

test.describe('collaboration', () => {
    test('two browsers see each other’s changes live', async ({ browser, page }) => {
        const roomId = await openNewBoard(page);
        const other = await (await browser.newContext({ viewport: { width: 1400, height: 900 } })).newPage();
        await other.goto(`/board/${roomId}`);
        await waitOnline(other);

        await selectTool(page, 'rect');
        await drag(page, [400, 300], [550, 420]);
        await waitForShapes(other, (l) => l.some((s) => s.type === 'rect' && 'width' in s && s.width === 150));

        await selectTool(other, 'pencil');
        await drag(other, [700, 500], [900, 650], 30);
        const theirs = byType(await shapes(other), 'freehand')[0] as LineShape;
        await waitForShapes(page, (l) => l.some((s) => s.type === 'freehand' && (s as LineShape).points.length === theirs.points.length));

        await selectTool(other, 'text');
        await other.mouse.click(300, 700);
        await expect(other.getByTestId('text-editor')).toBeFocused();
        await other.keyboard.type('from other');
        await other.keyboard.press('Escape');
        await waitForShapes(page, (l) => l.some((s) => s.type === 'text' && s.text === 'from other'));

        // Moving a shape syncs too.
        await selectTool(page, 'select');
        await drag(page, [475, 302], [575, 402]);
        await waitForShapes(other, (l) => l.some((s) => s.type === 'rect' && Math.round(s.x) === 500));

        // Reset from one clears the other.
        page.once('dialog', (d) => d.accept());
        await page.getByLabel('Menu').click();
        await page.getByRole('menuitem', { name: 'Reset the canvas' }).click();
        await waitForShapes(other, (l) => l.length === 0);

        // A late joiner receives the current board.
        await selectTool(page, 'ellipse');
        await drag(page, [400, 300], [500, 400]);
        const late = await (await browser.newContext()).newPage();
        await late.goto(`/board/${roomId}`);
        await waitOnline(late);
        await waitForShapes(late, (l) => l.length === 1 && l[0].type === 'ellipse');
        await page.screenshot({ path: 'e2e/screenshots/collab.png' });
    });

    test('share dialog shows the board link', async ({ page }) => {
        const roomId = await openNewBoard(page);
        await page.getByRole('button', { name: 'Share' }).click();
        await expect(page.getByTestId('board-link')).toHaveValue(new RegExp(`/board/${roomId}$`));
        await page.keyboard.press('Escape');
        await expect(page.getByRole('dialog')).toBeHidden();
    });
});

test.describe('multiple tabs and reloads', () => {
    test('two tabs of the same browser keep all edits across a reload', async ({ page, context }) => {
        const roomId = await openNewBoard(page);
        const second = await context.newPage();
        await second.goto(`/board/${roomId}`);
        await waitOnline(second);

        await selectTool(page, 'rect');
        await drag(page, [300, 300], [400, 400]);
        await selectTool(second, 'ellipse');
        await drag(second, [600, 300], [700, 400]);
        // Reload the first tab right away (edits may still be in flight).
        await page.reload();
        await waitOnline(page);
        await waitForShapes(page, (l) => l.length === 2);
        await waitForShapes(second, (l) => l.length === 2);
        // No pending records are left behind once everything is confirmed.
        await expect
            .poll(() => page.evaluate((id) => Object.keys(localStorage).filter((k) => k.startsWith(`sketchsync:pending:${id}`)).length, roomId))
            .toBe(0);
    });

    test('edits made while the connection is down reach the server after it recovers', async ({ page, context, browser }) => {
        const roomId = await openNewBoard(page);
        await context.setOffline(true);
        await selectTool(page, 'diamond');
        await drag(page, [400, 300], [500, 400]);
        await context.setOffline(false);
        const viewer = await (await browser.newContext()).newPage();
        await viewer.goto(`/board/${roomId}`);
        await waitOnline(viewer);
        await waitForShapes(viewer, (l) => l.length === 1 && l[0].type === 'diamond', 60_000);
    });
});
