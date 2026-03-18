import { BRIDGE_INBOUND_TYPE } from "@shared/bridge";
import type { Actor, SceneFrame } from "@shared/types";
import type { VsCodeBridge } from "@web/bridge/bridge";
import { createContext, type ReactNode, useContext, useEffect, useState } from "react";

interface ActorsContextValue {
  actors: Actor[];
}

const ActorsContext = createContext<ActorsContextValue | null>(null);

export const useActors = (): ActorsContextValue => {
  const value = useContext(ActorsContext);
  if (!value) {
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
      switch (message.type) {
        case BRIDGE_INBOUND_TYPE.sceneFrame:
          setActors(deriveActors(message.frame));
          return;
        case BRIDGE_INBOUND_TYPE.lifecycleEvents:
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

  return <ActorsContext.Provider value={{ actors }}>{children}</ActorsContext.Provider>;
};

const deriveActors = (frame: SceneFrame): Actor[] =>
  frame.seats.flatMap((seat) =>
    seat.agent
      ? [
          {
            id: seat.agent.id,
            status: seat.agent.status,
            taskSummary: seat.agent.taskSummary,
            tableIndex: seat.tableIndex,
          },
        ]
      : [],
  );

const assertNever = (_value: never): never => {
  throw new Error("Unhandled inbound bridge message.");
};
