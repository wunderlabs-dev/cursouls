# Cursor Cafe React + Phaser Migration Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use `superpowers:executing-plans` to implement this plan task-by-task.

**Goal:** Migrate the current webview renderer to React + Phaser while preserving the existing extension host pipeline, message contracts, seat allocation semantics, and queue behavior.

**Architecture:** Keep extension host (`src/extension.ts`, sources, store, polling) as the authoritative data layer. Replace webview DOM string renderer with a React app shell that embeds a Phaser scene for table/seated-agent rendering, while React owns queue portraits, health header, and tooltip UI. Maintain host<->webview message protocol compatibility.

**Tech Stack:** TypeScript, React (latest), ReactDOM (latest), Phaser (latest), esbuild, vitest, VS Code/Cursor webview APIs.

---

## Scope and Constraints

- Preserve current contributed view id: `cursorCafe.sidebar`.
- Preserve current command: `cursorCafe.refresh`.
- Preserve current message types:
  - webview -> host: `ready`, `agentClick`
  - host -> webview: `sceneFrame`, `tooltipData`, `hideTooltip`
- Preserve current `SceneFrame` and `AgentSnapshot` contracts in `src/types.ts`.
- Preserve fixed table count behavior for v1 (6 seats) and overflow queue portraits.
- No remote assets; all scripts/styles/assets must be local webview resources.
- Keep strict CSP model in `src/webview/webview.html.ts`.

## Version Targets (checked at planning time)

- `react`: `19.2.4`
- `react-dom`: `19.2.4`
- `phaser`: `3.90.0`
- `@types/react`: `19.2.14`
- `@types/react-dom`: `19.2.3`

## Current-State Risks to Fix First

1. `auto` source mode can become mock-only due to missing transcript options wiring.
2. `PollingController.start()` can wedge if `connect()` throws before rollback.
3. Continuous unused RAF loop in `src/webview/renderer/animator.ts` wastes CPU.
4. Typecheck scope is too narrow (currently extension-centric).

---

## Phase 1: Stabilization Before Renderer Migration

### Task 1: Fix source selection and transcript-first behavior

**Files:**
- Modify: `src/extension.ts`
- Modify: `src/agent-source/index.ts`
- Modify: `src/config.ts`
- (Optional) Create: `src/agent-source/discovery.ts`
- Test: `test/unit/AgentSourceFactory.test.ts` (new)

**Step 1: Write failing tests**
- Add tests for `createAgentSource()` precedence:
  - `mode=mock` -> mock
  - `mode=auto` with transcript paths -> transcript source
  - transcript failure path -> mock fallback (if fallback orchestrated in extension layer)

**Step 2: Run tests (fail first)**
- Run: `npm test -- AgentSourceFactory`
- Expected: FAIL due to missing/incorrect behavior.

**Step 3: Implement minimal fix**
- Wire transcript discovery/path config in activation flow.
- Ensure `auto` mode attempts transcript source before fallback to mock.

**Step 4: Re-run tests**
- Run: `npm test -- AgentSourceFactory`
- Expected: PASS.

**Step 5: Verify full suite**
- Run: `npm test`
- Expected: existing tests remain green.

### Task 2: Harden polling lifecycle and startup failure handling

**Files:**
- Modify: `src/state/PollingController.ts`
- Test: `test/unit/PollingController.test.ts`

**Step 1: Add failing tests**
- `start()` rolls back if `connect()` throws and allows retry.
- stop during in-flight poll does not emit stale frames.

**Step 2: Run targeted tests (fail first)**
- Run: `npm test -- PollingController`
- Expected: FAIL on new cases.

**Step 3: Implement lifecycle guards**
- Set `running=true` only after successful connect, or rollback on catch.
- Re-check running state after awaited reads before emitting listeners.

**Step 4: Re-run tests**
- Run: `npm test -- PollingController`
- Expected: PASS.

### Task 3: Remove or gate unnecessary animation loop

**Files:**
- Modify: `src/webview/renderer/animator.ts`
- Modify: `src/webview/webview-main.ts`
- Test: `test/unit/scene.test.ts` (as needed)

**Step 1: Decide behavior**
- Remove `Animator` if unused, or guard by an actual consumer flag/visibility.

**Step 2: Implement minimal change**
- Prefer complete removal if no visual dependency exists.

**Step 3: Verify**
- Run: `npm run build && npm test`
- Expected: no regressions.

---

## Phase 2: TypeScript and Build System Split for Dual Runtime

### Task 4: Split tsconfig for extension host vs webview app

