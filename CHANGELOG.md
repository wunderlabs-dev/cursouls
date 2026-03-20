# Changelog

All notable changes to this project are documented in this file.

## v0.1.7 (2026-03-20)

### Features
- Add notification queue for agent join and status change events, with max 5 visible and 2.5s auto-dismiss (3037e94)
- Assign a random Faker alias to agents on join for display identity (2647add)

### Refactors
- Separate `handleBridgeEvent` into `handleActorJoined`, `handleActorStatusChanged`, and `handleActorLeft`; extract notification strings into `NOTIFICATION` constant map (770fdc6)
- Prefix typewriter constants with `TYPEWRITER_`; switch notification dismissal to FIFO keeping newest 3 (5fad41c)
- Replace inline animation identifiers with explicit named constants; remove non-null assertion fallbacks (e2eafc2)
- Use `lodash.uniqueId` for stable notification ID generation (e67a405)

### Chores
- Order Tailwind className attributes consistently across webview components (69b896f)

## [0.0.1] - 2026-03-02

- Scaffolded a minimal VS Code extension project with TypeScript + esbuild + Vitest.
- Added a custom activity bar container and `cursorCafe.sidebar` view contribution.
- Registered minimal `activate`, `deactivate`, and `cursorCafe.refresh` command behavior.
