import { expect, type Page } from '@playwright/test';
import type { Shape } from '../src/shared/protocol';

export const BACKEND = `http://127.0.0.1:${process.env.E2E_PROD ? 3200 : 3100}`;

export async function openNewBoard(page: Page): Promise<string> {
    await page.goto('/');
    await page.evaluate(() => localStorage.clear());
    await page.goto('/board');
    await page.waitForURL(/\/board\/[0-9a-f-]{36}$/);
    await waitOnline(page);
    return page.url().split('/board/')[1];
}

export async function waitOnline(page: Page) {
    await expect(page.getByTestId('connection-status')).toHaveAttribute('data-status', 'online', { timeout: 15_000 });
}

export async function shapes(page: Page): Promise<Shape[]> {
    return page.evaluate(() => {
        const w = window as unknown as { __board: { getState(): { shapes: Map<string, unknown> } } };
        return Array.from(w.__board.getState().shapes.values()) as never;
    });
}

export async function boardState<T>(page: Page, pick: string): Promise<T> {
    return page.evaluate((key) => {
        const w = window as unknown as { __board: { getState(): Record<string, unknown> } };
        return w.__board.getState()[key] as never;
    }, pick);
}

export async function selectTool(page: Page, tool: string) {
    await page.locator(`[data-tool="${tool}"]`).click();
}

export async function drag(page: Page, from: [number, number], to: [number, number], steps = 12) {
    await page.mouse.move(from[0], from[1]);
    await page.mouse.down();
    await page.mouse.move(to[0], to[1], { steps });
    await page.mouse.up();
}

export async function waitForShapes(page: Page, predicate: (shapes: Shape[]) => boolean, timeout = 5000) {
    await expect
        .poll(async () => predicate(await shapes(page)), { timeout })
        .toBe(true);
}
