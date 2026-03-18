import { BRIDGE_OUTBOUND_TYPE, safeParseInboundBridgeMessage } from "@shared/bridge";

import type { InboundMessage, OutboundMessage } from "./types";

type MessageListener = (message: InboundMessage) => void;

interface VsCodeApi {
  postMessage(message: OutboundMessage): void;
}

declare function acquireVsCodeApi(): VsCodeApi;

const MAX_INVALID_MESSAGE_LOGS = 5;

interface ParseSuccess {
  readonly success: true;
  readonly data: InboundMessage;
}

interface ParseFailure {
  readonly success: false;
  readonly error: { readonly issues: ReadonlyArray<{ readonly message: string }> };
}

type ParseResult = ParseSuccess | ParseFailure;

export interface VsCodeBridge {
  postReady(): void;
  subscribe(listener: MessageListener): () => void;
  dispose(): void;
}

export const createBridge = (): VsCodeBridge => {
  const vscode = acquireVsCodeApi();
  const listeners = new Set<MessageListener>();
  let buffered: InboundMessage | undefined;
  let invalidMessageLogCount = 0;

  const onWindowMessage = (event: MessageEvent<unknown>): void => {
    const result = safeParseInboundBridgeMessage(event.data) as ParseResult;
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
      buffered = message;
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
      if (buffered) {
        listener(buffered);
        buffered = undefined;
      }
      return () => {
        listeners.delete(listener);
      };
    },
    dispose(): void {
      listeners.clear();
      buffered = undefined;
      window.removeEventListener("message", onWindowMessage);
    },
  };
};