**Files:**
- Create: `tsconfig.extension.json`
- Create: `tsconfig.webview.json`
- Modify: `tsconfig.json`
- Modify: `package.json`

**Step 1: Create host tsconfig**
- Node + VS Code types; include host files under `src/**` excluding React app internals if needed.

**Step 2: Create webview tsconfig**
- DOM libs + JSX support.
- Include `src/webview/**/*.ts` and `src/webview/**/*.tsx`.

**Step 3: Update scripts**
- Add:
  - `typecheck:extension`
  - `typecheck:webview`
  - `typecheck` runs both.

**Step 4: Verify**
- Run:
  - `npm run typecheck:extension`
  - `npm run typecheck:webview`
  - `npm run typecheck`
- Expected: PASS.

### Task 5: Install and lock latest React/Phaser deps

**Files:**
- Modify: `package.json`
- Modify: `package-lock.json`

**Step 1: Add dependencies**
- `react`, `react-dom`, `phaser`.

**Step 2: Add type dependencies**
- `@types/react`, `@types/react-dom`.

**Step 3: Verify install**
- Run: `npm install`
- Expected: lockfile updates successfully.

---

## Phase 3: Introduce React Shell (Protocol-Compatible)

### Task 6: Create React webview app entrypoint and bridge hooks

**Files:**
- Create: `src/webview/main.tsx`
- Create: `src/webview/react/App.tsx`
- Create: `src/webview/react/hooks/useVsCodeBridge.ts`
- Create: `src/webview/react/types.ts`
- Modify: `src/webview/webview.html.ts`
- Modify: `esbuild.mjs`

**Step 1: Write failing integration test (bridge contract)**
- Add test file:
  - `test/unit/webview-bridge.test.ts`
- Verify message envelope compatibility with current protocol.

**Step 2: Implement app shell**
- Mount React root.
- Send `ready` message on startup.
- Receive and store latest `SceneFrame`.
- Preserve ability to send `agentClick`.

**Step 3: Bundle new entrypoint**
- Switch webview entry from `src/webview/webview-main.ts` to `src/webview/main.tsx` (or keep old entry delegating to React root).

**Step 4: Verify**
- Run:
  - `npm run build`
  - `npm test -- webview-bridge`
- Expected: PASS.

### Task 7: Move health bar, queue portraits, and tooltip to React components

**Files:**
- Create: `src/webview/react/components/HealthBanner.tsx`
- Create: `src/webview/react/components/QueueBar.tsx`
- Create: `src/webview/react/components/TooltipCard.tsx`
- Create: `src/webview/react/components/CafeLayout.tsx`
- Modify: `src/webview/styles/cafe.css`
- Modify: `src/webview/styles/pixel.css`

**Step 1: Build components with existing semantics**
- Health label and warning class behavior must match current UI.
- Queue chips: same cap/overflow semantics.
- Tooltip fields: `name`, `status`, `task`, `elapsed`, `updated`.

**Step 2: Click behavior**
- Queue chip click sends `agentClick` with `anchor="queue"`.
- Keep local fallback tooltip, then reconcile with host `tooltipData`.

**Step 3: Add tests**
- Create:
  - `test/unit/QueueBar.react.test.tsx`
  - `test/unit/TooltipCard.react.test.tsx`
- Validate escaping and click dispatch.

**Step 4: Verify**
- Run: `npm test -- QueueBar.react TooltipCard.react`
- Expected: PASS.

---

## Phase 4: Integrate Phaser Scene for Cafe Tables and Agent Sprites

### Task 8: Create Phaser scene wrapper and lifecycle-safe React integration

**Files:**
- Create: `src/webview/phaser/CafePhaserScene.ts`
- Create: `src/webview/react/components/PhaserCanvas.tsx`
- Create: `src/webview/phaser/sceneModel.ts`
- Create: `src/webview/phaser/spriteFactory.ts`
- Modify: `src/webview/react/App.tsx`

**Step 1: Phaser wrapper component**
- Create Phaser game on mount.
- Destroy game on unmount.
- Expose `applyFrame(frame: SceneFrame)` path.

**Step 2: Render fixed table layout**
- Hardcode 6 table anchors for v1.
- Seat sprites/laptop/coffee visuals tied to seat occupancy.

**Step 3: Support sprite clicks**
- Seated agent click sends `agentClick` with `anchor="seat"`.

**Step 4: Add tests**
- Create:
  - `test/unit/PhaserCanvas.lifecycle.test.tsx`
  - `test/unit/sceneModel.test.ts`
- Validate mount/unmount cleanup and deterministic seat mapping conversion.

