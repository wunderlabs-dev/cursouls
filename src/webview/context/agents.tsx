import { faker } from "@faker-js/faker";
import { difference, find, isNil, map, reject, sample } from "lodash";
import { createContext, useCallback, useContext, useEffect, useState } from "react";

import type { AgentEvent } from "@shared/types";
import type { ReactNode } from "react";
import type { VsCodeBridge } from "@web/bridge/bridge";
import type { Actor } from "@web/types";

import { useNotifications } from "@web/hooks/use-notifications";

import { AGENT_STATUS, EVENT_KIND } from "@shared/types";
import { NOTIFICATION, SCENE_GRID } from "@web/utils/constants";

import type { Notification } from "@web/hooks/use-notifications";

const EMPTY_SLOTS = SCENE_GRID.reduce<number[]>(
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
  const { notifications, dispatch } = useNotifications();

  const handleActorJoined = useCallback(
    (event: AgentEvent) => {
      const alias = faker.person.firstName();

      setActors((actors) => {
        const occupiedSlots = actors.map((actor) => actor.slot);
        const freeSlots = difference(EMPTY_SLOTS, occupiedSlots);
        const slot = sample(freeSlots);

        if (isNil(slot)) {
          return actors;
        }
        return [...actors, { ...event.agent, alias, slot }];
      });

      dispatch(`${alias} ${NOTIFICATION.joined}`);
    },
    [dispatch],
  );

  const handleActorStatusChanged = useCallback(
    (event: AgentEvent) => {
      setActors((actors) => {
        const matched = find(actors, { id: event.agent.id });
        const label = STATUS_LABEL[event.agent.status];

        if (matched) {
          dispatch(`${matched.alias} ${label}`);
        }

        return map(actors, (actor) => {
          if (actor.id === event.agent.id) {
            return { ...actor, ...event.agent };
          }
          return actor;
        });
      });
    },
    [dispatch],
  );

  const handleActorLeft = useCallback(
    (event: AgentEvent) => {
      setActors((actors) => {
        const matched = find(actors, { id: event.agent.id });

        if (matched) {
          dispatch(`${matched.alias} ${NOTIFICATION.left}`);
        }
        return reject(actors, { id: event.agent.id });
      });
    },
    [dispatch],
  );

  const handleBridgeEvent = useCallback(
    (event: AgentEvent) => {
      if (event.kind === EVENT_KIND.joined) {
        handleActorJoined(event);
      }
      if (event.kind === EVENT_KIND.statusChanged) {
        handleActorStatusChanged(event);
      }
      if (event.kind === EVENT_KIND.left) {
        handleActorLeft(event);
      }
    },
    [handleActorJoined, handleActorStatusChanged, handleActorLeft],
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
