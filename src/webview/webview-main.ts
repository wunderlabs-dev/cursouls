import { createLayout } from "./renderer/layout";
import { Animator } from "./renderer/animator";
import { QueueBarRenderer } from "./renderer/queue-bar";
import type { SceneFrame } from "../types";
import { SceneRenderer, type TooltipData } from "./renderer/scene";
import { TooltipRenderer } from "./renderer/tooltip";

type OutboundMessage =
  | { type: "ready" }
  | { type: "agentClick"; agentId: string; anchor: "seat" | "queue" };

type InboundMessage =
  | { type: "sceneFrame"; frame: SceneFrame }
  | { type: "tooltipData"; tooltip: TooltipData }
  | { type: "hideTooltip" };

type VsCodeApi = {
  postMessage(message: OutboundMessage): void;
};

declare function acquireVsCodeApi(): VsCodeApi;

const vscode = acquireVsCodeApi();
const appRoot = document.getElementById("app");
if (!appRoot) {
  throw new Error("Missing #app root");
}

const layout = createLayout(appRoot);
const sceneRenderer = new SceneRenderer(layout.scene);
const queueRenderer = new QueueBarRenderer(layout.queue);
const tooltipRenderer = new TooltipRenderer(layout.tooltip);
const animator = new Animator(layout.root);

let latestFrame: SceneFrame | undefined;

window.addEventListener("message", (event: MessageEvent<InboundMessage>) => {
  const message = event.data;
  if (!message || typeof message !== "object" || !("type" in message)) {
    return;
  }

  if (message.type === "sceneFrame") {
    latestFrame = message.frame;
    sceneRenderer.render(message.frame);
    queueRenderer.render(message.frame.queue);
    layout.health.textContent = buildHealthLabel(message.frame);
    layout.health.classList.toggle("is-warning", !message.frame.health.sourceConnected);
    return;
  }

  if (message.type === "tooltipData") {
    tooltipRenderer.show(message.tooltip);
    return;
  }

  if (message.type === "hideTooltip") {
    tooltipRenderer.hide();
  }
});

layout.root.addEventListener("click", (event) => {
  const target = event.target as HTMLElement | null;
  if (!target) {
    return;
  }

  const clickable = target.closest<HTMLElement>("[data-agent-id]");
  if (!clickable) {
    tooltipRenderer.hide();
    return;
  }

  const agentId = clickable.dataset.agentId;
  const anchor = clickable.dataset.anchor as "seat" | "queue" | undefined;
  if (!agentId || !anchor) {
    return;
  }

  const fallback = findAgentTooltip(latestFrame, agentId);
  if (fallback) {
    tooltipRenderer.show(fallback);
  }
  vscode.postMessage({ type: "agentClick", agentId, anchor });
});

animator.start();
vscode.postMessage({ type: "ready" });

function findAgentTooltip(frame: SceneFrame | undefined, agentId: string): TooltipData | undefined {
  if (!frame) {
    return undefined;
  }
  const seated = frame.seats
    .map((seat) => seat.agent)
    .find((agent) => Boolean(agent && agent.id === agentId));
  const queued = frame.queue.find((agent) => agent.id === agentId);
  const agent = seated ?? queued;
  if (!agent) {
    return undefined;
  }
  return {
    id: agent.id,
    name: agent.name,
    status: agent.status,
    task: agent.taskSummary || "No active task",
    elapsed: formatElapsed(agent.startedAt),
    updated: formatRelative(agent.updatedAt),
  };
}

function formatElapsed(startedAt?: number): string {
  if (!startedAt) {
    return "-";
  }
  const totalMinutes = Math.floor((Date.now() - startedAt) / 60000);
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  return hours > 0 ? `${hours}h ${minutes}m` : `${Math.max(0, minutes)}m`;
}

function formatRelative(updatedAt: number): string {
  const seconds = Math.floor(Math.max(0, Date.now() - updatedAt) / 1000);
  if (seconds < 60) {
    return `${seconds}s ago`;
  }
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) {
    return `${minutes}m ago`;
  }
  return `${Math.floor(minutes / 60)}h ago`;
}

function buildHealthLabel(frame: SceneFrame): string {
  const source = frame.health.sourceLabel || "unknown source";
  const warnings = frame.health.warnings.length;
  if (warnings === 0) {
    return source;
  }
  return `${source} (${warnings} warning${warnings === 1 ? "" : "s"})`;
}
