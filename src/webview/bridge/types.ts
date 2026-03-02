import type { AgentStatus, SceneFrame } from "@shared/types";

export type AgentAnchor = "seat" | "queue";

export interface TooltipData {
  id: string;
  name: string;
  status: AgentStatus;
  task: string;
  elapsed: string;
  updated: string;
}

export type OutboundMessage =
  | { type: "ready" }
  | { type: "agentClick"; agentId: string; anchor: AgentAnchor };

export type InboundMessage =
  | { type: "sceneFrame"; frame: SceneFrame }
  | { type: "tooltipData"; tooltip: TooltipData }
  | { type: "hideTooltip" };

export type InboundMessageType = InboundMessage["type"];
