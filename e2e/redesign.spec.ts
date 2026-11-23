import { expect, test } from '@playwright/test';
import { boardState, drag, openNewBoard, selectTool, waitForShapes } from './helpers';

test('landing page leads with the AI pitch and opens a board', async ({ page }) => {
    await page.goto('/');
    await expect(page.getByRole('heading', { level: 1 })).toHaveAccessibleName('The whiteboard your AI can draw on.');
    await expect(page.getByRole('img', { name: /Claude drawing a signup flowchart/ })).toBeVisible();
    // No claims for features the app doesn't have.
    await expect(page.getByText(/Live Commenting|PDF/i)).toHaveCount(0);
    await page.getByRole('link', { name: 'Open a board' }).first().click();
    await page.waitForURL(/\/board\/[0-9a-f-]{36}$/);
});

test('command palette switches tools and opens dialogs', async ({ page }) => {
    await openNewBoard(page);
    await page.keyboard.press('Control+k');
    const input = page.getByPlaceholder('Search tools and actions…');
    await expect(input).toBeFocused();
    await input.fill('ellip');
    await page.keyboard.press('Enter');
    await expect(input).toBeHidden();
    expect(await boardState(page, 'tool')).toBe('ellipse');

    await page.getByLabel('Command palette').click();
    await page.getByPlaceholder('Search tools and actions…').fill('connect');
    await page.keyboard.press('Enter');
    await expect(page.getByTestId('connect-ai')).toBeVisible();
});

test('typing in the palette does not switch tools', async ({ page }) => {
    await openNewBoard(page);
    await selectTool(page, 'select');
    await page.keyboard.press('Control+k');
    await page.keyboard.type('rot');
    expect(await boardState(page, 'tool')).toBe('select');
    await page.keyboard.press('Escape');
    await expect(page.getByPlaceholder('Search tools and actions…')).toBeHidden();
});

test('style panel follows the tool and the selection', async ({ page }) => {
    await openNewBoard(page);
    await selectTool(page, 'select');
    await expect(page.getByTestId('style-panel')).toBeHidden();
    await selectTool(page, 'text');
    await expect(page.getByLabel('Font size 28')).toBeVisible();
    await expect(page.getByLabel('Fill #a5d8ff')).toHaveCount(0);
    await selectTool(page, 'rect');
    await drag(page, [400, 300], [520, 380]);
    await waitForShapes(page, (l) => l.length === 1);
    // A preset applies to the next shape, and to the selection.
    await page.getByLabel('Stroke width 8').click();
    await drag(page, [600, 300], [720, 380]);
    await waitForShapes(page, (l) => l.length === 2 && l.some((s) => s.strokeWidth === 8) && l.some((s) => s.strokeWidth !== 8));
    await selectTool(page, 'select');
    await page.mouse.click(460, 301);
    await page.getByLabel('Stroke width 4').click();
    await waitForShapes(page, (l) => l.some((s) => s.strokeWidth === 4));
});

test('dark mode toggles from the keyboard and the menu, and persists', async ({ page }) => {
    await openNewBoard(page);
    const isDark = () => page.evaluate(() => document.documentElement.classList.contains('dark'));
    const start = await isDark();
    await page.keyboard.press('Shift+D');
    expect(await isDark()).toBe(!start);
    expect(await boardState(page, 'tool')).not.toBe('diamond');
    await page.reload();
    expect(await isDark()).toBe(!start);
    await page.getByLabel('Menu').click();
    await page.getByRole('menuitemcheckbox', { name: start ? 'Dark mode' : 'Light mode' }).click();
    expect(await isDark()).toBe(start);
});

test('undo and redo the local user’s changes', async ({ page }) => {
    await openNewBoard(page);
    await selectTool(page, 'rect');
    await drag(page, [400, 300], [520, 380]);
    await selectTool(page, 'ellipse');
    await drag(page, [600, 300], [700, 380]);
    await waitForShapes(page, (l) => l.length === 2);

    // Moving a shape is one undo step, however many updates the drag sent.
    await selectTool(page, 'select');
    await drag(page, [460, 301], [560, 451], 20);
    await waitForShapes(page, (l) => l.some((s) => s.type === 'rect' && Math.round(s.x) === 500));
    await page.keyboard.press('Control+z');
    await waitForShapes(page, (l) => l.some((s) => s.type === 'rect' && Math.round(s.x) === 400));

    await page.keyboard.press('Control+z');
    await waitForShapes(page, (l) => l.length === 1 && l[0].type === 'rect');
    await page.getByLabel('Redo').click();
    await waitForShapes(page, (l) => l.length === 2);

    // Deleting and undoing restores the shape.
    await page.keyboard.press('Control+a');
    await page.keyboard.press('Delete');
    await waitForShapes(page, (l) => l.length === 0);
    await page.getByLabel('Undo').click();
    await waitForShapes(page, (l) => l.length === 2);
});
