import type { AgentSnapshot } from "@shared/types";
import { AGENT_STATUS } from "@shared/types";

import type { VsCodeBridge } from "@web/bridge/bridge";
import { isNil } from "lodash";
import { createContext, type ReactNode, useContext, useEffect, useRef, useState } from "react";

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
  const [agents, setAgents] = useState<AgentSnapshot[]>([]);
  const baseline = useRef<Set<string> | null>(null);

  useEffect(() => {
    const unsubscribe = bridge.subscribe((message) => {
      if (!baseline.current) {
        baseline.current = new Set(message.agents.map((a) => a.id));
        return;
      }

      setAgents(
        message.agents.filter(
          (a) => a.status === AGENT_STATUS.running || !baseline.current?.has(a.id),
        ),
      );
    });
    bridge.postReady();
    return () => unsubscribe();
  }, [bridge]);

  return <AgentsContext.Provider value={{ agents }}>{children}</AgentsContext.Provider>;
};
