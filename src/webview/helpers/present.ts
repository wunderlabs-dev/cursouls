import {
  AGENT_LIFECYCLE_EVENT_KIND,
  type AgentLifecycleEvent,
  type AgentLifecycleEventType,
} from "@shared/types";

const LIFECYCLE_GLYPH: Record<AgentLifecycleEventType, string> = {
  [AGENT_LIFECYCLE_EVENT_KIND.joined]: "→",
  [AGENT_LIFECYCLE_EVENT_KIND.left]: "←",
  [AGENT_LIFECYCLE_EVENT_KIND.statusChanged]: "~",
  [AGENT_LIFECYCLE_EVENT_KIND.heartbeat]: "·",
};

export function lifecycleGlyph(kind: AgentLifecycleEventType): string {
  return LIFECYCLE_GLYPH[kind] ?? "?";
}

export function formatLifecycleEvent(
  event: AgentLifecycleEvent,
  agentNames: ReadonlyMap<string, string>,
): string {
  const name = agentNames.get(event.agentId) ?? truncateId(event.agentId);
  switch (event.kind) {
    case AGENT_LIFECYCLE_EVENT_KIND.joined:
      return `${name} joined`;
    case AGENT_LIFECYCLE_EVENT_KIND.left:
      return `${name} left`;
    case AGENT_LIFECYCLE_EVENT_KIND.statusChanged:
      return `${name}: ${event.fromStatus ?? "?"} → ${event.toStatus ?? "?"}`;
    case AGENT_LIFECYCLE_EVENT_KIND.heartbeat:
      return `${name} heartbeat`;
  }
  return `${name} ${String(event.kind)}`;
}

export function isVisibleLifecycleEvent(event: AgentLifecycleEvent): boolean {
  return event.kind !== AGENT_LIFECYCLE_EVENT_KIND.heartbeat;
}

function truncateId(id: string): string {
  return id.length > 8 ? `${id.slice(0, 8)}…` : id;
}
