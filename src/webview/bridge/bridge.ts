import {
  AGENT_KIND,
  AGENT_LIFECYCLE_EVENT_KIND,
  AGENT_SOURCE_KIND,
  AGENT_STATUS,
  type AgentLifecycleEvent,
  type SceneFrame,
} from "@shared/types";
import {
  BRIDGE_AGENT_ANCHOR,
  BRIDGE_INBOUND_TYPE,
  BRIDGE_OUTBOUND_TYPE,
  type AgentAnchor,
} from "@shared/bridge";
import { z } from "zod";
import type { InboundMessage, OutboundMessage, TooltipData } from "./types";

type MessageListener = (message: InboundMessage) => void;

type VsCodeApi = {
  postMessage(message: OutboundMessage): void;
};

declare function acquireVsCodeApi(): VsCodeApi;

export interface VsCodeBridge {
  postReady(): void;
  postAgentClick(agentId: string, anchor: AgentAnchor): void;
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
      vscode.postMessage({ type: BRIDGE_OUTBOUND_TYPE.ready });
    },
    postAgentClick(agentId: string, anchor: AgentAnchor): void {
      vscode.postMessage({ type: BRIDGE_OUTBOUND_TYPE.agentClick, agentId, anchor });
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

const agentStatusSchema = z.nativeEnum(AGENT_STATUS);
const agentKindSchema = z.nativeEnum(AGENT_KIND);
const sourceKindSchema = z.nativeEnum(AGENT_SOURCE_KIND);
const lifecycleEventTypeSchema = z.nativeEnum(AGENT_LIFECYCLE_EVENT_KIND);

const agentSnapshotSchema = z.object({
  id: z.string(),
  name: z.string(),
  kind: agentKindSchema,
  status: agentStatusSchema,
  taskSummary: z.string(),
  startedAt: z.number().optional(),
  updatedAt: z.number(),
  source: sourceKindSchema,
}).strict();

const seatFrameSchema = z.object({
  tableIndex: z.number(),
  agent: z.union([agentSnapshotSchema, z.null()]),
}).strict();

const sourceHealthSchema = z.object({
  sourceConnected: z.boolean(),
  sourceLabel: z.string(),
  warnings: z.array(z.string()),
}).strict();

const sceneFrameSchema: z.ZodType<SceneFrame> = z.object({
  generatedAt: z.number(),
  seats: z.array(seatFrameSchema),
  queue: z.array(agentSnapshotSchema),
  health: sourceHealthSchema,
}).strict();

const tooltipDataSchema: z.ZodType<TooltipData> = z.object({
  id: z.string(),
  name: z.string(),
  status: agentStatusSchema,
  task: z.string(),
  elapsed: z.string(),
  updated: z.string(),
}).strict();

const lifecycleEventSchema: z.ZodType<AgentLifecycleEvent> = z.object({
  kind: lifecycleEventTypeSchema,
  agentId: z.string(),
  at: z.number(),
  fromStatus: z.union([agentStatusSchema, z.null()]),
  toStatus: z.union([agentStatusSchema, z.null()]),
}).strict();

const inboundMessageSchema: z.ZodType<InboundMessage> = z.discriminatedUnion("type", [
  z.object({
    type: z.literal(BRIDGE_INBOUND_TYPE.sceneFrame),
    frame: sceneFrameSchema,
  }).strict(),
  z.object({
    type: z.literal(BRIDGE_INBOUND_TYPE.lifecycleEvents),
    events: z.array(lifecycleEventSchema),
  }).strict(),
  z.object({
    type: z.literal(BRIDGE_INBOUND_TYPE.tooltipData),
    tooltip: tooltipDataSchema,
  }).strict(),
  z.object({
    type: z.literal(BRIDGE_INBOUND_TYPE.hideTooltip),
  }).strict(),
]);
