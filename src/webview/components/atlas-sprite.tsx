import { forwardRef, useImperativeHandle, useState, useCallback } from "react";
import { some, first } from "lodash";

import Animation from "./animation";
import { useCounter } from "../hooks/use-counter";
import type { AtlasConfig, ActorConfig, AtlasSpriteHandle } from "../types";

interface AtlasSpriteProps {
  atlasConfig: AtlasConfig;
  animationConfig: ActorConfig;
  defaultAnimation?: string;
}

const AtlasSprite = forwardRef<AtlasSpriteHandle, AtlasSpriteProps>(
  ({ atlasConfig, animationConfig, defaultAnimation }, ref) => {
    const idleKey = first(animationConfig.anims)!.key;

    const { count, increment } = useCounter();
    const [animationName, setAnimationName] = useState(defaultAnimation ?? idleKey);

    const play = useCallback(
      (name: string) => {
        if (some(animationConfig.anims, { key: name })) {
          setAnimationName(name);
          increment();
        }
      },
      [animationConfig.anims, increment],
    );

    useImperativeHandle(ref, () => ({
      play,
      get current() { return animationName; },
    }), [play, animationName]);

    return (
      <Animation
        key={count}
        atlasConfig={atlasConfig}
        animationConfig={animationConfig}
        animationName={animationName}
      />
    );
  },
);

export default AtlasSprite;
