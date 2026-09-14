import { expect, test } from '@playwright/test';
import type { LineShape, Shape } from '../src/shared/protocol';
import { boardState, drag, openNewBoard, selectTool, shapes, waitForShapes } from './helpers';

type Box = Extract<Shape, { type: 'rect' }>;

test('marquee selects several shapes and they move together', async ({ page }) => {
    await openNewBoard(page);
    await selectTool(page, 'rect');
    await drag(page, [400, 300], [480, 380]);
    await drag(page, [550, 300], [630, 380]);
    await selectTool(page, 'select');
    await drag(page, [380, 280], [660, 400]);
    expect(await boardState<string[]>(page, 'selectedIds')).toHaveLength(2);
    await drag(page, [440, 302], [440, 452]);
    const rects = (await shapes(page)) as Box[];
    expect(rects.map((r) => Math.round(r.y))).toEqual([450, 450]);
    expect(rects.map((r) => Math.round(r.x)).sort()).toEqual([400, 550]);

    // Shift-click toggles selection; Escape clears it.
    await page.keyboard.down('Shift');
    await page.mouse.click(440, 452);
    await page.keyboard.up('Shift');
    expect(await boardState<string[]>(page, 'selectedIds')).toHaveLength(1);
    await page.keyboard.press('Escape');
    expect(await boardState<string[]>(page, 'selectedIds')).toHaveLength(0);
});

test('dragging a bound arrow detaches it from its shapes', async ({ page }) => {
    await openNewBoard(page);
    await selectTool(page, 'rect');
    await drag(page, [300, 300], [400, 400]);
    await drag(page, [700, 300], [800, 400]);
    await selectTool(page, 'arrow');
    await drag(page, [350, 350], [750, 350]);
    await selectTool(page, 'select');
    await drag(page, [550, 350], [550, 550]);
    const arrow = (await shapes(page)).find((s) => s.type === 'arrow') as LineShape;
    expect(arrow.startBinding).toBeUndefined();
    expect(arrow.endBinding).toBeUndefined();
    expect(Math.round(arrow.y)).toBe(550);
});

test('rotates a shape with the transformer', async ({ page }) => {
    await openNewBoard(page);
    await selectTool(page, 'rect');
    await drag(page, [500, 400], [700, 500]);
    await selectTool(page, 'select');
    await page.mouse.click(600, 401);
    // Rotation handle sits above the top-center anchor.
    await drag(page, [600, 350], [760, 420]);
    const rect = (await shapes(page))[0] as Box;
    expect(Math.abs(rect.rotation)).toBeGreaterThan(20);
    expect(rect.width).toBeCloseTo(200, 0);
});

test('keyboard shortcuts switch tools and select all', async ({ page }) => {
    await openNewBoard(page);
    await page.keyboard.press('r');
    expect(await boardState(page, 'tool')).toBe('rect');
    await drag(page, [400, 300], [500, 400]);
    await page.keyboard.press('o');
    await drag(page, [600, 300], [700, 400]);
    await page.keyboard.press('Control+a');
    expect(await boardState<string[]>(page, 'selectedIds')).toHaveLength(2);
    await page.keyboard.press('Backspace');
    await waitForShapes(page, (l) => l.length === 0);
    // Shortcuts don't fire while typing.
    await page.keyboard.press('t');
    await page.mouse.click(500, 500);
    await expect(page.getByTestId('text-editor')).toBeFocused();
    await page.keyboard.type('rope');
    expect(await boardState(page, 'tool')).toBe('text');
    await page.keyboard.press('Escape');
    await waitForShapes(page, (l) => l.length === 1 && l[0].type === 'text');
});

test('renders a mixed board (visual check)', async ({ page }) => {
    await openNewBoard(page);
    await selectTool(page, 'rect');
    await drag(page, [350, 200], [530, 280]);
    await selectTool(page, 'diamond');
    await drag(page, [360, 360], [520, 480]);
    await selectTool(page, 'ellipse');
    await drag(page, [700, 370], [880, 470]);
    await selectTool(page, 'arrow');
    await drag(page, [440, 240], [440, 420]);
    await drag(page, [440, 420], [790, 420]);
    await selectTool(page, 'select');
    for (const [x, y, label] of [
        [440, 240, 'Start here'],
        [440, 420, 'Decide?'],
        [790, 420, 'A longer label that wraps inside'],
    ] as const) {
        await page.mouse.dblclick(x, y);
        await expect(page.getByTestId('text-editor')).toBeFocused();
        await page.keyboard.type(label);
        await page.keyboard.press('Escape');
    }
    await selectTool(page, 'pencil');
    await drag(page, [950, 200], [1100, 300], 20);
    await selectTool(page, 'text');
    await page.mouse.click(950, 500);
    await expect(page.getByTestId('text-editor')).toBeFocused();
    await page.keyboard.type('Hand notes\nsecond line');
    await page.keyboard.press('Escape');
    await waitForShapes(page, (l) => l.length === 7);
    await page.keyboard.press('v');
    await page.mouse.click(1300, 800);
    await page.screenshot({ path: 'e2e/screenshots/mixed-board.png' });
});

test('works on a phone-sized screen', async ({ browser }) => {
    const context = await browser.newContext({ viewport: { width: 390, height: 780 }, hasTouch: true });
    const page = await context.newPage();
    await openNewBoard(page);
    await expect(page.getByTestId('toolbar')).toBeVisible();
    // Style panel starts collapsed on small screens.
    await expect(page.getByTestId('style-panel')).toBeHidden();
    await expect(page.getByLabel('Show style panel')).toBeVisible();
    await selectTool(page, 'rect');
    await drag(page, [150, 300], [250, 400]);
    await waitForShapes(page, (l) => l.length === 1);
    await page.screenshot({ path: 'e2e/screenshots/mobile.png' });
    await context.close();
});
