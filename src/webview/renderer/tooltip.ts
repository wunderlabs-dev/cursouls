import type { TooltipData } from "./scene";

export class TooltipRenderer {
  constructor(private readonly root: HTMLElement) {}

  public show(tooltip: TooltipData): void {
    this.root.innerHTML = `
      <div class="tooltip-card">
        <div class="tooltip-title">${escapeHtml(tooltip.name)}</div>
        <div class="tooltip-line"><span>Status</span><strong>${escapeHtml(tooltip.status)}</strong></div>
        <div class="tooltip-line"><span>Task</span><strong>${escapeHtml(tooltip.task)}</strong></div>
        <div class="tooltip-line"><span>Elapsed</span><strong>${escapeHtml(tooltip.elapsed)}</strong></div>
        <div class="tooltip-line"><span>Updated</span><strong>${escapeHtml(tooltip.updated)}</strong></div>
      </div>
    `;
    this.root.classList.remove("is-hidden");
  }

  public hide(): void {
    this.root.classList.add("is-hidden");
    this.root.innerHTML = "";
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
