import { faker } from "@faker-js/faker";
import { difference, isNil, map, reject, sample } from "lodash";
import { createContext, useCallback, useContext, useEffect, useState } from "react";

import type { AgentEvent } from "@shared/types";
import type { ReactNode } from "react";
import type { VsCodeBridge } from "@web/bridge/bridge";
import type { Actor } from "@web/types";

import { AGENT_STATUS, EVENT_KIND } from "@shared/types";
import { SCENE_GRID } from "@web/utils/constants";
import { useNotifications } from "@web/hooks/use-notifications";

import type { Notification } from "@web/hooks/use-notifications";

const emptySlots = SCENE_GRID.reduce<number[]>(
  (slots, cell, index) => (cell ? slots : [...slots, index]),
  [],
);

const STATUS_LABEL = {
  [AGENT_STATUS.running]: "is working",
  [AGENT_STATUS.idle]: "is idle",
  [AGENT_STATUS.completed]: "completed",
  [AGENT_STATUS.error]: "failed",
} as const;

interface ActorsContextValue {
  actors: Actor[];
  notifications: readonly Notification[];
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
  const { notifications, push } = useNotifications();

  const handleBridgeEvent = useCallback(
    (event: AgentEvent) => {
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
        push(`${alias} joined`);
      }

      if (event.kind === EVENT_KIND.statusChanged) {
        setActors((actors) => {
          const actor = actors.find((a) => a.id === event.agent.id);
          if (actor) {
            push(`${actor.alias} ${STATUS_LABEL[event.agent.status]}`);
          }
          return map(actors, (a) => (a.id === event.agent.id ? { ...a, ...event.agent } : a));
        });
      }

      if (event.kind === EVENT_KIND.left) {
        setActors((actors) =>
          reject(actors, {
            id: event.agent.id,
          }),
        );
      }
    },
    [push],
  );

  useEffect(() => {
    const unsubscribe = bridge.subscribe(handleBridgeEvent);
    bridge.postReady();
    return () => unsubscribe();
  }, [bridge, handleBridgeEvent]);

  return (
    <ActorsContext.Provider value={{ actors, notifications }}>{children}</ActorsContext.Provider>
  );
};
