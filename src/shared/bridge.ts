import { z } from "zod";
import {
  AGENT_KIND,
  AGENT_LIFECYCLE_EVENT_KIND,
  AGENT_STATUS,
  type AgentLifecycleEvent,
  type SceneFrame,
} from "./types";

export const BRIDGE_AGENT_ANCHOR = {
  seat: "seat",
  queue: "queue",
} as const;
export type AgentAnchor = (typeof BRIDGE_AGENT_ANCHOR)[keyof typeof BRIDGE_AGENT_ANCHOR];

export const BRIDGE_OUTBOUND_TYPE = {
  ready: "ready",
  agentClick: "agentClick",
} as const;

export const BRIDGE_INBOUND_TYPE = {
  sceneFrame: "sceneFrame",
  lifecycleEvents: "lifecycleEvents",
  tooltipData: "tooltipData",
  hideTooltip: "hideTooltip",
} as const;

export const BRIDGE_LIFECYCLE_REPLAY_LIMIT = 200;

const agentStatusSchema = z.nativeEnum(AGENT_STATUS);
const agentKindSchema = z.nativeEnum(AGENT_KIND);
const sourceKindSchema = z.string().min(1);
const lifecycleEventTypeSchema = z.nativeEnum(AGENT_LIFECYCLE_EVENT_KIND);
const agentAnchorSchema = z.enum([BRIDGE_AGENT_ANCHOR.seat, BRIDGE_AGENT_ANCHOR.queue]);

const agentSnapshotSchema = z
  .object({
    id: z.string(),
    name: z.string(),
    kind: agentKindSchema,
    isSubagent: z.boolean(),
    status: agentStatusSchema,
    taskSummary: z.string(),
    startedAt: z.number().optional(),
    updatedAt: z.number(),
    source: sourceKindSchema,
  })
  .strict();

const seatFrameSchema = z
  .object({
    tableIndex: z.number(),
    agent: z.union([agentSnapshotSchema, z.null()]),
  })
  .strict();

const sourceHealthSchema = z
  .object({
    sourceConnected: z.boolean(),
    sourceLabel: z.string(),
    warnings: z.array(z.string()),
  })
  .strict();

const sceneFrameSchema: z.ZodType<SceneFrame> = z
  .object({
    generatedAt: z.number(),
    seats: z.array(seatFrameSchema),
    queue: z.array(agentSnapshotSchema),
    health: sourceHealthSchema,
  })
  .strict();

const tooltipDataSchema = z
  .object({
    id: z.string(),
    name: z.string(),
    status: agentStatusSchema,
    task: z.string(),
    elapsed: z.string(),
    updated: z.string(),
  })
  .strict();

const lifecycleEventSchema: z.ZodType<AgentLifecycleEvent> = z
  .object({
    kind: lifecycleEventTypeSchema,
    agentId: z.string(),
    at: z.number(),
    fromStatus: z.union([agentStatusSchema, z.null()]),
    toStatus: z.union([agentStatusSchema, z.null()]),
  })
  .strict();

export const inboundBridgeMessageSchema = z.discriminatedUnion("type", [
  z
    .object({
      type: z.literal(BRIDGE_INBOUND_TYPE.sceneFrame),
      frame: sceneFrameSchema,
    })
    .strict(),
  z
    .object({
      type: z.literal(BRIDGE_INBOUND_TYPE.lifecycleEvents),
      events: z.array(lifecycleEventSchema),
    })
    .strict(),
  z
    .object({
      type: z.literal(BRIDGE_INBOUND_TYPE.tooltipData),
      tooltip: tooltipDataSchema,
    })
    .strict(),
  z
    .object({
      type: z.literal(BRIDGE_INBOUND_TYPE.hideTooltip),
    })
    .strict(),
]);

export const outboundBridgeMessageSchema = z.discriminatedUnion("type", [
  z
    .object({
      type: z.literal(BRIDGE_OUTBOUND_TYPE.ready),
    })
    .strict(),
  z
    .object({
      type: z.literal(BRIDGE_OUTBOUND_TYPE.agentClick),
      agentId: z.string(),
      anchor: agentAnchorSchema,
    })
    .strict(),
]);

export type TooltipData = z.infer<typeof tooltipDataSchema>;
export type InboundMessage = z.infer<typeof inboundBridgeMessageSchema>;
export type OutboundMessage = z.infer<typeof outboundBridgeMessageSchema>;
export type InboundMessageType = InboundMessage["type"];

export function safeParseInboundBridgeMessage(
  value: unknown,
): z.ZodSafeParseResult<InboundMessage> {
  return inboundBridgeMessageSchema.safeParse(value);
}

export function safeParseOutboundBridgeMessage(
  value: unknown,
): z.ZodSafeParseResult<OutboundMessage> {
  return outboundBridgeMessageSchema.safeParse(value);
}
