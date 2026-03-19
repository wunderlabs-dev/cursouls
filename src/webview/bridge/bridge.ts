import type { InboundMessage, OutboundMessage } from "./types";

import { safeParseInbound } from "@shared/bridge";

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
  const buffered: InboundMessage[] = [];
  let invalidMessageLogCount = 0;

  const onWindowMessage = (event: MessageEvent<unknown>): void => {
    const result = safeParseInbound(event.data);
    if (!result.success) {
      if (invalidMessageLogCount < MAX_INVALID_MESSAGE_LOGS) {
        invalidMessageLogCount += 1;
        const reason = result.error.issues.map((issue) => issue.message).join("; ");
        console.warn(`[cursor-cafe] Ignoring malformed inbound message: ${reason}`);
      }
      return;
    }
    const message = result.data;
    if (listeners.size === 0) {
      buffered.push(message);
      return;
    }
    for (const listener of listeners) {
      listener(message);
    }
  };

  window.addEventListener("message", onWindowMessage);

  return {
    postReady(): void {
      vscode.postMessage({ ready: true });
    },
    subscribe(listener: MessageListener): () => void {
      listeners.add(listener);
      for (const event of buffered) {
        listener(event);
      }
      buffered.length = 0;
      return () => {
        listeners.delete(listener);
      };
    },
    dispose(): void {
      listeners.clear();
      buffered.length = 0;
      window.removeEventListener("message", onWindowMessage);
    },
  };
};
