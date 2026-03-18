import { ActorAgent } from "@web/components/actor-agent";
import { ActorBarista } from "@web/components/actor-barista";
import { AtlasStatic } from "@web/components/atlas-static";
import { SceneDialog } from "@web/components/scene-dialog";
import { SceneEnvironment } from "@web/components/scene-environment";
import { useActors } from "@web/context/agents";
import atlasConfig from "@web/data/atlas.json";
import type { AtlasConfig, SceneEnvironmentHandle } from "@web/types";
import { DIALOG_TEXT, SCENE_GRID } from "@web/utils/constants";
import { isNil, last } from "lodash";
import { useEffect, useRef, useState } from "react";

const EMPTY_SLOTS: number[] = [];
for (const [index, cell] of SCENE_GRID.entries()) {
  if (!cell) EMPTY_SLOTS.push(index);
}

export const Scene = () => {
  const { actors } = useActors();

  const [dialogText] = useState(DIALOG_TEXT.WELCOME);

  const sceneRef = useRef<SceneEnvironmentHandle>(null);
  const gridRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isNil(gridRef.current)) {
      return;
    }

    const lastActor = last(actors);

    if (isNil(lastActor)) {
      return;
    }

    const gridSlot = EMPTY_SLOTS[lastActor.tableIndex];
    const cell = gridRef.current.children[gridSlot] as HTMLElement;

    sceneRef.current?.scrollTo(cell);
  }, [actors]);

  return (
    <div className="h-screen w-full bg-surface px-2 py-2 text-black font-sans select-none">
      <div className="mx-auto flex h-full w-xl flex-col overflow-hidden rounded bg-cream">
        <SceneEnvironment ref={sceneRef}>
          <ActorBarista />

          <div ref={gridRef} className="grid w-full grid-cols-4">
            {SCENE_GRID.map((cell, index) => {
              if (cell) {
                return (
                  <AtlasStatic key={cell} atlasConfig={atlasConfig as AtlasConfig} actor={cell} />
                );
              }

              const actor = actors.find((a) => EMPTY_SLOTS[a.tableIndex] === index);

              if (actor) {
                return <ActorAgent key={actor.id} status={actor.status} />;
              }

              return <div key={index} className="col-span-1 aspect-square" />;
            })}
          </div>
        </SceneEnvironment>

        <SceneDialog text={dialogText} />
      </div>
    </div>
  );
};
