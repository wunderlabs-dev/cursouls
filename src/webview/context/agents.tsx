import { faker } from "@faker-js/faker";
import { difference, isNil, map, reject, sample } from "lodash";
import { createContext, useCallback, useContext, useEffect, useState } from "react";

import type { AgentEvent } from "@shared/types";
import type { ReactNode } from "react";
import type { VsCodeBridge } from "@web/bridge/bridge";
import type { Actor } from "@web/types";

import { EVENT_KIND } from "@shared/types";
import { DIALOG_TEXT, SCENE_GRID } from "@web/utils/constants";

const emptySlots = SCENE_GRID.reduce<number[]>(
  (slots, cell, index) => (cell ? slots : [...slots, index]),
  [],
);

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
  const [dialogText, setDialogText] = useState<string>(DIALOG_TEXT.WELCOME);

  const handleBridgeEvent = useCallback((event: AgentEvent) => {
    if (event.kind === EVENT_KIND.joined) {
      const alias = faker.person.firstName();

      setActors((actors) => {
        const occupiedSlots = actors.map((actor) => actor.slot);
        const freeSlots = difference(emptySlots, occupiedSlots);
        const slot = sample(freeSlots);

        if (isNil(slot)) {
          return actors;
        }
        return [...actors, { ...event.agent, alias, slot }];
      });
      setDialogText(alias);
    }

    if (event.kind === EVENT_KIND.statusChanged) {
      setActors((actors) =>
        map(actors, (actor) => {
          if (actor.id === event.agent.id) {
            return { ...actor, ...event.agent };
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
