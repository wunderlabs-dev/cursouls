import {
  AGENT_LIFECYCLE_EVENT_KIND,
  AGENT_STATUS,
  type AgentLifecycleEvent,
  type AgentLifecycleEventType,
  type AgentStatus,
} from "@shared/types";
import words from "lodash.words";
import upperFirst from "lodash.upperfirst";

export function initialsFor(name: string): string {
  const parts = words(name.trim());
  if (parts.length === 0) {
    return "??";
  }
  const initials = parts
    .slice(0, 2)
    .map((segment) => upperFirst(segment).charAt(0))
    .join("");
  return initials || "??";
}

export function statusGlyph(status: AgentStatus): string {
  switch (status) {
    case AGENT_STATUS.running:
      return "⌨";
    case AGENT_STATUS.idle:
      return "☕";
    case AGENT_STATUS.completed:
      return "✓";
    case AGENT_STATUS.error:
      return "⚠";
  }
  return assertNeverStatus(status);
}

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

function assertNeverStatus(value: never): never {
  throw new Error(`Unhandled agent status: ${String(value)}`);
}
