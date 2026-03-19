import { isNil, map, reject } from "lodash";
import { createContext, useCallback, useContext, useEffect, useState } from "react";

import type { AgentEvent, AgentSnapshot } from "@shared/types";
import type { ReactNode } from "react";
import type { VsCodeBridge } from "@web/bridge/bridge";

import { EVENT_KIND } from "@shared/types";
import { DIALOG_TEXT } from "@web/utils/constants";

interface ActorsContextValue {
  actors: AgentSnapshot[];
  dialogText: string;
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
  const [actors, setActors] = useState<AgentSnapshot[]>([]);
  const [dialogText] = useState<string>(DIALOG_TEXT.WELCOME);

  const handleBridgeEvent = useCallback((event: AgentEvent) => {
    if (event.kind === EVENT_KIND.joined) {
      setActors((actors) => [...actors, event.agent]);
    }

    if (event.kind === EVENT_KIND.statusChanged) {
      setActors((actors) =>
        map(actors, (actor) => {
          if (actor.id === event.agent.id) {
            return event.agent;
          }
          return actor;
        }),
      );
    }

    if (event.kind === EVENT_KIND.left) {
      setActors((actors) =>
        reject(actors, {
          id: event.agent.id,
        }),
      );
    }
  }, []);

  useEffect(() => {
    const unsubscribe = bridge.subscribe(handleBridgeEvent);
    bridge.postReady();
    return () => unsubscribe();
  }, [bridge, handleBridgeEvent]);

  return <ActorsContext.Provider value={{ actors, dialogText }}>{children}</ActorsContext.Provider>;
};
