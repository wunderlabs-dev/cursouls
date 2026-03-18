import { formatUnknown } from "@ext/errors";
import {
  BRIDGE_INBOUND_TYPE,
  BRIDGE_LIFECYCLE_REPLAY_LIMIT,
  BRIDGE_OUTBOUND_TYPE,
  type InboundMessage,
  safeParseOutboundBridgeMessage,
  type TooltipData,
} from "@shared/bridge";
import { findAgentInFrame } from "@shared/frame";
import type { AgentLifecycleEvent, SceneFrame } from "@shared/types";
import { formatDistanceToNowStrict, intervalToDuration } from "date-fns";
import { truncate } from "lodash";
import type * as vscode from "vscode";
import { getWebviewHtml } from "./html";

export const CAFE_VIEW_TYPE = "cursorCafe.sidebar";
const FALLBACK_TASK_LABEL = "No active task";
const MAX_TOOLTIP_TASK_LENGTH = 120;
const NO_ELAPSED_PLACEHOLDER = "-";

export interface CafeViewProvider extends vscode.WebviewViewProvider {
  updateFrame(frame: SceneFrame): void;
  updateLifecycleEvents(events: AgentLifecycleEvent[]): void;
}

interface ProviderState {
  view?: vscode.WebviewView;
  latestFrame?: SceneFrame;
  lifecycleReplayEvents: AgentLifecycleEvent[];
  selectedTooltipAgentId?: string;
}

export function createCafeViewProvider(
  extensionUri: vscode.Uri,
  logger?: { warn(message: string): void },
  now: () => number = () => Date.now(),
): CafeViewProvider {
  const state: ProviderState = { lifecycleReplayEvents: [] };
  const post = (message: InboundMessage): void => {
    if (state.view) void state.view.webview.postMessage(message);
  };

  return {
    resolveWebviewView(nextView: vscode.WebviewView): void {
      state.view = nextView;
      nextView.webview.options = { enableScripts: true, localResourceRoots: [extensionUri] };
      nextView.webview.html = getWebviewHtml(nextView.webview, extensionUri);
      nextView.onDidDispose(() => {
        state.view = undefined;
      });
      nextView.webview.onDidReceiveMessage((msg: unknown) =>
        handleOutboundMessage(msg, state, post, now, logger),
      );
    },
    updateFrame(frame: SceneFrame): void {
      state.latestFrame = frame;
      post({ type: BRIDGE_INBOUND_TYPE.sceneFrame, frame });
      syncSelectedTooltip(state, post, now);
    },
    updateLifecycleEvents(events: AgentLifecycleEvent[]): void {
      state.lifecycleReplayEvents = appendLifecycleEvents(state.lifecycleReplayEvents, events);
      post({ type: BRIDGE_INBOUND_TYPE.lifecycleEvents, events: state.lifecycleReplayEvents });
    },
  };
}

function handleOutboundMessage(
  message: unknown,
  state: ProviderState,
  post: (msg: InboundMessage) => void,
  now: () => number,
  logger?: { warn(msg: string): void },
): void {
  const parsed = safeParseOutboundBridgeMessage(message);
  if (!parsed.success) {
    logInvalidMessage(parsed, message, logger);
    return;
  }
  const outbound = parsed.data;
  if (outbound.type === BRIDGE_OUTBOUND_TYPE.ready) {
    replayState(post, state.latestFrame, state.lifecycleReplayEvents);
    return;
  }
  if (outbound.type === BRIDGE_OUTBOUND_TYPE.agentClick) {
    state.selectedTooltipAgentId = outbound.agentId;
    syncSelectedTooltip(state, post, now);
  }
}

function syncSelectedTooltip(
  state: ProviderState,
  post: (msg: InboundMessage) => void,
  now: () => number,
): void {
  if (!state.selectedTooltipAgentId) return;
  const tooltip = buildTooltip(state.latestFrame, state.selectedTooltipAgentId, now);
  if (tooltip) {
    post({ type: BRIDGE_INBOUND_TYPE.tooltipData, tooltip });
    return;
  }
  state.selectedTooltipAgentId = undefined;
  post({ type: BRIDGE_INBOUND_TYPE.hideTooltip });
}

function replayState(
  post: (message: InboundMessage) => void,
  frame: SceneFrame | undefined,
  events: AgentLifecycleEvent[],
): void {
  if (frame) post({ type: BRIDGE_INBOUND_TYPE.sceneFrame, frame });
  if (events.length > 0) post({ type: BRIDGE_INBOUND_TYPE.lifecycleEvents, events });
}

function appendLifecycleEvents(
  existing: AgentLifecycleEvent[],
  incoming: AgentLifecycleEvent[],
): AgentLifecycleEvent[] {
  const combined = [...existing, ...incoming];
  if (combined.length > BRIDGE_LIFECYCLE_REPLAY_LIMIT) {
    return combined.slice(combined.length - BRIDGE_LIFECYCLE_REPLAY_LIMIT);
  }
  return combined;
}

function logInvalidMessage(
  parsed: { error: { issues: { message: string }[] } },
  raw: unknown,
  logger?: { warn(message: string): void },
): void {
  const reason = parsed.error.issues.map((issue: { message: string }) => issue.message).join("; ");
  const details = `[cursor-cafe] Ignoring malformed webview message: ${reason || formatUnknown(raw)}`;
  if (logger) {
    logger.warn(details);
  } else {
    console.warn(details);
  }
}

function buildTooltip(
  frame: SceneFrame | undefined,
  agentId: string,
  now: () => number,
): TooltipData | undefined {
  if (!frame) return undefined;
  const agent = findAgentInFrame(frame, agentId);
  if (!agent) return undefined;
  return {
    id: agent.id,
    name: agent.name,
    status: agent.status,
    task: truncate(agent.taskSummary || FALLBACK_TASK_LABEL, { length: MAX_TOOLTIP_TASK_LENGTH }),
    elapsed: formatElapsed(agent.startedAt, now()),
    updated: formatDistanceToNowStrict(agent.updatedAt, { addSuffix: true }),
  };
}

function formatElapsed(startedAt: number | undefined, timestamp: number): string {
  if (startedAt == null) return NO_ELAPSED_PLACEHOLDER;
  const { hours = 0, minutes = 0 } = intervalToDuration({ start: startedAt, end: timestamp });
  return hours > 0 ? `${hours}h ${minutes}m` : `${minutes}m`;
}
