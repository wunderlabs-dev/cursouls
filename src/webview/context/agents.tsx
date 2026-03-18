import type { CanonicalAgentSnapshot } from "@agentprobe/core";
import { BRIDGE_INBOUND_TYPE } from "@shared/bridge";

import type { VsCodeBridge } from "@web/bridge/bridge";
import { isNil } from "lodash";
import { createContext, type ReactNode, useContext, useEffect, useState } from "react";

interface AgentsContextValue {
  agents: CanonicalAgentSnapshot[];
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
  const [agents, setAgents] = useState<CanonicalAgentSnapshot[]>([]);

  useEffect(() => {
    const unsubscribe = bridge.subscribe((message) => {
      if (message.type === BRIDGE_INBOUND_TYPE.agents) {
        setAgents(message.agents);
      }
    });
    bridge.postReady();
    return () => unsubscribe();
  }, [bridge]);

  return <AgentsContext.Provider value={{ agents }}>{children}</AgentsContext.Provider>;
};
