import type * as vscode from "vscode";
import { formatDistanceToNowStrict, intervalToDuration } from "date-fns";
import truncate from "lodash.truncate";
import type { AgentLifecycleEvent, SceneFrame } from "@shared/types";
import {
  BRIDGE_LIFECYCLE_REPLAY_LIMIT,
  BRIDGE_INBOUND_TYPE,
  BRIDGE_OUTBOUND_TYPE,
  safeParseOutboundBridgeMessage,
  type InboundMessage,
  type TooltipData,
} from "@shared/bridge";
import { findAgentInFrame } from "@shared/frame";
import { formatUnknown } from "@ext/errors";
import { getWebviewHtml } from "./html";

export const CAFE_VIEW_TYPE = "cursorCafe.sidebar";
const FALLBACK_TASK_LABEL = "No active task";
const MAX_TOOLTIP_TASK_LENGTH = 120;

export interface CafeViewProvider extends vscode.WebviewViewProvider {
  updateFrame(frame: SceneFrame): void;
  updateLifecycleEvents(events: AgentLifecycleEvent[]): void;
}

export function createCafeViewProvider(
  extensionUri: vscode.Uri,
  logger?: { warn(message: string): void },
): CafeViewProvider {
  let view: vscode.WebviewView | undefined;
  let latestFrame: SceneFrame | undefined;
  let lifecycleReplayEvents: AgentLifecycleEvent[] = [];
  let selectedTooltipAgentId: string | undefined;

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
      const parsedMessage = safeParseOutboundBridgeMessage(message);
      if (!parsedMessage.success) {
        const reason = parsedMessage.error.issues.map((issue) => issue.message).join("; ");
        const details = `[cursor-cafe] Ignoring malformed webview message: ${reason || formatUnknown(message)}`;
        if (logger) {
          logger.warn(details);
        } else {
          console.warn(details);
        }
        return;
      }
      const outboundMessage = parsedMessage.data;

      if (outboundMessage.type === BRIDGE_OUTBOUND_TYPE.ready) {
        if (latestFrame) {
          postMessage({ type: BRIDGE_INBOUND_TYPE.sceneFrame, frame: latestFrame });
        }
        if (lifecycleReplayEvents.length > 0) {
          postMessage({
            type: BRIDGE_INBOUND_TYPE.lifecycleEvents,
            events: lifecycleReplayEvents,
          });
        }
        return;
      }

      if (outboundMessage.type === BRIDGE_OUTBOUND_TYPE.agentClick) {
        selectedTooltipAgentId = outboundMessage.agentId;
        syncSelectedTooltip();
      }
    });
  }

  function updateFrame(frame: SceneFrame): void {
    latestFrame = frame;
    postMessage({ type: BRIDGE_INBOUND_TYPE.sceneFrame, frame });
    syncSelectedTooltip();
  }

  function updateLifecycleEvents(events: AgentLifecycleEvent[]): void {
    lifecycleReplayEvents = [...lifecycleReplayEvents, ...events];
    if (lifecycleReplayEvents.length > BRIDGE_LIFECYCLE_REPLAY_LIMIT) {
      lifecycleReplayEvents = lifecycleReplayEvents.slice(
        lifecycleReplayEvents.length - BRIDGE_LIFECYCLE_REPLAY_LIMIT,
      );
    }
    postMessage({ type: BRIDGE_INBOUND_TYPE.lifecycleEvents, events: lifecycleReplayEvents });
  }

  function buildTooltip(agentId: string): TooltipData | undefined {
    if (!latestFrame) {
      return undefined;
    }

    const agent = findAgentInFrame(latestFrame, agentId);

    if (!agent) {
      return undefined;
    }

    const elapsed = formatElapsed(agent.startedAt);

    const updated = formatDistanceToNowStrict(agent.updatedAt, { addSuffix: true });

    return {
      id: agent.id,
      name: agent.name,
      status: agent.status,
      task: truncate(agent.taskSummary || FALLBACK_TASK_LABEL, { length: MAX_TOOLTIP_TASK_LENGTH }),
      elapsed,
      updated,
    };
  }

  function syncSelectedTooltip(): void {
    if (!selectedTooltipAgentId) {
      return;
    }
    const tooltip = buildTooltip(selectedTooltipAgentId);
    if (tooltip) {
      postMessage({ type: BRIDGE_INBOUND_TYPE.tooltipData, tooltip });
      return;
    }
    selectedTooltipAgentId = undefined;
    postMessage({ type: BRIDGE_INBOUND_TYPE.hideTooltip });
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
