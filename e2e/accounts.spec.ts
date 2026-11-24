import { createHash, randomBytes } from 'node:crypto';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StreamableHTTPClientTransport } from '@modelcontextprotocol/sdk/client/streamableHttp.js';
import { expect, test, type Browser, type Page } from '@playwright/test';
import { BACKEND, drag, selectTool, shapes, waitForShapes, waitOnline } from './helpers';

/** Accounts, the boards home, sharing and the personal MCP. Needs E2E_DATABASE_URL (see playwright.config.ts). */
test.skip(!process.env.E2E_DATABASE_URL, 'Set E2E_DATABASE_URL to run the accounts tests');

const run = Date.now().toString(36);
const email = (who: string) => `${who}-${run}@example.com`;

async function signIn(page: Page, who: string, name: string, next?: string) {
    await page.goto(next ? `/signin?next=${encodeURIComponent(next)}` : '/signin');
    await page.getByLabel('Email').fill(email(who));
    await page.getByLabel('Name').fill(name);
    await page.getByRole('button', { name: 'Sign in', exact: true }).click();
}

async function newPage(browser: Browser) {
    return (await browser.newContext({ viewport: { width: 1400, height: 900 } })).newPage();
}

async function createBoard(page: Page, title: string): Promise<string> {
    await page.goto('/boards');
    await page.getByRole('banner').getByRole('button', { name: 'New board' }).click();
    await page.waitForURL(/\/board\/[0-9a-f-]{36}$/);
    await waitOnline(page);
    await page.getByTitle('Rename board').click();
    await page.getByLabel('Board name').fill(title);
    await page.keyboard.press('Enter');
    return page.url().split('/board/')[1];
}

test('sign in, keep boards in one place, rename and draw', async ({ page }) => {
    // A board drawn before signing in comes along.
    await page.goto('/board');
    await page.waitForURL(/\/board\/[0-9a-f-]{36}$/);
    await waitOnline(page);
    const before = page.url().split('/board/')[1];
    await selectTool(page, 'rect');
    await drag(page, [500, 400], [700, 520]);
    await waitForShapes(page, (s) => s.length === 1);
    await page.waitForTimeout(600);

    await signIn(page, 'owner', 'Olive Owner');
    await page.waitForURL('**/boards');
    await expect(page.getByRole('status')).toContainText('Added 1 board from this browser');
    await expect(page.getByTestId('board-card')).toHaveCount(1);
    await expect(page.getByRole('heading', { name: 'Boards' })).toBeVisible();

    const id = await createBoard(page, 'Q3 roadmap');
    expect(id).not.toBe(before);
    await selectTool(page, 'ellipse');
    await drag(page, [400, 300], [600, 420]);
    await waitForShapes(page, (s) => s.length === 1);
    // Presence uses the account name.
    await page.waitForTimeout(800);

    await page.goto('/boards');
    await expect(page.getByTestId('board-card')).toHaveCount(2);
    const card = page.getByTestId('board-card').filter({ hasText: 'Q3 roadmap' });
    await expect(card).toBeVisible();
    await expect(card.locator('img')).toBeVisible();
    await expect(page.getByRole('tab', { name: /Yours/ })).toContainText('2');

    // Search and the switcher on the board.
    await page.getByLabel('Search boards').first().fill('roadmap');
    await expect(page.getByTestId('board-card')).toHaveCount(1);
    await card.click();
    await page.waitForURL(`**/board/${id}`);
    await waitOnline(page);
    await page.getByLabel('Switch board').click();
    await page.getByRole('option', { name: /Untitled board/ }).click();
    await page.waitForURL(`**/board/${before}`);
    await waitForShapes(page, (s) => s.length === 1);

    // Survives a reload (saved on the server, not just this browser).
    await page.evaluate(() => {
        for (const k of Object.keys(localStorage)) if (k.startsWith('sketchsync:board:')) localStorage.removeItem(k);
    });
    await page.goto(`/board/${id}`);
    await waitOnline(page);
    await waitForShapes(page, (s) => s.length === 1 && s[0].type === 'ellipse');
    await expect(page.getByTitle('Rename board')).toHaveText('Q3 roadmap');
});

