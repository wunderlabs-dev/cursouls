import { initialsFor, spriteStatusClass } from "./sprites";
import type { AgentSnapshot } from "../../types";

type QueueAgent = Pick<AgentSnapshot, "id" | "name" | "status">;

export class QueueBarRenderer {
  constructor(private readonly root: HTMLElement) {}

  public render(queue: QueueAgent[]): void {
    if (queue.length === 0) {
      this.root.innerHTML = `<div class="queue-empty">No queue</div>`;
      return;
    }

    const chips = queue
      .slice(0, 8)
      .map((agent, index) => {
        const statusClass = spriteStatusClass(agent.status);
        return `
          <button class="queue-chip ${statusClass}" data-anchor="queue" data-agent-id="${escapeHtml(agent.id)}" type="button" title="${escapeHtml(agent.name)}">
            <span class="queue-chip-index">${index + 1}</span>
            <span class="queue-chip-avatar">${escapeHtml(initialsFor(agent.name))}</span>
          </button>
        `;
      })
      .join("");

    const overflow = queue.length > 8 ? `<div class="queue-overflow">+${queue.length - 8}</div>` : "";
    this.root.innerHTML = `<div class="queue-row">${chips}${overflow}</div>`;
  }
}

function escapeHtml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}
