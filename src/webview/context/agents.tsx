import { createContext, useContext, useEffect, useRef, useState, type ReactNode } from "react";

import { BRIDGE_INBOUND_TYPE } from "@shared/bridge";
import type { AgentLifecycleEvent, AgentSnapshot, SceneFrame } from "@shared/types";

import type { VsCodeBridge } from "@web/bridge/bridge";

const FEED_BUFFER_LIMIT = 30;

type AgentsContextValue = {
  agents: AgentSnapshot[];
  frame: SceneFrame | null;
  lifecycleEvents: AgentLifecycleEvent[];
  agentNames: ReadonlyMap<string, string>;
};

const AgentsContext = createContext<AgentsContextValue | null>(null);

export const useAgents = (): AgentsContextValue => {
  const value = useContext(AgentsContext);
  if (!value) {
    throw new Error("useAgents must be used within AgentsProvider");
  }
  return value;
};

export const AgentsProvider = ({ bridge, children }: { bridge: VsCodeBridge; children: ReactNode }) => {
  const [agents, setAgents] = useState<AgentSnapshot[]>([]);
  const [frame, setFrame] = useState<SceneFrame | null>(null);
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
          setFrame(message.frame);
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
    <AgentsContext.Provider value={{ agents, frame, lifecycleEvents, agentNames: agentNames.current }}>
      {children}
    </AgentsContext.Provider>
  );
};

const collectAgents = (frame: SceneFrame): AgentSnapshot[] => {
  const seated = frame.seats.flatMap((seat) => (seat.agent ? [seat.agent] : []));
  return [...seated, ...frame.queue];
};

const updateAgentNames = (
  names: Map<string, string>,
  frame: SceneFrame,
  events: readonly AgentLifecycleEvent[],
): void => {
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
};

const assertNever = (_value: never): never => {
  throw new Error("Unhandled inbound bridge message.");
};
