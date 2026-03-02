# Cursor Cafe Sidebar Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use `superpowers:executing-plans` to implement this plan task-by-task.

**Goal:** Build a Cursor extension that renders a pixel-art cafe sidebar where active agents sit at fixed tables (6 seats), work on laptops, drink coffee, and overflow into a bottom portrait queue.

**Architecture:** A VS Code/Cursor extension contributes a custom sidebar Webview View. The extension host polls local agent activity sources, normalizes records into a stable `AgentSnapshot` model, and sends scene updates to the webview. The webview renders a fixed cafe map, deterministic seat allocation, per-agent animation states, and tooltip interactions.

**Tech Stack:** TypeScript, VS Code Extension API (Cursor-compatible), Webview HTML/CSS/JS, `esbuild` bundle, `vitest` for unit tests, optional `@vscode/test-electron` smoke tests.

---

## Repository Layout

```text
cursor-cafe/
  .vscode/
    launch.json
    tasks.json
  docs/
    plans/
      2026-03-02-cursor-cafe-sidebar.md
  media/
    sprites/
      cafe-bg.png
      barista.png
      table.png
      laptop.png
      coffee.png
      agents/
        agent-1.png
        agent-2.png
      ui/
        bubble-check.png
        bubble-error.png
        queue-chip-frame.png
  src/
    extension.ts
    config.ts
    types.ts
    constants.ts
    logging.ts
    agent-source/
      AgentSource.ts
      CursorTranscriptSource.ts
      MockAgentSource.ts
      index.ts
    state/
      CafeStore.ts
      SeatAllocator.ts
      EventMapper.ts
      PollingController.ts
    webview/
      CafeViewProvider.ts
      webview.html.ts
      webview-main.ts
      renderer/
        scene.ts
        sprites.ts
        animator.ts
        layout.ts
        tooltip.ts
        queue-bar.ts
      styles/
        reset.css
        cafe.css
        pixel.css
  test/
    unit/
      SeatAllocator.test.ts
      EventMapper.test.ts
      CursorTranscriptSource.test.ts
      PollingController.test.ts
      scene.test.ts
    fixtures/
      transcripts/
        running.jsonl
        idle.jsonl
        completed.jsonl
        error.jsonl
  package.json
  tsconfig.json
  esbuild.mjs
  vitest.config.ts
  README.md
  CHANGELOG.md
```

## Functional Requirements (v1)

- Sidebar id: `cursorCafe.sidebar`.
- Fixed cafe layout with 6 static table coordinates.
- Agents map to seats in arrival order; seats remain sticky until departure.
- Overflow agents render as small portrait chips in a bottom queue bar.
- Click agent sprite/chip shows tooltip only: `name`, `status`, `task`, `elapsed`, `updated`.
- Status animations:
  - `running`: typing + coffee steam
  - `idle`: breathing + occasional sip
  - `completed`: short checkmark bubble then idle
  - `error`: red warning bubble + pause typing
- Data source: local Cursor artifacts first; fallback to mock mode with visible UI banner.

## Non-Functional Requirements

- Default poll interval: 1000ms (`cursorCafe.refreshMs`).
- No network dependencies in v1.
- Deterministic rendering (no jitter, no random seat swaps).
- Defensive parsing and degraded mode for missing/corrupt source files.
- Lightweight webview animation suitable for sidebar context.

## Data Contracts

```ts
type AgentStatus = "running" | "idle" | "completed" | "error";

interface AgentSnapshot {
  id: string;
  name: string;
  kind: "local" | "remote";
  status: AgentStatus;
  taskSummary: string;
  startedAt?: number;
  updatedAt: number;
  source: "cursor-transcripts" | "mock";
}

interface SceneFrame {
  generatedAt: number;
  seats: Array<{ tableIndex: number; agent: AgentSnapshot | null }>;
  queue: AgentSnapshot[];
  health: { sourceConnected: boolean; sourceLabel: string; warnings: string[] };
}
```

## Task Breakdown

### Task 1: Bootstrap extension skeleton

**Files**
- Create: `package.json`, `tsconfig.json`, `esbuild.mjs`, `vitest.config.ts`
- Create: `.vscode/launch.json`, `.vscode/tasks.json`
- Create: `src/extension.ts`, `README.md`, `CHANGELOG.md`

