---
name: cursouls release infrastructure
description: CI workflow, tag conventions, and known annotations for the cursouls project releases
type: project
---

CI workflow name: "Release to Open VSX" (`.github/workflows/release.yml` or similar). It triggers on tag push.

Steps it runs: checkout, setup-node, npm ci, npm run check, vsce package --no-dependencies, publish to Open VSX, upload .vsix to GitHub Release.

Tag convention: `v<major>.<minor>.<patch>` (e.g. `v0.1.7`). Annotated tags only.

Commit convention for releases: `release: v<version>` (no scope).

**Why:** Observed across v0.1.5, v0.1.6, v0.1.7 runs.

**How to apply:** Always use annotated tags; always use `release: v<version>` as the commit message; stage only `package.json` and `CHANGELOG.md` for the release commit.

Known CI annotations (non-blocking):
1. Node.js 20 deprecation warning for `actions/checkout@v4`, `actions/setup-node@v4`, `softprops/action-gh-release@v2`. These still pass as of 2026-03-20. Will become failures when GitHub forces Node.js 24 by default on 2026-06-02. Vlad should update workflow action versions before that date.
2. "The process '/usr/bin/git' failed with exit code 128" annotation on `.github#10` -- this appears at the cleanup/post stage and does not fail the job. Likely a detached-HEAD git operation in post-steps. Non-blocking.

Previous failing release: v0.1.4 failed (reason not investigated in this session).
