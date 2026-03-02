import type { SceneFrame } from "../../shared/types";
import type { InboundMessage, OutboundMessage, TooltipData } from "./types";

type MessageListener = (message: InboundMessage) => void;

type VsCodeApi = {
  postMessage(message: OutboundMessage): void;
};

declare function acquireVsCodeApi(): VsCodeApi;

export interface VsCodeBridge {
  postReady(): void;
  postAgentClick(agentId: string, anchor: "seat" | "queue"): void;
  subscribe(listener: MessageListener): () => void;
  dispose(): void;
}

export function useVsCodeBridge(): VsCodeBridge {
  const vscode = acquireVsCodeApi();
  const listeners = new Set<MessageListener>();
  const pendingQueue: InboundMessage[] = [];

  const onWindowMessage = (event: MessageEvent<unknown>): void => {
    const message = parseInboundMessage(event.data);
    if (!message) {
      return;
    }
    if (listeners.size === 0) {
      pendingQueue.push(message);
      return;
    }
    listeners.forEach((listener) => listener(message));
  };

  window.addEventListener("message", onWindowMessage);

  return {
    postReady(): void {
      vscode.postMessage({ type: "ready" });
    },
    postAgentClick(agentId: string, anchor: "seat" | "queue"): void {
      vscode.postMessage({ type: "agentClick", agentId, anchor });
    },
    subscribe(listener: MessageListener): () => void {
      listeners.add(listener);
      if (pendingQueue.length > 0) {
        const queued = pendingQueue.splice(0, pendingQueue.length);
        queued.forEach((message) => listener(message));
      }
      return () => {
        listeners.delete(listener);
      };
    },
    dispose(): void {
      listeners.clear();
      pendingQueue.length = 0;
      window.removeEventListener("message", onWindowMessage);
    },
  };
}

function parseInboundMessage(value: unknown): InboundMessage | undefined {
  if (!isRecord(value)) {
    return undefined;
  }
  const maybe = value as {
    type?: unknown;
    frame?: unknown;
    tooltip?: unknown;
  };
  if (maybe.type === "sceneFrame" && isSceneFrame(maybe.frame)) {
    return { type: "sceneFrame", frame: maybe.frame };
  }
  if (maybe.type === "tooltipData" && isTooltipData(maybe.tooltip)) {
    return { type: "tooltipData", tooltip: maybe.tooltip };
  }
  if (maybe.type === "hideTooltip") {
    return { type: "hideTooltip" };
  }
  return undefined;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function isFiniteNumber(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value);
}

function isStringArray(value: unknown): value is string[] {
  return Array.isArray(value) && value.every((item) => typeof item === "string");
}

function isAgentStatus(value: unknown): value is "running" | "idle" | "completed" | "error" {
  return value === "running" || value === "idle" || value === "completed" || value === "error";
}

function isAgentKind(value: unknown): value is "local" | "remote" {
  return value === "local" || value === "remote";
}

function isAgentSourceKind(value: unknown): value is "cursor-transcripts" | "mock" {
  return value === "cursor-transcripts" || value === "mock";
}

function isAgentSnapshot(value: unknown): boolean {
  if (!isRecord(value)) {
    return false;
  }
  const startedAt = value.startedAt;
  return (
    typeof value.id === "string" &&
    typeof value.name === "string" &&
    isAgentKind(value.kind) &&
    isAgentStatus(value.status) &&
    typeof value.taskSummary === "string" &&
    (startedAt === undefined || isFiniteNumber(startedAt)) &&
    isFiniteNumber(value.updatedAt) &&
    isAgentSourceKind(value.source)
  );
}

function isSeatFrame(value: unknown): boolean {
  if (!isRecord(value)) {
    return false;
  }
  return isFiniteNumber(value.tableIndex) && (value.agent === null || isAgentSnapshot(value.agent));
}

function isSourceHealth(value: unknown): boolean {
  if (!isRecord(value)) {
    return false;
  }
  return (
    typeof value.sourceConnected === "boolean" &&
    typeof value.sourceLabel === "string" &&
    isStringArray(value.warnings)
  );
}

function isSceneFrame(value: unknown): value is SceneFrame {
  if (!isRecord(value)) {
    return false;
  }
  return (
    isFiniteNumber(value.generatedAt) &&
    Array.isArray(value.seats) &&
    value.seats.every((seat) => isSeatFrame(seat)) &&
    Array.isArray(value.queue) &&
    value.queue.every((agent) => isAgentSnapshot(agent)) &&
    isSourceHealth(value.health)
  );
}

function isTooltipData(value: unknown): value is TooltipData {
  if (!isRecord(value)) {
    return false;
  }
  return (
    typeof value.id === "string" &&
    typeof value.name === "string" &&
    isAgentStatus(value.status) &&
    typeof value.task === "string" &&
    typeof value.elapsed === "string" &&
    typeof value.updated === "string"
  );
}
