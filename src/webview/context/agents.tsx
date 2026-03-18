import { BRIDGE_INBOUND_TYPE } from "@shared/bridge";
import type { Actor } from "@shared/types";
import type { VsCodeBridge } from "@web/bridge/bridge";
import { DIALOG_TEXT } from "@web/utils/constants";
import { isNil } from "lodash";
import { createContext, type ReactNode, useContext, useEffect, useState } from "react";

interface ActorsContextValue {
  actors: Actor[];
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
  const [actors, setActors] = useState<Actor[]>([]);
  const [dialogText, setDialogText] = useState(DIALOG_TEXT.WELCOME);

  useEffect(() => {
    const unsubscribe = bridge.subscribe((message) => {
      if (message.type === BRIDGE_INBOUND_TYPE.agents) {
        const next = message.actors;

        setActors((prev) => {
          if (next.length > prev.length) {
            setDialogText(DIALOG_TEXT.AGENT_JOINED);
          }
          return next;
        });
      }
    });
    bridge.postReady();
    return () => unsubscribe();
  }, [bridge]);

  return <ActorsContext.Provider value={{ actors, dialogText }}>{children}</ActorsContext.Provider>;
};
