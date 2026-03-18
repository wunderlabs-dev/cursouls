import { z } from "zod";
import { AGENT_STATUS } from "./types";

export const BRIDGE_OUTBOUND_TYPE = {
  ready: "ready",
} as const;

export const BRIDGE_INBOUND_TYPE = {
  agents: "agents",
} as const;

const agentSnapshotSchema = z.object({
  id: z.string(),
  status: z.enum([
    AGENT_STATUS.running,
    AGENT_STATUS.idle,
    AGENT_STATUS.completed,
    AGENT_STATUS.error,
  ]),
  taskSummary: z.string(),
});

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
