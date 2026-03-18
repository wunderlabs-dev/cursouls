import { first } from "lodash";

import Animation from "./animation";
import type { AtlasConfig } from "../types";

interface AtlasStaticProps {
  atlasConfig: AtlasConfig;
  actor: string;
}

const AtlasStatic = ({ atlasConfig, actor }: AtlasStaticProps) => {
  return (
    <div className="col-span-1 flex items-center justify-center aspect-square">
      <Animation
        atlasConfig={atlasConfig}
        animationConfig={atlasConfig.actors[actor]}
        animationName={first(atlasConfig.actors[actor].anims)!.key}
      />
    </div>
  );
};

export default AtlasStatic;
