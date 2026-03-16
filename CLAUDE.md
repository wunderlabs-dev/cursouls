# Cursor Cafe: Project Rules

## Cursor Integration

- Cursor-native rules are defined in `.cursor/rules/*.mdc`
- Keep this file aligned with those rules; `.mdc` files are the authoritative source for scoped guidance

## Writing

- Never use em dashes. Use colons for definitions, commas or parentheses for asides, and restructure sentences that rely on em dashes.

## Code Style

- No classes for business logic or UI components. Use factory functions (`createX`) with closed-over state, function components for React
- No nesting beyond 2 levels inside a function body. Prefer early returns and small helpers
- Max function length: 40 lines (skipBlankLines, skipComments)
- No magic numbers/strings. Use named constants. Place shared tunables in `constants.ts`
- No `any` types, no type assertions (`as Type`). Use Zod schemas or type guards to narrow
- Use `unknown` at system boundaries and normalize with Zod or `toError(...)` before handling
- No comments explaining *what*, only *why* when non-obvious
- Double quotes, semicolons, trailing commas (enforced by Biome)

## Architecture

- Split VS Code extension (`src/extension`) from browser webview (`src/webview`); shared contracts live in `src/shared`
- Agent observation/lifecycle logic lives in `@agentprobe/core`; do not duplicate it locally
- Extension side: services manage state and bridge; providers supply webview HTML
- Webview side: containers handle bridge state and effects; components render UI deterministically
- Use named exports only; do not add default exports in `src`
- Re-export public APIs through barrel files (`index.ts`)

## React + Tailwind Patterns

- Use function components only
- Split orchestration from presentation:
  - `containers/` handle bridge state, effects, and derived data
  - `components/` and `components/ui/` render UI
- Extract reusable logic into hooks or utility modules instead of large component bodies
- Type component props with `type` aliases (`ComponentNameProps`)
- Use Tailwind utilities as the default styling mechanism
- Use a shared `cn()` helper (`clsx` + `tailwind-merge`) for class composition
- Use `class-variance-authority` (`cva`) for component variants/state classes
- Keep state styling explicit (`running`, `idle`, `completed`, `error`) and visually distinct

## TypeScript

- Names are contracts: domain-meaningful, no `data`/`result`/`temp`
- Prefer single-word names. Drop redundant prefixes (`allWarnings` -> `warnings`, `currentFiles` -> `files`). Context (scope, parameter position, containing object) should carry the qualifier, not the name
- No type names in identifiers (no Hungarian notation): avoid suffixes like `Map`, `Array`, `List`, `String`, `Object`, `Set`, `Dict`, `Number`, `Boolean`, `Fn`, `Func`, `Callback`. Name by what it holds in the domain, not its data structure
- Prefer `interface` for contracts and `type` for unions/aliases
- Discriminated unions over class hierarchies
- Use `as const` constant maps for statuses/events and derive union types from them
- Use `import type` for type-only imports
- Explicit return types on exported functions
- `readonly` on data structures that shouldn't mutate

## File and Naming Conventions

- Use lowercase kebab-case file names
- Use clear, specific module names (`health-banner`, `queue-strip`, `cafe-app-container`), not vague names
- Group by feature/domain before by technical type when practical
- Keep constants in dedicated modules; avoid magic values in JSX bodies

## Module Structure

- Order files as: imports -> exported types/constants -> internal constants/schemas -> main factory/component -> private helpers
- Keep comments sparse and only for non-obvious behavior

## Imports and Paths

- Use `@ext/*`, `@web/*`, `@shared/*` aliases for cross-folder project imports
- Use `./` relative imports within the same folder
- No parent-relative imports (`../`) where path aliases are appropriate

## Engineering Principles

- DRY: extract shared patterns, no copy-paste
- YAGNI: no speculative features or unused abstractions
- Fail fast: validate inputs early, return/throw before the happy path
- Dependency injection: pass dependencies in, don't import singletons
- Errors are values: custom error types with context, no bare `catch {}`

## Event and Runtime Safety

- Never let listener exceptions break loops; wrap fan-out callbacks in `try/catch`
- Make cleanup best-effort (`disconnect/close/unsubscribe` should not mask primary failures)
- Ensure seat/agent state transitions are animation-safe (no stale tweens/timers/effects)
- Handle overflow capacity explicitly (queue behavior must remain stable and visible)

## Testing

- Test real behavior, not mocked behavior. If a mock is the only thing being verified, the test is wrong
- Mock data, not behavior. Inject test data, don't spy on implementation details
- All error paths must have tests
- All public exports must have tests
- Test output must be pristine. Capture and validate expected errors
- Place tests in `test/unit/*.test.ts` with behavior-focused `it(...)` names
- Prefer condition polling helpers (`waitUntil` style) over fixed sleeps

## Tooling

- `npm run check` runs the full quality gate: `biome check ./src ./test && eslint . && tsc --noEmit && vitest run`
- Pre-commit hook runs Biome format + ESLint on staged files via lint-staged
- Run `npm run check` after substantive changes. If build/runtime-sensitive code changed, also run `npm run build`
