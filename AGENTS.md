# Webview Engineering Rules

This document defines the implementation style for the `src/webview/` module. Apply these rules unless explicitly asked otherwise.

## Project Overview

VS Code extension sidebar webview built with React 19, TypeScript, and Tailwind CSS v4. Bundled with esbuild.

## Commands

- `npm run typecheck` — type-check extension and webview
- `npm run lint` — run Biome linter
- `npm run check` — run Biome checks
- `npm run format` — format with Biome
- `npm run test` — run Vitest
- `npm run compile` — build CSS + bundle

Always run `npm run lint` and `npm run typecheck` after making changes.

## Project Structure

```
src/webview/
├── main.tsx          # Entry point (mount React app, create bridge, cleanup)
├── bridge/           # VS Code ↔ webview communication
│   ├── bridge.ts     # VsCodeBridge: message parsing, buffering, subscribe/post
│   └── types.ts      # Re-exported bridge types from @shared/bridge
├── components/       # React components
│   └── agent-panel.tsx
└── helpers/          # Constants, utilities, formatting
    ├── constants.ts
    └── present.ts
```

## Code Conventions

### Core Principles

- Never use classes for app logic or UI components.
- Use functional composition (functions, hooks, object modules).
- Prefer one canonical way for each concern. Avoid parallel patterns for the same job.

### Component Structure

- Use function components only.
- Type component props with `type` or `interface` aliases (`ComponentNameProps`).
- Prefer `import type` for type-only imports.
- Prefer named exports. No default exports.

### Naming Conventions

- **Files**: lowercase kebab-case (`agent-panel.tsx`, `constants.ts`)
- **Types**: `ComponentNameProps`
- **Constants**: UPPER_SNAKE_CASE (`FEED_BUFFER_LIMIT`)

### Styling

Tailwind CSS v4 utility classes. No CSS files beyond the global Tailwind entry point.

### Import Order

1. React imports
2. External libraries
3. Type imports from `@shared/`
4. Imports from `@shared/`
5. Imports from `@web/`

Path aliases: `@web/*` → `src/webview/*`, `@shared/*` → `src/shared/*`.

### Code Quality

- No nested `try/catch`.
- No dead code, unused exports, or deprecated paths after refactors.
- Keep modules focused and small.
- Agent observation/lifecycle logic lives in `@agentprobe/core`; do not duplicate it locally.
- Webview consumes data through the bridge and renders deterministically.