**Steps**
1. Initialize npm project and add TypeScript + VS Code extension build scripts.
2. Add extension contribution points for activity bar container and sidebar view.
3. Add minimal `activate()` to register view provider.
4. Verify: `npm run build`.

### Task 2: Core models and config

**Files**
- Create: `src/types.ts`, `src/constants.ts`, `src/config.ts`, `src/logging.ts`

**Steps**
1. Define shared interfaces and defaults.
2. Implement config reader with clamping and fallback values.
3. Create output channel logger helper.

### Task 3: Agent source abstraction + mock source

**Files**
- Create: `src/agent-source/AgentSource.ts`, `src/agent-source/MockAgentSource.ts`, `src/agent-source/index.ts`

**Steps**
1. Define source interface (`connect`, `disconnect`, `readSnapshot`).
2. Implement mock rotating source for deterministic demo scenes.
3. Add source factory with fallback path.

### Task 4: Cursor transcript source parser

**Files**
- Create: `src/agent-source/CursorTranscriptSource.ts`
- Create tests + fixtures in `test/unit/CursorTranscriptSource.test.ts`, `test/fixtures/transcripts/*.jsonl`

**Steps**
1. Implement transcript discovery strategy with optional config overrides.
2. Parse lines defensively, map raw records to `AgentSnapshot`.
3. Emit warnings for malformed data while preserving valid records.
4. Verify parser behavior with fixture-based tests.

### Task 5: Stateful seat allocation and frame store

**Files**
- Create: `src/state/SeatAllocator.ts`, `src/state/EventMapper.ts`, `src/state/CafeStore.ts`, `src/state/PollingController.ts`
- Create tests: `test/unit/SeatAllocator.test.ts`, `test/unit/EventMapper.test.ts`, `test/unit/PollingController.test.ts`

**Steps**
1. Implement deterministic seat assignment and queue overflow.
2. Implement status transition helpers.
3. Build polling controller and frame assembly pipeline.
4. Verify lifecycle, errors, and backoff in tests.

### Task 6: Sidebar webview provider and bridge

**Files**
- Create: `src/webview/CafeViewProvider.ts`, `src/webview/webview.html.ts`
- Modify: `src/extension.ts`

**Steps**
1. Register the webview view provider.
2. Wire postMessage flow extension -> webview with `SceneFrame`.
3. Wire click message flow webview -> extension for tooltip data.

### Task 7: Pixel cafe rendering layer

**Files**
- Create: `src/webview/webview-main.ts`
- Create: `src/webview/renderer/{layout.ts,scene.ts,sprites.ts,animator.ts,tooltip.ts,queue-bar.ts}`
- Create: `src/webview/styles/{reset.css,cafe.css,pixel.css}`

**Steps**
1. Render fixed cafe layout and six table anchors.
2. Render seated agent sprites with state-based animation classes.
3. Render queue strip with small portrait chips and overflow counter.
4. Implement click tooltip cards for seated and queued agents.

### Task 8: Integration polish and docs

**Files**
- Modify: `README.md`, `CHANGELOG.md`
- Optional placeholders in `media/sprites/**`

**Steps**
1. Add install/dev instructions and configuration docs.
2. Document known limitations and fallback behavior.
3. Add screenshots/GIF placeholders for future updates.

## Verification Checklist

Run:

```bash
npm run build
npm run test
```

Manual:

1. Launch Extension Development Host via `.vscode/launch.json`.
2. Open `Cursor Cafe` sidebar.
3. Confirm:
   - 6 fixed tables visible.
   - Active agents seated in stable order.
   - Overflow portraits shown in bottom queue.
   - Click shows tooltip with required fields.
   - Mock fallback banner appears when no local data source.

## Risks and Mitigations

- **Transcript format drift:** isolate parser and keep robust fallback to mock.
- **CPU usage in sidebar:** keep animations CSS-driven and avoid heavy JS loops.
- **Seat jitter:** sticky seat allocator keyed by `agent.id`.
- **File discovery slowness:** support explicit source path config and cap scanning.

## MVP Exit Criteria

- Sidebar renders fixed cafe scene with 6 tables.
- Seated pixel agents and bottom portrait queue are functional.
- Status animations + tooltips work end-to-end.
- Polling and fallback behavior are visible and stable.
- Build and tests pass locally.
