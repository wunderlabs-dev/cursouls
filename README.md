<p align="center">
  <a href="https://cursouls.xyz">
    <img src="https://cursouls.xyz/images/og.png" alt="Cursouls" width="600" />
  </a>
</p>

<h2 align="center">Cursouls</h2>

<p align="center">
  Your AI agents write code, fix bugs, and run tests all day.<br/>
  The least you can do is give them a cafe.
</p>

<p align="center">
  <em>You'll find yourself glancing at the sidebar just to see what they're up to.</em>
</p>

<p align="center">
  <a href="https://marketplace.visualstudio.com/items?itemName=wunderlabs.cursouls">VS Code Marketplace</a> &middot;
  <a href="https://open-vsx.org/extension/wunderlabs/cursouls">Open VSX</a> &middot;
  <a href="https://cursouls.xyz">Website</a> &middot;
  <a href="https://github.com/wunderlabs-dev/cursouls/issues">Issues</a>
</p>

<p align="center">
  <img src="https://img.shields.io/open-vsx/v/wunderlabs/cursouls?label=version&color=blue" alt="version" />
  <img src="https://img.shields.io/open-vsx/dt/wunderlabs/cursouls?label=downloads&color=green" alt="downloads" />
  <img src="https://img.shields.io/open-vsx/rating/wunderlabs/cursouls?label=rating&color=yellow" alt="rating" />
  <img src="https://img.shields.io/badge/license-MIT-brightgreen" alt="license" />
  <img src="https://img.shields.io/badge/TypeScript-strict-blue" alt="TypeScript strict" />
  <img src="https://img.shields.io/badge/agents-Cursor%20%C2%B7%20Claude%20Code%20%C2%B7%20Codex%20%C2%B7%20OpenCode-purple" alt="supported agents" />
</p>

---

## Your Agent Deserves Better Than a Terminal

You kicked off four agents. One is refactoring auth, another is writing tests, a third is fixing that CSS bug you've been ignoring. They're all working hard.

But where are they? Buried in terminal tabs. Status bars. Log files. You have no idea who's done, who's stuck, or who needs your attention.

**Cursouls** gives your agents a place to exist. A cozy pixel cafe where each agent becomes a character you can see. When they work, they animate. When they finish, they celebrate. When they fail, you know instantly. When they need clarification, they let you know.

Glance at the sidebar. Characters moving? Work is happening. Character celebrating? Something just shipped. Character looking confused? Time to check in.

It's ambient awareness for your AI workflow.

---

## What You Actually See

| Your agent is...       | The cafe shows...                                         |
| ---------------------- | --------------------------------------------------------- |
| Starting a new task    | Character spawns into the cafe (48-frame entrance)        |
| Writing or editing code| Character works busily at their spot                      |
| Idle, between tasks    | Character hangs out, waiting for the next job             |
| Task completed         | Character celebrates (unique 39-frame animation)          |
| Task failed            | Character shows visible distress                          |
| Needs clarification    | Character signals confusion, waiting for your input       |

Six distinct visual states. You read the room, not the logs.

---

## Works With Every Major AI Agent

Most extensions lock you into a single AI provider. Cursouls works with all of them at once, in the same cafe.

- **Cursor** agents
- **Claude Code** agents
- **Codex** agents
- **OpenCode** agents

Four agents from different providers, all visible side by side. Powered by [@agentprobe/core](https://www.npmjs.com/package/@agentprobe/core), which handles provider detection and lifecycle tracking automatically.

---

## The Cafe Is Alive

This isn't a static dashboard. The cafe is a pixel scene with furniture, plants, a barista counter, and room to breathe.

- **4 unique character skins**: each agent gets its own look
- **Scrollable scene**: drag to pan with spring physics (it feels like a game, not a panel)
- **Hover for details**: task summaries appear as marquee bubbles above characters
- **Barista counter**: click it (because why not)
- **Dialog box**: typewriter-effect messages announce agent events as they happen

---

## Zero Configuration

Cursouls watches the transcript files your agents already write. No API keys. No patches. No config files. Install it, open a workspace, and the cafe populates automatically as agents join.

---

## Install

**From the extensions panel**

Search **"Cursouls"** in the Extensions panel (`Cmd+Shift+X`) and click Install.

**From source**

```bash
git clone https://github.com/wunderlabs-dev/cursouls.git
cd cursouls
npm install && npm run build
npx @vscode/vsce package --no-dependencies
```

Then in your editor: `Cmd+Shift+P` > "Install from VSIX" > select `cursouls-0.1.1.vsix`.

---

## Development

```bash
npm install
npm run build
```

| Command              | Description                  |
| -------------------- | ---------------------------- |
| `npm run build`      | Build extension + webview    |
| `npm run watch`      | Start dev watcher            |
| `npm run check`      | Full quality gate            |
| `npm run typecheck`  | Type-check only              |
| `npm test`           | Run tests                    |
| `npm run lint`       | Biome + ESLint               |

---

## Authors

Created by [Vlad Temian](https://x.com/vtemian) and [Marius Balaj](https://x.com/balajmarius).

Powered by [@agentprobe/core](https://www.npmjs.com/package/@agentprobe/core).
