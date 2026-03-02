import type { AgentLifecycleEvent, AgentSnapshot } from "@shared/types";

export interface MapStatusInput {
  hasActivityDelta: boolean;
  lastActivityAt: number;
  hasTerminalEvent?: boolean;
  hasError?: boolean;
}

export interface MapStatusOptions {
  now: number;
  idleAfterMs: number;
}

export function mapStatus(
  input: MapStatusInput,
  options: MapStatusOptions,
): AgentSnapshot["status"] {
  if (input.hasError) {
    return "error";
  }

  if (input.hasTerminalEvent) {
    return "completed";
  }

  if (input.hasActivityDelta) {
    return "running";
  }

  const idleAfterMs = Math.max(0, options.idleAfterMs);
  const ageMs = options.now - input.lastActivityAt;
  return ageMs >= idleAfterMs ? "idle" : "running";
}

export interface EventMapper {
  mapStatus(input: MapStatusInput, options: MapStatusOptions): AgentSnapshot["status"];
  map(currentAgents: AgentSnapshot[], at?: number): AgentLifecycleEvent[];
  reset(): void;
}

export function createEventMapper(): EventMapper {
  let previousById = new Map<string, AgentSnapshot>();

  function mapStatusFromInput(
    input: MapStatusInput,
    options: MapStatusOptions,
  ): AgentSnapshot["status"] {
    return mapStatus(input, options);
  }

  function map(currentAgents: AgentSnapshot[], at: number = Date.now()): AgentLifecycleEvent[] {
    const events: AgentLifecycleEvent[] = [];
    const nextById = new Map<string, AgentSnapshot>();

    for (const agent of currentAgents) {
      const previous = previousById.get(agent.id);
      nextById.set(agent.id, agent);

      if (!previous) {
        events.push({
          type: "joined",
          agentId: agent.id,
          at,
          nextStatus: agent.status,
        });
        continue;
      }

      if (previous.status !== agent.status) {
        events.push({
          type: "status-changed",
          agentId: agent.id,
          at,
          previousStatus: previous.status,
          nextStatus: agent.status,
        });
        continue;
      }

      events.push({
        type: "heartbeat",
        agentId: agent.id,
        at,
        previousStatus: previous.status,
        nextStatus: agent.status,
      });
    }

    for (const [agentId, previous] of previousById.entries()) {
      if (!nextById.has(agentId)) {
        events.push({
          type: "left",
          agentId,
          at,
          previousStatus: previous.status,
        });
      }
    }

    previousById = nextById;
    return events;
  }

  function reset(): void {
    previousById.clear();
  }

  return {
    mapStatus: mapStatusFromInput,
    map,
    reset,
  };
}
