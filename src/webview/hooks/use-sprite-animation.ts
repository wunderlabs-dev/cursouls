import { find, isEmpty, isNil } from "lodash";
import { useEffect, useMemo, useState } from "react";

import type { ActorConfig, AtlasConfig, AtlasFrame } from "@web/types";

const FRAME_STEP = 1;
const FRAME_REPEAT_INFINITE = -1;
const FRAME_INDEX_START = 0;
const MILLISECONDS_PER_SECOND = 1000;

export const useSpriteAnimation = (
  atlasConfig: AtlasConfig,
  animationConfig: ActorConfig,
  animationName: string,
): AtlasFrame["frame"] | undefined => {
  const [frameIndex, setFrameIndex] = useState(FRAME_INDEX_START);

  const { animation, framePositions } = useMemo(() => {
    const animation = find(animationConfig.anims, { key: animationName });

    if (isNil(animation)) {
      return { framePositions: [], animation: undefined };
    }

    const framePositions = animation.frames.map((animationFrame) => {
      const atlasFrame = find(atlasConfig.frames, {
        filename: animationFrame.frame,
      });
      return atlasFrame?.frame;
    });

    return { animation, framePositions };
  }, [animationConfig.anims, animationName, atlasConfig.frames]);

  useEffect(() => {
    setFrameIndex(FRAME_INDEX_START);

    if (isNil(animation) || isEmpty(framePositions)) {
      return;
    }

    const lastFrame = framePositions.length - FRAME_STEP;
    const frameDuration = MILLISECONDS_PER_SECOND / animation.frameRate;
    const loops = animation.repeat === FRAME_REPEAT_INFINITE;

    const interval = setInterval(() => {
      setFrameIndex((prev) => {
        if (prev < lastFrame) return prev + FRAME_STEP;
        if (loops) return FRAME_INDEX_START;
        clearInterval(interval);
        return prev;
      });
    }, frameDuration);

    return () => clearInterval(interval);
  }, [animation, framePositions]);

  if (isNil(animation) || isEmpty(framePositions)) {
    return;
  }

  return framePositions?.[frameIndex];
};
