import { initialsFor, spriteStatusClass, statusGlyph, type AgentStatus } from "./sprites";
import type { AgentSnapshot, SceneFrame } from "../../types";

export interface TooltipData {
  id: string;
  name: string;
  status: AgentStatus;
  task: string;
  elapsed: string;
  updated: string;
}

const TABLE_COUNT = 6;

export interface SeatViewModel {
  tableIndex: number;
  isEmpty: boolean;
  agent: AgentSnapshot | null;
  statusClass?: string;
  statusGlyph?: string;
}

export interface SceneViewModel {
  generatedAt: number;
  seats: SeatViewModel[];
  queue: AgentSnapshot[];
}

export function buildSceneModel(frame: SceneFrame): SceneViewModel {
  const byTable = new Map<number, AgentSnapshot | null>();
  frame.seats.forEach((seat) => byTable.set(seat.tableIndex, seat.agent));

  const seats: SeatViewModel[] = [];
  for (let tableIndex = 0; tableIndex < TABLE_COUNT; tableIndex += 1) {
    const agent = byTable.get(tableIndex) ?? null;
    if (!agent) {
      seats.push({ tableIndex, isEmpty: true, agent: null });
      continue;
    }

    seats.push({
      tableIndex,
      isEmpty: false,
      agent,
      statusClass: spriteStatusClass(agent.status),
      statusGlyph: statusGlyph(agent.status),
    });
  }

  return {
    generatedAt: frame.generatedAt,
    seats,
    queue: [...frame.queue],
  };
}

export const mapFrameToScene = buildSceneModel;

export class SceneRenderer {
  constructor(private readonly root: HTMLElement) {}

  public render(frame: SceneFrame): void {
    const view = buildSceneModel(frame);
    const tableMarkup = view.seats.map((seat) => renderSeat(seat.tableIndex, seat.agent));
    this.root.innerHTML = tableMarkup.join("");
  }
}

function renderSeat(tableIndex: number, agent: AgentSnapshot | null): string {
  if (!agent) {
    return `
      <article class="table-seat is-empty">
        <div class="table-anchor">Table ${tableIndex + 1}</div>
        <div class="table-surface"></div>
      </article>
    `;
  }

  const statusClass = spriteStatusClass(agent.status);
  const statusIcon = statusGlyph(agent.status);
  return `
    <article class="table-seat ${statusClass}">
      <div class="table-anchor">Table ${tableIndex + 1}</div>
      <button class="agent-sprite ${statusClass}" data-anchor="seat" data-agent-id="${escapeHtml(agent.id)}" type="button">
        <span class="agent-avatar">${escapeHtml(initialsFor(agent.name))}</span>
        <span class="agent-name">${escapeHtml(agent.name)}</span>
        <span class="agent-bubble" aria-hidden="true">${statusIcon}</span>
      </button>
      <div class="table-surface"></div>
    </article>
  `;
}

function escapeHtml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}
