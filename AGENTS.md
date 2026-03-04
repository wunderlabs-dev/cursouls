# Cursor UI Engineering Rules

This document defines the default implementation style for this repository.
Apply these rules unless the user explicitly asks otherwise.

## Core Principles

- Prefer one canonical way for each concern. Avoid parallel patterns for the same job.
- Keep implementations simple, explicit, and easy to review.
- Never use classes for app logic or UI components.
- Use functional composition (functions, hooks, object modules).

## React + TypeScript Patterns

- Use function components only.
- Split orchestration from presentation:
  - `containers/` handle bridge state, effects, and derived data.
  - `components/` and `components/ui/` render UI.
- Extract reusable logic into hooks or utility modules instead of large component bodies.
- Type component props with `type` aliases (`ComponentNameProps`).
- Prefer `import type` for type-only imports.
- Prefer named exports in shared code; keep default exports for framework entry points only.

## Tailwind Patterns

- Use Tailwind utilities as the default styling mechanism.
- Use a shared `cn()` helper (`clsx` + `tailwind-merge`) for class composition.
- Use `class-variance-authority` (`cva`) for component variants/state classes.
- Keep semantic custom styles in Tailwind layers when needed; avoid ad hoc CSS files.
- Keep state styling explicit (`running`, `idle`, `completed`, `error`) and visually distinct.

## File and Naming Conventions

- Use lowercase kebab-case file names.
- Use clear, specific module names (`health-banner`, `queue-strip`, `cafe-app-container`), not vague names.
- Group by feature/domain before by technical type when practical.
- Keep constants in dedicated modules; avoid magic values in JSX bodies.

## UI/State Integration Rules

- `shared/watch/*` is backend watch logic; do not modify unless explicitly requested.
- Webview consumes frame/tooltip/lifecycle data through the bridge and renders deterministically.
- Ensure seat/agent state transitions are animation-safe (no stale tweens/timers/effects).
- Handle overflow capacity explicitly (queue behavior must remain stable and visible).

## Code Quality Constraints

- No nested `try/catch`.
- No dead code, unused exports, or deprecated paths after refactors.
- Keep modules focused and small; split when responsibilities diverge.
- Run typecheck + compile after substantial UI changes.

## Quick Checklist Before Finishing

- Is the change functional-first (no classes)?
- Does it follow container/presentational boundaries?
- Are Tailwind patterns consistent (`cn`, `cva`, utility-first)?
- Are naming and structure aligned with these rules?
- Did we verify typecheck and build?
