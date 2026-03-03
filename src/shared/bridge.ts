import type { AgentLifecycleEvent, AgentStatus, SceneFrame } from "./types";

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

export interface TooltipData {
  id: string;
  name: string;
  status: AgentStatus;
  task: string;
  elapsed: string;
  updated: string;
}

export type OutboundMessage =
  | { type: typeof BRIDGE_OUTBOUND_TYPE.ready }
  | { type: typeof BRIDGE_OUTBOUND_TYPE.agentClick; agentId: string; anchor: AgentAnchor };

export type InboundMessage =
  | { type: typeof BRIDGE_INBOUND_TYPE.sceneFrame; frame: SceneFrame }
  | { type: typeof BRIDGE_INBOUND_TYPE.lifecycleEvents; events: AgentLifecycleEvent[] }
  | { type: typeof BRIDGE_INBOUND_TYPE.tooltipData; tooltip: TooltipData }
  | { type: typeof BRIDGE_INBOUND_TYPE.hideTooltip };

export type InboundMessageType = InboundMessage["type"];
