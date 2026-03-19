<p align="center">
  <a href="https://cursouls.xyz">
    <img src="https://cursouls.xyz/images/og.png" alt="Cursouls" width="600" />
  </a>
</p>

<h3 align="center">Cursouls</h3>

<p align="center">
  Turn your Cursor into tiny pixel characters that live in a cozy cafe<br/>with your AI agents, reacting, assisting, and keeping you company while you work.
</p>

<p align="center">
  <a href="https://cursouls.xyz">Website</a> &middot;
  <a href="https://marketplace.visualstudio.com/items?itemName=wunderlabs.cursouls">Marketplace</a>
</p>

---

### Install

Search for **Cursouls** in the Cursor/VS Code extension marketplace, or visit [cursouls.xyz](https://cursouls.xyz) and click "Install Extension".

### Settings

| Setting                | Default | Description                                    |
| ---------------------- | ------- | ---------------------------------------------- |
| `cursorCafe.refreshMs` | 250     | How often to poll for transcript changes (ms)  |

### Development

```bash
npm install
npm run build
```

### Scripts

| Command              | Description                  |
| -------------------- | ---------------------------- |
| `npm run build`      | Build extension + webview    |
| `npm run watch`      | Start dev watcher            |
| `npm run check`      | Full quality gate            |
| `npm run typecheck`  | Type-check only              |
| `npm test`           | Run tests                    |
| `npm run lint`       | Biome + ESLint               |

### Authors

Created by [Vlad Temian](https://x.com/vtemian) and [Marius Balaj](https://x.com/balajmarius).

Powered by [@agentprobe/core](https://www.npmjs.com/package/@agentprobe/core).
