import { ActorAgent } from "@web/components/actor-agent";
import { ActorBarista } from "@web/components/actor-barista";
import { SceneDialog } from "@web/components/scene-dialog";
import { SceneEnvironment } from "@web/components/scene-environment";
import { useActors } from "@web/context/agents";
import type { SceneEnvironmentHandle } from "@web/types";
import { useRef } from "react";

export const Scene = () => {
  const { actors, dialogText } = useActors();

  const sceneRef = useRef<SceneEnvironmentHandle>(null);

  return (
    <div className="h-screen w-full bg-surface px-2 py-2 text-black font-sans select-none">
      <div className="mx-auto flex h-full w-xl flex-col overflow-hidden rounded bg-cream">
        <SceneEnvironment ref={sceneRef}>
          <ActorBarista />

          <div className="grid w-full grid-cols-4">
            {actors.map((actor) => (
              <ActorAgent key={actor.id} status={actor.status} taskSummary={actor.taskSummary} />
            ))}
          </div>
        </SceneEnvironment>

        <SceneDialog text={dialogText} />
      </div>
    </div>
  );
};