**Step 5: Verify**
- Run: `npm run build && npm test`
- Expected: PASS.

### Task 9: Implement status animations in Phaser

**Files:**
- Modify: `src/webview/phaser/CafePhaserScene.ts`
- Modify: `src/webview/phaser/spriteFactory.ts`

**Step 1: Animation mapping**
- `running`: typing loop + steam loop.
- `idle`: breathing + occasional sip.
- `completed`: short check bubble then idle.
- `error`: warning indicator + stop typing.

**Step 2: Update semantics**
- Poll updates should not recreate all sprites each frame.
- Maintain sprite instances keyed by `agent.id`.

**Step 3: Verify manually**
- Launch extension host and inspect transitions.

---

## Phase 5: Retire Legacy DOM Renderers Safely

### Task 10: Remove legacy renderer modules after parity

**Files:**
- Delete (or deprecate):
  - `src/webview/renderer/layout.ts`
  - `src/webview/renderer/scene.ts`
  - `src/webview/renderer/queue-bar.ts`
  - `src/webview/renderer/tooltip.ts`
  - `src/webview/renderer/animator.ts`
  - (optional) `src/webview/webview-main.ts`
- Modify: imports in remaining webview files.

**Step 1: Confirm parity checklist**
- Queue behavior, tooltip behavior, click flow, health banner, seat rendering, status animations.

**Step 2: Remove dead code**
- Delete old renderers only after tests and manual checks pass.

**Step 3: Verify**
- Run: `npm run build && npm test`
- Expected: PASS with no references to removed modules.

---

## Phase 6: Quality Gates, Performance, and Docs

### Task 11: Add targeted contract and performance tests

**Files:**
- Create: `test/unit/message-contract.test.ts`
- Create: `test/unit/health-banner.test.tsx`
- Modify: `vitest.config.ts`

**Step 1: Contract tests**
- Ensure message envelopes remain unchanged.

**Step 2: Performance guardrails**
- Add regression checks for unnecessary loops/re-renders where practical.

**Step 3: Verify**
- Run: `npm test`

### Task 12: Documentation updates

**Files:**
- Modify: `README.md`
- Modify: `CHANGELOG.md`
- Modify: `docs/plans/2026-03-02-react-phaser-migration.md` (status section)

**Step 1: Update setup docs**
- Mention React/Phaser stack and scripts.

**Step 2: Add architecture diagram section**
- Host pipeline -> message bridge -> React shell -> Phaser scene.

**Step 3: Add migration notes**
- Explain preserved contracts and removed legacy modules.

---

## Parallel Subagent Execution Strategy

Use waves with isolated file ownership per subagent (max 4 in parallel):

- **Wave A (Stabilization):**
  1. Source wiring + config
  2. Polling lifecycle hardening
  3. Animator cleanup
  4. Tests for above

- **Wave B (Infrastructure):**
  1. TS config split + scripts
  2. Dependency installation + build updates
  3. Bridge contract tests
  4. Webview entry migration scaffolding

- **Wave C (UI Migration):**
  1. React shell components
  2. Queue + tooltip tests
  3. Phaser scene scaffold
  4. Phaser lifecycle tests

- **Wave D (Finalization):**
  1. Status animations in Phaser
  2. Remove legacy renderer files
  3. Full verification run
  4. Docs/changelog

Between waves: run full build/tests and request review before next wave.

---

## Verification Commands (required before completion)

Run in order:

1. `npm install`
2. `npm run typecheck`
3. `npm run build`
4. `npm test`

Manual runtime verification:

1. Launch extension host (`F5` via `.vscode/launch.json`).
2. Open `Cursor Cafe` sidebar.
3. Confirm:
   - 6 fixed table anchors.
   - agents seated deterministically.
   - queue portraits appear at bottom with overflow.
   - clicking seat or queue chip shows tooltip.
   - health banner updates from source status.
4. Run for several minutes and verify no runaway CPU behavior from webview loops.

---

## Commit Plan

- Commit 1: Stabilization fixes + tests.
- Commit 2: TS/build split + deps.
- Commit 3: React shell + bridge.
- Commit 4: Phaser scene + lifecycle.
- Commit 5: Animation polish + legacy renderer removal.
- Commit 6: docs/changelog and final cleanup.

Each commit should keep repository buildable and tests green.

---

## Exit Criteria

- React + Phaser power the webview UI.
- Host/source/store/polling contracts remain compatible.
- Queue portraits and tooltip behavior match prior semantics.
- Full test suite passes.
- Manual sidebar flow works in Cursor extension host.
- No obvious unnecessary animation loop overhead in idle state.
