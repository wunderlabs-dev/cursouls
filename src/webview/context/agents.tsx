import { BRIDGE_INBOUND_TYPE } from "@shared/bridge";
import type { Actor } from "@shared/types";

import type { VsCodeBridge } from "@web/bridge/bridge";
import { isNil } from "lodash";
import { createContext, type ReactNode, useContext, useEffect, useState } from "react";

interface ActorsContextValue {
  actors: Actor[];
}

const ActorsContext = createContext<ActorsContextValue | null>(null);

export const useActors = (): ActorsContextValue => {
  const value = useContext(ActorsContext);

  if (isNil(value)) {
    throw new Error("useActors must be used within AgentsProvider");
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
  const [actors, setActors] = useState<Actor[]>([]);

  useEffect(() => {
    const unsubscribe = bridge.subscribe((message) => {
      if (message.type === BRIDGE_INBOUND_TYPE.agents) {
        setActors(message.actors);
      }
    });
    bridge.postReady();
    return () => unsubscribe();
  }, [bridge]);

  return <ActorsContext.Provider value={{ actors }}>{children}</ActorsContext.Provider>;
};
