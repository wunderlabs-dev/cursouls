import type * as vscode from "vscode";
import { formatDistanceToNowStrict, intervalToDuration } from "date-fns";
import type { AgentSnapshot, AgentStatus, SceneFrame } from "@shared/types";
import { getWebviewHtml } from "./html";

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

export const CAFE_VIEW_TYPE = "cursorCafe.sidebar";

export interface CafeViewProvider extends vscode.WebviewViewProvider {
  updateFrame(frame: SceneFrame): void;
}

export function createCafeViewProvider(extensionUri: vscode.Uri): CafeViewProvider {
  let view: vscode.WebviewView | undefined;
  let latestFrame: SceneFrame | undefined;

  function resolveWebviewView(nextView: vscode.WebviewView): void {
    view = nextView;
    nextView.webview.options = {
      enableScripts: true,
      localResourceRoots: [extensionUri],
    };
    nextView.webview.html = getWebviewHtml(nextView.webview, extensionUri);

    nextView.onDidDispose(() => {
      view = undefined;
    });

    nextView.webview.onDidReceiveMessage((message: unknown) => {
      if (!isOutboundMessage(message)) {
        console.warn("[cursor-cafe] Ignoring malformed webview message", message);
        return;
      }

      if (message.type === "ready") {
        if (latestFrame) {
          postMessage({ type: "sceneFrame", frame: latestFrame });
        }
        return;
      }

      if (message.type === "agentClick") {
        const tooltip = buildTooltip(message.agentId);
        if (tooltip) {
          postMessage({ type: "tooltipData", tooltip });
        } else {
          postMessage({ type: "hideTooltip" });
        }
      }
    });
  }

  function updateFrame(frame: SceneFrame): void {
    latestFrame = frame;
    postMessage({ type: "sceneFrame", frame });
  }

  function buildTooltip(agentId: string): TooltipPayload | undefined {
    if (!latestFrame) {
      return undefined;
    }

    const seated = latestFrame.seats
      .map((seat) => seat.agent)
      .find((agent): agent is AgentSnapshot => Boolean(agent && agent.id === agentId));
    const queued = latestFrame.queue.find((agent) => agent.id === agentId);
    const agent = seated ?? queued;

    if (!agent) {
      return undefined;
    }

    const elapsed = agent.startedAt
      ? (() => {
          const { hours = 0, minutes = 0 } = intervalToDuration({
            start: agent.startedAt,
            end: Date.now(),
          });
          return hours > 0 ? `${hours}h ${minutes}m` : `${minutes}m`;
        })()
      : "-";

    const updated = formatDistanceToNowStrict(agent.updatedAt, { addSuffix: true });

    return {
      id: agent.id,
      name: agent.name,
      status: agent.status,
      task: agent.taskSummary || "No active task",
      elapsed,
      updated,
    };
  }

  function postMessage(message: InboundMessage): void {
    if (!view) {
      return;
    }
    void view.webview.postMessage(message);
  }

  return {
    resolveWebviewView,
    updateFrame,
  };
}

export const CafeViewProvider = {
  viewType: CAFE_VIEW_TYPE,
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function isOutboundMessage(value: unknown): value is OutboundMessage {
  if (!isRecord(value) || typeof value.type !== "string") {
    return false;
  }

  if (value.type === "ready") {
    return true;
  }

  if (value.type === "agentClick") {
    return (
      typeof value.agentId === "string" && (value.anchor === "seat" || value.anchor === "queue")
    );
  }

  return false;
}
