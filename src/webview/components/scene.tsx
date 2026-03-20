import { find } from "lodash";
import { useRef } from "react";

import type { AtlasConfig, SceneEnvironmentHandle } from "@web/types";

import atlasConfig from "@web/data/atlas.json";
import { SCENE_GRID } from "@web/utils/constants";

import { useActors } from "@web/context/agents";

import { ActorAgent } from "@web/components/actor-agent";
import { ActorBarista } from "@web/components/actor-barista";
import { AtlasStatic } from "@web/components/atlas-static";
import { SceneDialog } from "@web/components/scene-dialog";
import { SceneEnvironment } from "@web/components/scene-environment";

export const Scene = () => {
  const { actors, notifications } = useActors();

  const sceneRef = useRef<SceneEnvironmentHandle>(null);

  return (
    <div className="h-screen w-full px-2 py-2 font-sans text-black bg-surface select-none">
      <div className="flex flex-col overflow-hidden h-full w-xl mx-auto bg-cream rounded">
        <SceneEnvironment ref={sceneRef}>
          <ActorBarista />

          <div className="grid w-full grid-cols-4">
            {SCENE_GRID.map((cell, index) => {
              if (cell) {
                return (
                  <AtlasStatic key={index} atlasConfig={atlasConfig as AtlasConfig} actor={cell} />
                );
              }

              const actor = find(actors, { slot: index });

              if (actor) {
                return (
                  <ActorAgent key={index} status={actor.status} taskSummary={actor.taskSummary} />
                );
              }
              return <div key={index} className="col-span-1 aspect-square" />;
            })}
          </div>
        </SceneEnvironment>

        <SceneDialog notifications={notifications} />
      </div>
    </div>
  );
};
