import {
  type AgentAnchor,
  BRIDGE_INBOUND_TYPE,
  BRIDGE_OUTBOUND_TYPE,
  safeParseInboundBridgeMessage,
} from "@shared/bridge";
import type { InboundMessage, OutboundMessage } from "./types";

type MessageListener = (message: InboundMessage) => void;

interface VsCodeApi {
  postMessage(message: OutboundMessage): void;
}

declare function acquireVsCodeApi(): VsCodeApi;

const MAX_INVALID_MESSAGE_LOGS = 5;

interface PendingMessageBuffer {
  latestFrame: Extract<InboundMessage, { type: typeof BRIDGE_INBOUND_TYPE.sceneFrame }> | undefined;
  latestTooltip:
    | Extract<InboundMessage, { type: typeof BRIDGE_INBOUND_TYPE.tooltipData }>
    | undefined;
  hideTooltip:
    | Extract<InboundMessage, { type: typeof BRIDGE_INBOUND_TYPE.hideTooltip }>
    | undefined;
  latestLifecycleEvents:
    | Extract<InboundMessage, { type: typeof BRIDGE_INBOUND_TYPE.lifecycleEvents }>
    | undefined;
}

export interface VsCodeBridge {
  postReady(): void;
  postAgentClick(agentId: string, anchor: AgentAnchor): void;
  subscribe(listener: MessageListener): () => void;
  dispose(): void;
}

export function createBridge(): VsCodeBridge {
  const vscode = acquireVsCodeApi();
  const listeners = new Set<MessageListener>();
  const pending = createEmptyBuffer();
  let invalidCount = 0;

  const onWindowMessage = (event: MessageEvent<unknown>): void => {
    const message = parseInboundMessage(event.data, (reason) => {
      if (invalidCount < MAX_INVALID_MESSAGE_LOGS) {
        invalidCount += 1;
        console.warn(`[cursor-cafe] Ignoring malformed inbound message: ${reason}`);
      }
    });
    if (!message) return;
    if (listeners.size === 0) {
      bufferMessage(pending, message);
      return;
    }
    dispatchToListeners(listeners, message);
  };

  window.addEventListener("message", onWindowMessage);

  return {
    postReady: () => vscode.postMessage({ type: BRIDGE_OUTBOUND_TYPE.ready }),
    postAgentClick: (agentId, anchor) =>
      vscode.postMessage({ type: BRIDGE_OUTBOUND_TYPE.agentClick, agentId, anchor }),
    subscribe(listener: MessageListener): () => void {
      listeners.add(listener);
      flushBufferedMessages(listener, pending);
      return () => {
        listeners.delete(listener);
      };
    },
    dispose(): void {
      listeners.clear();
      clearBufferedMessages(pending);
      window.removeEventListener("message", onWindowMessage);
    },
  };
}

function dispatchToListeners(listeners: Set<MessageListener>, message: InboundMessage): void {
  for (const listener of listeners) {
    try {
      listener(message);
    } catch (error: unknown) {
      console.error("[cursor-cafe] Bridge listener threw:", error);
    }
  }
}

function createEmptyBuffer(): PendingMessageBuffer {
  return {
    latestFrame: undefined,
    latestTooltip: undefined,
    hideTooltip: undefined,
    latestLifecycleEvents: undefined,
  };
}

function parseInboundMessage(
  value: unknown,
  onInvalid: (reason: string) => void,
): InboundMessage | undefined {
  const parsed = safeParseInboundBridgeMessage(value);
  if (!parsed.success) {
    const reason = parsed.error.issues.map((issue) => issue.message).join("; ");
    onInvalid(reason || "schema validation failed");
    return undefined;
  }
  return parsed.data;
}

function bufferMessage(buffer: PendingMessageBuffer, message: InboundMessage): void {
  if (message.type === BRIDGE_INBOUND_TYPE.sceneFrame) {
    buffer.latestFrame = message;
    return;
  }
  if (message.type === BRIDGE_INBOUND_TYPE.tooltipData) {
    buffer.latestTooltip = message;
    buffer.hideTooltip = undefined;
    return;
  }
  if (message.type === BRIDGE_INBOUND_TYPE.hideTooltip) {
    buffer.latestTooltip = undefined;
    buffer.hideTooltip = message;
    return;
  }
  buffer.latestLifecycleEvents = message;
}

function flushBufferedMessages(listener: MessageListener, buffer: PendingMessageBuffer): void {
  if (buffer.latestFrame) listener(buffer.latestFrame);
  if (buffer.latestLifecycleEvents) listener(buffer.latestLifecycleEvents);
  if (buffer.latestTooltip) {
    listener(buffer.latestTooltip);
  } else if (buffer.hideTooltip) {
    listener(buffer.hideTooltip);
  }
  clearBufferedMessages(buffer);
}

function clearBufferedMessages(buffer: PendingMessageBuffer): void {
  buffer.latestFrame = undefined;
  buffer.latestTooltip = undefined;
  buffer.hideTooltip = undefined;
  buffer.latestLifecycleEvents = undefined;
}
