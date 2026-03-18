import {
  type BRIDGE_INBOUND_TYPE,
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

export interface VsCodeBridge {
  postReady(): void;
  subscribe(listener: MessageListener): () => void;
  dispose(): void;
}

export const createBridge = (): VsCodeBridge => {
  const vscode = acquireVsCodeApi();
  const listeners = new Set<MessageListener>();
  let bufferedAgents:
    | Extract<InboundMessage, { type: typeof BRIDGE_INBOUND_TYPE.agents }>
    | undefined;
  let invalidMessageLogCount = 0;

  const onWindowMessage = (event: MessageEvent<unknown>): void => {
    const parsed = safeParseInboundBridgeMessage(event.data);
    if (!parsed.success) {
      if (invalidMessageLogCount < MAX_INVALID_MESSAGE_LOGS) {
        invalidMessageLogCount += 1;
        const reason = parsed.error.issues.map((issue) => issue.message).join("; ");
        console.warn(`[cursor-cafe] Ignoring malformed inbound message: ${reason}`);
      }
      return;
    }
    const message = parsed.data;
    if (listeners.size === 0) {
      bufferedAgents = message;
      return;
    }
    for (const listener of listeners) {
      listener(message);
    }
  };

  window.addEventListener("message", onWindowMessage);

  return {
    postReady(): void {
      vscode.postMessage({ type: BRIDGE_OUTBOUND_TYPE.ready });
    },
    subscribe(listener: MessageListener): () => void {
      listeners.add(listener);
      if (bufferedAgents) {
        listener(bufferedAgents);
        bufferedAgents = undefined;
      }
      return () => {
        listeners.delete(listener);
      };
    },
    dispose(): void {
      listeners.clear();
      bufferedAgents = undefined;
      window.removeEventListener("message", onWindowMessage);
    },
  };
};
