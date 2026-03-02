import * as vscode from "vscode";
import type { AgentSnapshot, AgentStatus, SceneFrame } from "../types";
import { getWebviewHtml } from "./webview.html";

type OutboundMessage =
  | { type: "ready" }
  | { type: "agentClick"; agentId: string; anchor: "seat" | "queue" };

type InboundMessage =
  | { type: "sceneFrame"; frame: SceneFrame }
  | { type: "tooltipData"; tooltip: TooltipPayload }
  | { type: "hideTooltip" };

export interface TooltipPayload {
  id: string;
  name: string;
  status: AgentStatus;
  task: string;
  elapsed: string;
  updated: string;
}

export class CafeViewProvider implements vscode.WebviewViewProvider {
  public static readonly viewType = "cursorCafe.sidebar";

  private view: vscode.WebviewView | undefined;
  private latestFrame: SceneFrame | undefined;

  constructor(private readonly extensionUri: vscode.Uri) {}

  public resolveWebviewView(view: vscode.WebviewView): void {
    this.view = view;
    view.webview.options = {
      enableScripts: true,
      localResourceRoots: [this.extensionUri],
    };
    view.webview.html = getWebviewHtml(view.webview, this.extensionUri);

    view.onDidDispose(() => {
      this.view = undefined;
    });

    view.webview.onDidReceiveMessage((message: OutboundMessage) => {
      if (message.type === "ready") {
        if (this.latestFrame) {
          this.postMessage({ type: "sceneFrame", frame: this.latestFrame });
        }
        return;
      }

      if (message.type === "agentClick") {
        const tooltip = this.buildTooltip(message.agentId);
        if (tooltip) {
          this.postMessage({ type: "tooltipData", tooltip });
        } else {
          this.postMessage({ type: "hideTooltip" });
        }
      }
    });
  }

  public updateFrame(frame: SceneFrame): void {
    this.latestFrame = frame;
    this.postMessage({ type: "sceneFrame", frame });
  }

  private buildTooltip(agentId: string): TooltipPayload | undefined {
    if (!this.latestFrame) {
      return undefined;
    }

    const seated = this.latestFrame.seats
      .map((seat) => seat.agent)
      .find((agent): agent is AgentSnapshot => Boolean(agent && agent.id === agentId));
    const queued = this.latestFrame.queue.find((agent) => agent.id === agentId);
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

  private postMessage(message: InboundMessage): void {
    if (!this.view) {
      return;
    }
    void this.view.webview.postMessage(message);
  }
}

function formatElapsed(startedAt?: number): string {
  if (!startedAt) {
    return "-";
  }

  const delta = Math.max(0, Date.now() - startedAt);
  const totalMinutes = Math.floor(delta / 60000);
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  if (hours > 0) {
    return `${hours}h ${minutes}m`;
  }
  return `${minutes}m`;
}

function formatRelative(updatedAt: number): string {
  const delta = Math.max(0, Date.now() - updatedAt);
  const seconds = Math.floor(delta / 1000);
  if (seconds < 60) {
    return `${seconds}s ago`;
  }
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) {
    return `${minutes}m ago`;
  }
  const hours = Math.floor(minutes / 60);
  return `${hours}h ago`;
}
