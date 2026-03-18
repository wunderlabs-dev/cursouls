import type { AgentSnapshot } from "@shared/types";
import { EVENT_KIND } from "@shared/types";

import type { VsCodeBridge } from "@web/bridge/bridge";
import { isNil } from "lodash";
import {
  createContext,
  type ReactNode,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";

interface AgentsContextValue {
  agents: AgentSnapshot[];
}

const AgentsContext = createContext<AgentsContextValue | null>(null);

export const useAgents = (): AgentsContextValue => {
  const value = useContext(AgentsContext);

  if (isNil(value)) {
    throw new Error("useAgents must be used within AgentsProvider");
  }
  return value;
};

export const AgentsProvider = ({
  bridge,
  children,
}: {
  bridge: VsCodeBridge;
  children: ReactNode;
}) => {
  const agentMap = useRef(new Map<string, AgentSnapshot>());
  const [agents, setAgents] = useState<AgentSnapshot[]>([]);

  const sync = useCallback(() => {
    setAgents([...agentMap.current.values()]);
  }, []);

  useEffect(() => {
    const unsubscribe = bridge.subscribe((message) => {
      const { kind, agent } = message;

      if (kind === EVENT_KIND.joined || kind === EVENT_KIND.statusChanged) {
        agentMap.current.set(agent.id, agent);
      } else if (kind === EVENT_KIND.left) {
        agentMap.current.delete(agent.id);
      }

      sync();
    });
    bridge.postReady();
    return () => unsubscribe();
  }, [bridge, sync]);

  return <AgentsContext.Provider value={{ agents }}>{children}</AgentsContext.Provider>;
};
