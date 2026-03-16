import { useEffect, useRef, useState } from "react";
import type { AgentLifecycleEvent, AgentSnapshot, SceneFrame } from "@shared/types";
import { BRIDGE_INBOUND_TYPE } from "@shared/bridge";
import type { VsCodeBridge } from "@web/bridge/bridge";
import { AgentPanel } from "@web/components/agent-panel";
import { FEED_BUFFER_LIMIT } from "@web/helpers/constants";

export function CafeAppContainer({ bridge }: { bridge: VsCodeBridge }) {
  const [agents, setAgents] = useState<AgentSnapshot[]>([]);
  const [lifecycleEvents, setLifecycleEvents] = useState<AgentLifecycleEvent[]>([]);
  const agentNames = useRef(new Map<string, string>());
  const lifecycleEventsRef = useRef<AgentLifecycleEvent[]>([]);

  useEffect(() => {
    lifecycleEventsRef.current = lifecycleEvents;
  }, [lifecycleEvents]);

  useEffect(() => {
    const unsubscribe = bridge.subscribe((message) => {
      switch (message.type) {
        case BRIDGE_INBOUND_TYPE.sceneFrame:
          updateAgentNames(agentNames.current, message.frame, lifecycleEventsRef.current);
          setAgents(collectAgents(message.frame));
          return;
        case BRIDGE_INBOUND_TYPE.lifecycleEvents:
          setLifecycleEvents(message.events.slice(-FEED_BUFFER_LIMIT));
          return;
        case BRIDGE_INBOUND_TYPE.tooltipData:
        case BRIDGE_INBOUND_TYPE.hideTooltip:
          return;
        default:
          assertNever(message);
      }
    });
    bridge.postReady();
    return () => unsubscribe();
  }, [bridge]);

  return (
    <AgentPanel
      agents={agents}
      lifecycleEvents={lifecycleEvents}
      agentNames={agentNames.current}
    />
  );
}

function collectAgents(frame: SceneFrame): AgentSnapshot[] {
  const seated = frame.seats.filter((s) => s.agent).map((s) => s.agent!);
  return [...seated, ...frame.queue];
}

function updateAgentNames(
  names: Map<string, string>,
  frame: SceneFrame,
  events: readonly AgentLifecycleEvent[],
): void {
  const activeIds = new Set<string>();
  for (const seat of frame.seats) {
    if (seat.agent) {
      activeIds.add(seat.agent.id);
      names.set(seat.agent.id, seat.agent.name);
    }
  }
  for (const agent of frame.queue) {
    activeIds.add(agent.id);
    names.set(agent.id, agent.name);
  }
  for (const event of events) {
    activeIds.add(event.agentId);
  }
  for (const id of names.keys()) {
    if (!activeIds.has(id)) {
      names.delete(id);
    }
  }
}

function assertNever(_value: never): never {
  throw new Error("Unhandled inbound bridge message.");
}
