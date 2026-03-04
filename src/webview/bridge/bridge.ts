import {
  type AgentLifecycleEvent,
} from "@shared/types";
import {
  BRIDGE_INBOUND_TYPE,
  BRIDGE_OUTBOUND_TYPE,
  safeParseInboundBridgeMessage,
  type AgentAnchor,
} from "@shared/bridge";
import type { InboundMessage, OutboundMessage, TooltipData } from "./types";

type MessageListener = (message: InboundMessage) => void;

type VsCodeApi = {
  postMessage(message: OutboundMessage): void;
};

declare function acquireVsCodeApi(): VsCodeApi;

const MAX_INVALID_MESSAGE_LOGS = 5;

type PendingMessageBuffer = {
  latestFrame: InboundMessage | undefined;
  latestTooltip: InboundMessage | undefined;
  hideTooltip: InboundMessage | undefined;
  latestLifecycleEvents: InboundMessage | undefined;
};

export interface VsCodeBridge {
  postReady(): void;
  postAgentClick(agentId: string, anchor: AgentAnchor): void;
  subscribe(listener: MessageListener): () => void;
  dispose(): void;
}

export function createBridge(): VsCodeBridge {
  const vscode = acquireVsCodeApi();
  const listeners = new Set<MessageListener>();
  const pending: PendingMessageBuffer = {
    latestFrame: undefined,
    latestTooltip: undefined,
    hideTooltip: undefined,
    latestLifecycleEvents: undefined,
  };
  let invalidMessageLogCount = 0;

  const onWindowMessage = (event: MessageEvent<unknown>): void => {
    const message = parseInboundMessage(event.data, (reason) => {
      if (invalidMessageLogCount >= MAX_INVALID_MESSAGE_LOGS) {
        return;
      }
      invalidMessageLogCount += 1;
      console.warn(`[cursor-cafe] Ignoring malformed inbound message: ${reason}`);
    });
    if (!message) {
      return;
    }
    if (listeners.size === 0) {
      bufferMessage(pending, message);
      return;
    }
    listeners.forEach((listener) => {
      listener(message);
    });
  };

  window.addEventListener("message", onWindowMessage);

  return {
    postReady(): void {
      vscode.postMessage({ type: BRIDGE_OUTBOUND_TYPE.ready });
    },
    postAgentClick(agentId: string, anchor: AgentAnchor): void {
      vscode.postMessage({ type: BRIDGE_OUTBOUND_TYPE.agentClick, agentId, anchor });
    },
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

function parseInboundMessage(
  value: unknown,
  onInvalid: (reason: string) => void,
): InboundMessage | undefined {
  const parsed = safeParseInboundBridgeMessage(value);
  if (!parsed.success) {
    const reason = parsed.error.issues.map((issue) => issue.message).join("; ");
    onInvalid(reason || "schema validation failed");
  }
  return parsed.success ? parsed.data : undefined;
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

  buffer.latestLifecycleEvents = {
    type: BRIDGE_INBOUND_TYPE.lifecycleEvents,
    events: message.events,
  };
}

function flushBufferedMessages(listener: MessageListener, buffer: PendingMessageBuffer): void {
  if (buffer.latestFrame) {
    listener(buffer.latestFrame);
  }
  if (buffer.latestLifecycleEvents) {
    listener(buffer.latestLifecycleEvents);
  }
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
