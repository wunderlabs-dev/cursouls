# Cursor Cafe

Cursor/VS Code extension that renders a pixel-art cafe sidebar showing active agents from Cursor transcript files.

## Current behavior

- Uses transcript-only ingestion (no mock source).
- Discovers transcript files for the current workspace-derived Cursor project.
- Parses transcript lines into agent snapshots and updates a 6-table cafe scene.
- Shows queue overflow chips and tooltip details for clicked agents.
- Uses file/watch-driven updates (no fixed polling loop) and pushes scene frames to the webview.

## Extension contributions

- Activity bar container: `cursorCafe`
- Webview sidebar view: `cursorCafe.sidebar`
- Command: `cursorCafe.refresh`

## Development

```bash
npm install
npm run build
```

Run in watch mode:

```bash
npm run watch
```

Type-check:

```bash
npm run typecheck
```

Run tests:

```bash
npm test
```

Lint:

```bash
npm run lint
```

## Running locally

1. Open this workspace in Cursor/VS Code.
2. Start watcher (`npm run watch`) or build once (`npm run build`).
3. Press `F5` to launch Extension Development Host.
4. Open the **Cursor Cafe** activity bar icon.

If updates look stale, run `Cursor Cafe: Refresh` from command palette.
This command performs a one-shot refresh against the current transcript source/watch state and pushes the latest frame immediately.

## Configuration

- `cursorCafe.refreshMs`
  - Debounce window in milliseconds used to coalesce rapid transcript file-change bursts.
  - Clamped to min/max values defined in shared constants.

## Notes and limitations

- Agent status for conversation-style transcript lines is partially heuristic (time-window based) when explicit status fields are not present.
- Lifecycle events are derived from snapshot diffs (joined/status-changed/heartbeat/left) and are available through store/event services for internal consumers.