test('sharing: link settings, view-only guests and invites', async ({ page, browser }) => {
    await signIn(page, 'sharer', 'Sam Sharer');
    await page.waitForURL('**/boards');
    const id = await createBoard(page, 'Launch plan');
    await selectTool(page, 'rect');
    await drag(page, [500, 400], [700, 520]);
    await waitForShapes(page, (s) => s.length === 1);

    // A guest with the link can edit by default.
    const guest = await newPage(browser);
    await guest.goto(`/board/${id}`);
    await waitOnline(guest);
    await expect(guest.getByTitle('Rename board')).toHaveText('Launch plan');
    await expect(guest.locator('[data-tool="rect"]')).toBeVisible();

    // View only: the guest's toolbar goes away live.
    await page.locator('#share-button').click();
    await page.getByLabel('Link access').click();
    await page.getByRole('button', { name: /^Anyone with the link can view/ }).click();
    await expect(guest.getByTestId('view-only')).toBeVisible();
    await expect(guest.locator('[data-tool="rect"]')).toHaveCount(0);
    await guest.keyboard.press('Delete');
    await guest.mouse.dblclick(600, 460);
    expect((await shapes(guest)).length).toBe(1);

    // Invite someone by email (no account yet), then lock the link.
    await page.getByLabel('Email to invite').fill(email('invitee'));
    await page.getByRole('button', { name: 'Invite' }).click();
    await expect(page.getByTestId('collaborators')).toContainText('Invited, not signed in yet');
    await page.getByLabel('Link access').click();
    await page.getByRole('button', { name: /^Only collaborators/ }).click();
    await expect(guest.getByRole('alertdialog')).toContainText('no longer available');
    await page.keyboard.press('Escape');

    // A fresh guest is asked to sign in; the invitee signs in and lands on the board.
    const invitee = await newPage(browser);
    await invitee.goto(`/board/${id}`);
    await expect(invitee.getByRole('alertdialog')).toContainText('This board is private');
    await invitee.getByRole('link', { name: 'Sign in' }).click();
    await invitee.getByLabel('Email').fill(email('invitee'));
    await invitee.getByRole('button', { name: 'Sign in', exact: true }).click();
    await invitee.waitForURL(`**/board/${id}`);
    await waitOnline(invitee);
    await waitForShapes(invitee, (s) => s.length === 1);
    await expect(invitee.locator('[data-tool="rect"]')).toBeVisible();

    // Someone else who signs in has no access.
    const stranger = await newPage(browser);
    await signIn(stranger, 'stranger', 'Stan Stranger', `/board/${id}`);
    await expect(stranger.getByRole('alertdialog')).toContainText("You don't have access");

    // The invitee sees it under "Shared with you".
    await invitee.goto('/boards');
    await invitee.getByRole('tab', { name: /Shared with you/ }).click();
    await expect(invitee.getByTestId('board-card').filter({ hasText: 'Launch plan' })).toBeVisible();
});

