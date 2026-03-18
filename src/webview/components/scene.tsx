import { ActorAgent } from "@web/components/actor-agent";
import { SceneDialog } from "@web/components/scene-dialog";

import { useActors } from "@web/context/agents";
import { DIALOG_TEXT } from "@web/utils/constants";
import { useState } from "react";

export const Scene = () => {
  const { actors } = useActors();

  const [dialogText] = useState(DIALOG_TEXT.WELCOME);

  return (
    <div className="h-screen w-full bg-surface px-2 py-2 text-black font-sans select-none">
      <div className="mx-auto flex h-full w-xl flex-col overflow-hidden rounded bg-cream">
        <div className="grid w-full grid-cols-4">
          {actors.map((actor) => (
            <ActorAgent key={actor.id} status={actor.status} taskSummary={actor.taskSummary} />
          ))}
        </div>

        <SceneDialog text={dialogText} />
      </div>
    </div>
  );
};
