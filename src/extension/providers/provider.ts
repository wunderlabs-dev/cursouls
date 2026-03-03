import type * as vscode from "vscode";
import { formatDistanceToNowStrict, intervalToDuration } from "date-fns";
import type { AgentLifecycleEvent, AgentSnapshot, SceneFrame } from "@shared/types";
import {
  BRIDGE_AGENT_ANCHOR,
  BRIDGE_INBOUND_TYPE,
  BRIDGE_OUTBOUND_TYPE,
  type InboundMessage,
  type OutboundMessage,
  type TooltipData,
} from "@shared/bridge";
import { getWebviewHtml } from "./html";

export const CAFE_VIEW_TYPE = "cursorCafe.sidebar";

export interface CafeViewProvider extends vscode.WebviewViewProvider {
  updateFrame(frame: SceneFrame): void;
  updateLifecycleEvents(events: AgentLifecycleEvent[]): void;
}

export function createCafeViewProvider(extensionUri: vscode.Uri): CafeViewProvider {
  let view: vscode.WebviewView | undefined;
  let latestFrame: SceneFrame | undefined;
  let latestLifecycleEvents: AgentLifecycleEvent[] | undefined;

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

      if (message.type === BRIDGE_OUTBOUND_TYPE.ready) {
        if (latestFrame) {
          postMessage({ type: BRIDGE_INBOUND_TYPE.sceneFrame, frame: latestFrame });
        }
        if (latestLifecycleEvents) {
          postMessage({ type: BRIDGE_INBOUND_TYPE.lifecycleEvents, events: latestLifecycleEvents });
        }
        return;
      }

      if (message.type === BRIDGE_OUTBOUND_TYPE.agentClick) {
        const tooltip = buildTooltip(message.agentId);
        if (tooltip) {
          postMessage({ type: BRIDGE_INBOUND_TYPE.tooltipData, tooltip });
        } else {
          postMessage({ type: BRIDGE_INBOUND_TYPE.hideTooltip });
        }
      }
    });
  }

  function updateFrame(frame: SceneFrame): void {
    latestFrame = frame;
    postMessage({ type: BRIDGE_INBOUND_TYPE.sceneFrame, frame });
  }

  function updateLifecycleEvents(events: AgentLifecycleEvent[]): void {
    latestLifecycleEvents = events;
    postMessage({ type: BRIDGE_INBOUND_TYPE.lifecycleEvents, events });
  }

  function buildTooltip(agentId: string): TooltipData | undefined {
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

    const elapsed = formatElapsed(agent.startedAt);

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
    updateLifecycleEvents,
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

  if (value.type === BRIDGE_OUTBOUND_TYPE.ready) {
    return true;
  }

  if (value.type === BRIDGE_OUTBOUND_TYPE.agentClick) {
    return (
      typeof value.agentId === "string" &&
      (value.anchor === BRIDGE_AGENT_ANCHOR.seat || value.anchor === BRIDGE_AGENT_ANCHOR.queue)
    );
  }

  return false;
}

function formatElapsed(startedAt: number | undefined): string {
  if (!startedAt) {
    return "-";
  }
  const { hours = 0, minutes = 0 } = intervalToDuration({
    start: startedAt,
    end: Date.now(),
  });
  return hours > 0 ? `${hours}h ${minutes}m` : `${minutes}m`;
}
