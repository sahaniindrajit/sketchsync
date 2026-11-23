import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StreamableHTTPClientTransport } from '@modelcontextprotocol/sdk/client/streamableHttp.js';
import { expect, test } from '@playwright/test';
import { BACKEND, drag, openNewBoard, selectTool, waitForShapes } from './helpers';

async function mcpClient(roomId: string) {
    const client = new Client({ name: 'Claude', version: '1.0.0' });
    await client.connect(new StreamableHTTPClientTransport(new URL(`${BACKEND}/mcp/${roomId}`)));
    return client;
}

test('the AI toast reports added shapes and can undo the AI batch', async ({ page }) => {
    const roomId = await openNewBoard(page);
    // The user's own shape must survive undoing the AI.
    await selectTool(page, 'rect');
    await drag(page, [200, 600], [300, 680]);
    await waitForShapes(page, (l) => l.length === 1);

    const client = await mcpClient(roomId);
    await client.callTool({ name: 'add_shapes', arguments: { shapes: [{ type: 'rect', x: 500, y: 300, label: 'A' }, { type: 'ellipse', x: 700, y: 300, label: 'B' }] } });
    await waitForShapes(page, (l) => l.length === 3);
    await client.callTool({ name: 'update_shapes', arguments: { updates: [{ id: (await page.evaluate(() => {
        const w = window as unknown as { __board: { getState(): { shapes: Map<string, { id: string; type: string; createdBy: string }> } } };
        return Array.from(w.__board.getState().shapes.values()).find((s) => s.createdBy.startsWith('ai:') && s.type === 'rect')!.id;
    })), fillColor: '#ffc9c9' }] } }).catch(() => undefined);

    const toast = page.getByTestId('ai-activity');
    await expect(toast).toContainText('added 2 shapes', { timeout: 6000 });
    await toast.getByRole('button', { name: /Undo .*changes/ }).click();
    await waitForShapes(page, (l) => l.length === 1 && l[0].createdBy.startsWith('user:'));
    await expect(page.getByRole('status').filter({ hasText: /Reverted/ })).toBeVisible();

    // Reverting the AI is itself undoable.
    await page.keyboard.press('Control+z');
    await waitForShapes(page, (l) => l.length === 3);
    await client.close();
});

test('selection actions: duplicate, reorder, opacity, delete', async ({ page }) => {
    await openNewBoard(page);
    await selectTool(page, 'rect');
    await drag(page, [400, 300], [520, 380]);
    await selectTool(page, 'select');
    await page.mouse.click(460, 301);
    await expect(page.getByTestId('style-panel')).toContainText('1 selected');

    await page.getByLabel('Duplicate').click();
    await waitForShapes(page, (l) => l.length === 2 && l[1].x === l[0].x + 20);
    await page.getByLabel('Opacity 50%').click();
    await waitForShapes(page, (l) => l.some((s) => s.opacity === 0.5));
    await page.getByLabel('Send to back').click();
    await waitForShapes(page, (l) => {
        const copy = l.find((s) => s.opacity === 0.5)!;
        return l.every((s) => s === copy || s.z > copy.z);
    });
    await page.getByLabel('Delete', { exact: true }).click();
    await waitForShapes(page, (l) => l.length === 1);
});
