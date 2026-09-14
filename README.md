## SketchSync

SketchSync is a collaborative online whiteboard. Sketch, diagram and brainstorm together in real time, and connect your AI assistant so it can draw with you: flowcharts, labelled diagrams, step-by-step math, or comments on what you sketched.

[Checkout backend source code](https://github.com/sahaniindrajit/sketchsync-Backend)

## Features

- **Drawing tools:** rectangles, ellipses, diamonds, arrows and lines that stick to shapes, freehand pencil, text, LaTeX math, images and an eraser. Includes select, move, resize and rotate, multi-select, pan and zoom.
- **Real-time collaboration:** share a board link and everyone edits live. Edits made offline are kept and synced when you reconnect.
- **Connect your AI (MCP):** every board has an MCP server URL. Add it to Claude, Claude Code, Cursor, VS Code or any MCP client. The AI can read the board, see a rendered image of it (including hand drawings), add and edit shapes, create auto-laid-out flowcharts and write worked solutions with real math.
- **Export:** download the board as a PNG.
- Works on desktop and mobile. Boards are cached locally and survive reloads and server restarts.

## Getting started

```bash
npm install
cp .env.example .env.local   # point VITE_BACKEND_URL at your backend (defaults to the hosted one)
npm run dev                  # http://localhost:5173
```

Run the [backend](https://github.com/sahaniindrajit/sketchsync-Backend) next to it (`npm run dev` in `sketchsync-Backend`, port 3000).

### Connect an AI to a board

Open a board, click **AI** (top right) and follow the steps for your client, for example:

```bash
claude mcp add --transport http sketchsync https://<backend>/mcp/<boardId>
```

Then ask: *"Draw a flowchart of our signup process"* or *"Solve 2x² − 8x + 6 = 0 step by step on the board"*.

## Scripts

| Script | What it does |
|---|---|
| `npm run dev` | Vite dev server |
| `npm run build` | Type-check and build to `dist/` |
| `npm test` | Unit tests plus sync integration tests against the real backend (needs `../sketchsync-Backend`) |
| `npm run e2e` | Playwright end-to-end tests (starts the backend and frontend). `E2E_PROD=1 npm run e2e` runs against production builds |
| `npm run sync-protocol` | Copy the shared protocol from `../sketchsync-Backend/src/shared` |
| `npm run protocol:check` | Fail if `src/shared` is out of date (use in CI) |

First-time e2e setup: `npx playwright install chromium`.

## Project structure

```
src/
  board/          Board canvas (Konva), store (zustand), RoomSync (realtime sync), persistence, text/math editor
  board/shapes/   Konva renderers per shape type (math via MathJax, lazy-loaded)
  components/     toolbar, style panel, menu, share / Connect AI dialogs, status and AI activity
  pages/          landing page and board routes (/board, /board/:id, legacy /live?roomId=)
  shared/         GENERATED copy of the backend's protocol, geometry and reducer; don't edit here
e2e/              Playwright tests
test/             integration tests that run the real backend
```

## Contribution Guidelines

1. Fork the repository and create a branch: `git checkout -b feature-branch-name`
2. Make your changes. Run `npm test` and `npm run e2e`.
3. Commit, push, and open a pull request with a description of your changes.