test('one personal MCP connector reaches every board after OAuth consent', async ({ page }) => {
    await signIn(page, 'ai', 'Ada AI');
    await page.waitForURL('**/boards');
    await expect(page.getByTestId('personal-mcp-url')).toHaveValue(`${BACKEND}/mcp`);
    const boardA = await createBoard(page, 'Board A');
    const boardB = await createBoard(page, 'Board B');

    // What an MCP client does: register, send the user to authorize, exchange the code.
    const redirectUri = 'http://127.0.0.1:9/callback';
    const reg = await (
        await fetch(`${BACKEND}/oauth/register`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ client_name: 'Claude', redirect_uris: [redirectUri] }) })
    ).json();
    const verifier = randomBytes(32).toString('base64url');
    const challenge = createHash('sha256').update(verifier).digest('base64url');
    let callback = '';
    await page.route('http://127.0.0.1:9/**', (route) => {
        callback = route.request().url();
        return route.fulfill({ body: 'ok' });
    });
    await page.goto(
        `${BACKEND}/oauth/authorize?${new URLSearchParams({ response_type: 'code', client_id: reg.client_id, redirect_uri: redirectUri, code_challenge: challenge, code_challenge_method: 'S256', state: 'st' })}`,
    );
    await expect(page.getByRole('heading', { name: /Let Claude use your SketchSync boards/ })).toBeVisible();
    await page.getByRole('button', { name: 'Allow' }).click();
    await expect.poll(() => callback).toContain('code=');
    const code = new URL(callback).searchParams.get('code')!;
    expect(new URL(callback).searchParams.get('state')).toBe('st');
    const tokens = await (
        await fetch(`${BACKEND}/oauth/token`, {
            method: 'POST',
            headers: { 'content-type': 'application/x-www-form-urlencoded' },
            body: new URLSearchParams({ grant_type: 'authorization_code', code, code_verifier: verifier, client_id: reg.client_id, redirect_uri: redirectUri }),
        })
    ).json();

    const client = new Client({ name: 'claude-ai', version: '1.0.0' });
    await client.connect(new StreamableHTTPClientTransport(new URL(`${BACKEND}/mcp`), { requestInit: { headers: { authorization: `Bearer ${tokens.access_token}` } } }));
    const listed = (await client.callTool({ name: 'list_boards', arguments: {} })) as { structuredContent: { boards: { name: string }[] } };
    expect(listed.structuredContent.boards.map((b) => b.name).sort()).toEqual(['Board A', 'Board B']);

    // Open board A in the browser and have the AI draw on A and B by name.
    await page.goto(`/board/${boardA}`);
    await waitOnline(page);
    const add = (board: string, label: string) => client.callTool({ name: 'add_shapes', arguments: { board, shapes: [{ type: 'rect', x: 200, y: 200, width: 160, height: 80, label }] } });
    expect(((await add('Board A', 'Hello from Claude')) as { isError?: boolean }).isError).toBeFalsy();
    expect(((await add('board b', 'Also here')) as { isError?: boolean }).isError).toBeFalsy();
    await waitForShapes(page, (s) => s.some((x) => x.type === 'rect' && x.label?.text === 'Hello from Claude'));
    await expect(page.getByText(/Claude/).first()).toBeVisible();
    await page.goto(`/board/${boardB}`);
    await waitOnline(page);
    await waitForShapes(page, (s) => s.some((x) => x.type === 'rect' && x.label?.text === 'Also here'));

    // It shows as connected and can be disconnected.
    await page.goto('/boards');
    const connector = page.getByTestId('ai-connector');
    await expect(connector).toContainText('Claude');
    await connector.getByRole('button', { name: 'Disconnect Claude' }).click();
    await expect(connector).toContainText('None yet');
    await client.close().catch(() => undefined);
});

test('a deleted board stays deleted, even for tabs that still have it open', async ({ page, browser }) => {
    await signIn(page, 'deleter', 'Dee Deleter');
    await page.waitForURL('**/boards');
    const id = await createBoard(page, 'Temporary');
    await selectTool(page, 'rect');
    await drag(page, [500, 400], [700, 520]);
    await waitForShapes(page, (s) => s.length === 1);

    const guest = await newPage(browser);
    await guest.goto(`/board/${id}`);
    await waitOnline(guest);
    await waitForShapes(guest, (s) => s.length === 1);

    await page.goto('/boards');
    page.once('dialog', (d) => d.accept());
    await page.getByRole('button', { name: 'More actions for Temporary' }).click();
    await page.getByRole('button', { name: 'Delete board' }).click();
    await expect(page.getByTestId('board-card').filter({ hasText: 'Temporary' })).toHaveCount(0);

    await expect(guest.getByRole('alertdialog')).toContainText('no longer available');
    // Reloading (with the board still cached in this browser) doesn't bring it back.
    await guest.reload();
    await expect(guest.getByRole('alertdialog')).toContainText('no longer available');
    await page.reload();
    await expect(page.getByTestId('board-card').filter({ hasText: 'Temporary' })).toHaveCount(0);
});
