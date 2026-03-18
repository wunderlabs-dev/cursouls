import { useSpriteAnimation } from "@web/hooks/use-sprite-animation";

import type { ActorConfig, AtlasConfig } from "@web/types";
import { isNil } from "lodash";

interface AnimationProps {
  atlasConfig: AtlasConfig;
  animationConfig: ActorConfig;
  animationName: string;
}

const Animation = ({ atlasConfig, animationConfig, animationName }: AnimationProps) => {
  const position = useSpriteAnimation(atlasConfig, animationConfig, animationName);

  if (isNil(position)) {
    return null;
  }

  return (
    <div
      className="bg-sprite-atlas bg-no-repeat"
      style={{
        width: animationConfig.width,
        height: animationConfig.height,
        backgroundPositionX: -position.x,
        backgroundPositionY: -position.y,
      }}
    />
  );
};

export { Animation };
