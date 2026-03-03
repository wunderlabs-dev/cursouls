import type { AgentLifecycleEvent, SceneFrame } from "@shared/types";
import { z } from "zod";
import type { InboundMessage, OutboundMessage, TooltipData } from "./types";

type MessageListener = (message: InboundMessage) => void;

const AGENT_STATUS_VALUES = ["running", "idle", "completed", "error"] as const;
const AGENT_KIND_VALUES = ["local", "remote"] as const;
const SOURCE_KIND_VALUES = ["cursor-transcripts", "mock"] as const;
const INBOUND_SCENE_FRAME_TYPE = "sceneFrame";
const INBOUND_LIFECYCLE_EVENTS_TYPE = "lifecycleEvents";
const INBOUND_TOOLTIP_DATA_TYPE = "tooltipData";
const INBOUND_HIDE_TOOLTIP_TYPE = "hideTooltip";
const OUTBOUND_READY_TYPE = "ready";

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

export function createBridge(): VsCodeBridge {
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
    listeners.forEach((listener) => {
      listener(message);
    });
  };

  window.addEventListener("message", onWindowMessage);

  return {
    postReady(): void {
      vscode.postMessage({ type: OUTBOUND_READY_TYPE });
    },
    postAgentClick(agentId: string, anchor: "seat" | "queue"): void {
      vscode.postMessage({ type: "agentClick", agentId, anchor });
    },
    subscribe(listener: MessageListener): () => void {
      listeners.add(listener);
      if (pendingQueue.length > 0) {
        const queued = pendingQueue.splice(0, pendingQueue.length);
        queued.forEach((message) => {
          listener(message);
        });
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
  const parsed = inboundMessageSchema.safeParse(value);
  return parsed.success ? parsed.data : undefined;
}

const agentStatusSchema = z.enum(AGENT_STATUS_VALUES);
const agentKindSchema = z.enum(AGENT_KIND_VALUES);
const sourceKindSchema = z.enum(SOURCE_KIND_VALUES);
const lifecycleEventTypeSchema = z.enum(["joined", "left", "statusChanged", "heartbeat"]);

const agentSnapshotSchema = z.object({
  id: z.string(),
  name: z.string(),
  kind: agentKindSchema,
  status: agentStatusSchema,
  taskSummary: z.string(),
  startedAt: z.number().optional(),
  updatedAt: z.number(),
  source: sourceKindSchema,
});

const seatFrameSchema = z.object({
  tableIndex: z.number(),
  agent: z.union([agentSnapshotSchema, z.null()]),
});

const sourceHealthSchema = z.object({
  sourceConnected: z.boolean(),
  sourceLabel: z.string(),
  warnings: z.array(z.string()),
});

const sceneFrameSchema: z.ZodType<SceneFrame> = z.object({
  generatedAt: z.number(),
  seats: z.array(seatFrameSchema),
  queue: z.array(agentSnapshotSchema),
  health: sourceHealthSchema,
});

const tooltipDataSchema: z.ZodType<TooltipData> = z.object({
  id: z.string(),
  name: z.string(),
  status: agentStatusSchema,
  task: z.string(),
  elapsed: z.string(),
  updated: z.string(),
});

const lifecycleEventSchema: z.ZodType<AgentLifecycleEvent> = z.object({
  kind: lifecycleEventTypeSchema,
  agentId: z.string(),
  at: z.number(),
  fromStatus: z.union([agentStatusSchema, z.null()]),
  toStatus: z.union([agentStatusSchema, z.null()]),
});

const inboundMessageSchema: z.ZodType<InboundMessage> = z.discriminatedUnion("type", [
  z.object({
    type: z.literal(INBOUND_SCENE_FRAME_TYPE),
    frame: sceneFrameSchema,
  }),
  z.object({
    type: z.literal(INBOUND_LIFECYCLE_EVENTS_TYPE),
    events: z.array(lifecycleEventSchema),
  }),
  z.object({
    type: z.literal(INBOUND_TOOLTIP_DATA_TYPE),
    tooltip: tooltipDataSchema,
  }),
  z.object({
    type: z.literal(INBOUND_HIDE_TOOLTIP_TYPE),
  }),
]);
