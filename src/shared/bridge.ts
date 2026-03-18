import type { CanonicalAgentSnapshot } from "@agentprobe/core";
import { z } from "zod";

export const BRIDGE_OUTBOUND_TYPE = {
  ready: "ready",
} as const;

export const BRIDGE_INBOUND_TYPE = {
  agents: "agents",
} as const;

const agentSnapshotSchema: z.ZodType<CanonicalAgentSnapshot> = z
  .object({
    id: z.string(),
    name: z.string(),
    kind: z.enum(["local", "remote"]),
    isSubagent: z.boolean(),
    status: z.enum(["running", "idle", "completed", "error"]),
    taskSummary: z.string(),
    startedAt: z.number().optional(),
    updatedAt: z.number(),
    source: z.string(),
    metadata: z.record(z.string(), z.unknown()).optional(),
  })
  .passthrough();

export const inboundBridgeMessageSchema = z.discriminatedUnion("type", [
  z.object({
    type: z.literal(BRIDGE_INBOUND_TYPE.agents),
    agents: z.array(agentSnapshotSchema),
  }),
]);

export const outboundBridgeMessageSchema = z.discriminatedUnion("type", [
  z
    .object({
      type: z.literal(BRIDGE_OUTBOUND_TYPE.ready),
    })
    .strict(),
]);

export type InboundMessage = z.infer<typeof inboundBridgeMessageSchema>;
export type OutboundMessage = z.infer<typeof outboundBridgeMessageSchema>;

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
