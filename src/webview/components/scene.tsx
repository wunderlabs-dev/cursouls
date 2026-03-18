import { ActorAgent } from "@web/components/actor-agent";
import { ActorBarista } from "@web/components/actor-barista";
import { SceneDialog } from "@web/components/scene-dialog";
import { SceneEnvironment } from "@web/components/scene-environment";
import { useAgents } from "@web/context/agents";
import type { SceneEnvironmentHandle } from "@web/types";
import { DIALOG_TEXT } from "@web/utils/constants";
import { useRef, useState } from "react";

export const Scene = () => {
  const { agents } = useAgents();

  const [dialogText] = useState(DIALOG_TEXT.WELCOME);

  const sceneRef = useRef<SceneEnvironmentHandle>(null);

  return (
    <div className="h-screen w-full bg-surface px-2 py-2 text-black font-sans select-none">
      <div className="mx-auto flex h-full w-xl flex-col overflow-hidden rounded bg-cream">
        <SceneEnvironment ref={sceneRef}>
          <ActorBarista />

          <div className="grid w-full grid-cols-4">
            {agents.map((agent) => (
              <ActorAgent key={agent.id} status={agent.status} taskSummary={agent.taskSummary} />
            ))}
          </div>
        </SceneEnvironment>

        <SceneDialog text={dialogText} />
      </div>
    </div>
  );
};
