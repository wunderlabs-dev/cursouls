import { first, some } from "lodash";
import { forwardRef, useCallback, useImperativeHandle, useState } from "react";

import type { ActorConfig, AtlasConfig, AtlasSpriteHandle } from "@web/types";

import { useCounter } from "@web/hooks/use-counter";

import { Animation } from "./animation";

interface AtlasSpriteProps {
  atlasConfig: AtlasConfig;
  animationConfig: ActorConfig;
  defaultAnimation?: string;
  onComplete?: () => void;
}

const AtlasSprite = forwardRef<AtlasSpriteHandle, AtlasSpriteProps>(
  ({ atlasConfig, animationConfig, defaultAnimation, onComplete }, ref) => {
    const idleKey = first(animationConfig.anims)?.key ?? "";

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

    useImperativeHandle(
      ref,
      () => ({
        play,
        get current() {
          return animationName;
        },
      }),
      [play, animationName],
    );

    return (
      <Animation
        key={count}
        atlasConfig={atlasConfig}
        animationConfig={animationConfig}
        animationName={animationName}
        onComplete={onComplete}
      />
    );
  },
);

export { AtlasSprite };
