import { z } from "zod";
import { AGENT_STATUS } from "./types";

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

export const inboundSchema = z.object({
  agents: z.array(agentSnapshotSchema),
});

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
