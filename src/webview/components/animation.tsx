import { isNil } from "lodash";

import type { AtlasConfig, ActorConfig } from "../types";

import { useSpriteAnimation } from "../hooks/use-sprite-animation";

interface AnimationProps {
  atlasConfig: AtlasConfig;
  animationConfig: ActorConfig;
  animationName: string;
}

const Animation = ({
  atlasConfig,
  animationConfig,
  animationName,
}: AnimationProps) => {
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

export default Animation;
