import { first } from "lodash";

import type { AtlasConfig } from "@web/types";

import { Animation } from "./animation";

interface AtlasStaticProps {
  atlasConfig: AtlasConfig;
  actor: string;
}

const AtlasStatic = ({ atlasConfig, actor }: AtlasStaticProps) => {
  return (
    <div className="flex items-center justify-center col-span-1 aspect-square">
      <Animation
        atlasConfig={atlasConfig}
        animationConfig={atlasConfig.actors[actor]}
        animationName={first(atlasConfig.actors[actor].anims)!.key}
      />
    </div>
  );
};

export { AtlasStatic };
