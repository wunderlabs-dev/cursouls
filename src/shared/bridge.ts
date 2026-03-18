import { z } from "zod";
import { AGENT_STATUS, EVENT_KIND } from "./types";

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

const agentEventSchema = z.object({
  kind: z.enum([EVENT_KIND.joined, EVENT_KIND.statusChanged, EVENT_KIND.left]),
  agent: agentSnapshotSchema,
});

export const inboundSchema = agentEventSchema;

export const outboundSchema = z.object({
  ready: z.literal(true),
});

export type InboundMessage = z.infer<typeof inboundSchema>;
export type OutboundMessage = z.infer<typeof outboundSchema>;

export function safeParseInbound(value: unknown): z.ZodSafeParseResult<InboundMessage> {
  return inboundSchema.safeParse(value);
}

export function safeParseOutbound(value: unknown): z.ZodSafeParseResult<OutboundMessage> {
  return outboundSchema.safeParse(value);
}
