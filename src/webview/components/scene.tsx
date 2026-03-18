import { createRef, useCallback, useEffect, useRef, useState } from "react";
import { difference, find, isNil, last, sample } from "lodash";

import atlasConfig from "@web/data/atlas.json";

import { DIALOG_TEXT, SCENE_GRID } from "@web/utils/constants";

import type { Agent, AtlasConfig, SceneEnvironmentHandle } from "@web/types";

import ActorAgent, { type ActorAgentHandle } from "@web/components/actor-agent";
import ActorBarista from "@web/components/actor-barista";
import AtlasStatic from "@web/components/atlas-static";
import SceneDialog from "@web/components/scene-dialog";
import SceneEnvironment from "@web/components/scene-environment";

export const Scene = () => {
  const [agents, setAgents] = useState<Agent[]>([]);
  const [dialogText] = useState(DIALOG_TEXT.WELCOME);

  const sceneRef = useRef<SceneEnvironmentHandle>(null);
  const gridRef = useRef<HTMLDivElement>(null);

  const emptySlots = SCENE_GRID.reduce<number[]>(
    (accelerator, cell, index) => (cell ? accelerator : [...accelerator, index]),
    [],
  );

  const occupiedSlots = agents.map((agent) => agent.slot);
  const freeSlots = difference(emptySlots, occupiedSlots);

  const spawn = useCallback(() => {
    const slot = sample(freeSlots);

    if (isNil(slot)) {
      return;
    }

    setAgents((prev) => [
      ...prev,
      { id: String(Date.now()), slot, ref: createRef<ActorAgentHandle>() },
    ]);
  }, [freeSlots]);

  useEffect(() => {
    const latest = last(agents);

    if (isNil(latest) || isNil(gridRef.current)) {
      return;
    }

    const cell = gridRef.current.children[latest.slot] as HTMLElement;

    sceneRef.current?.scrollTo(cell);
  }, [agents]);

  return (
    <div className="h-screen w-full bg-surface px-2 py-2 text-black font-sans select-none">
      <div className="mx-auto flex h-full w-xl flex-col overflow-hidden rounded bg-cream">
        <SceneEnvironment ref={sceneRef}>
          <ActorBarista />

          <div ref={gridRef} className="grid w-full grid-cols-4">
            {SCENE_GRID.map((actor, index) => {
              const agent = find(agents, { slot: index });

              return actor ? (
                <AtlasStatic key={actor} atlasConfig={atlasConfig as AtlasConfig} actor={actor} />
              ) : agent ? (
                <ActorAgent key={agent.id} ref={agent.ref} />
              ) : (
                <div className="col-span-1 aspect-square" />
              );
            })}
          </div>
        </SceneEnvironment>

        <SceneDialog text={dialogText} />
      </div>
    </div>
  );
};
