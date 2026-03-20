import { first, sample } from "lodash";
import { useEffect, useRef, useState } from "react";
import ReactFastMarquee from "react-fast-marquee";

import type { AgentStatus } from "@shared/types";
import type { ComponentType, ReactNode } from "react";
import type { AtlasConfig, AtlasSpriteHandle } from "@web/types";

import atlasConfig from "@web/data/atlas.json";

import { AGENT_SKINS } from "@web/utils/constants";
import { useAnimationLifecycle } from "@web/hooks/use-animation-lifecycle";

import { Animation } from "./animation";
import { AtlasSprite } from "./atlas-sprite";

const Marquee = ((
  ReactFastMarquee as unknown as { default?: ComponentType<{ children?: ReactNode }> }
).default ?? ReactFastMarquee) as ComponentType<{ children?: ReactNode }>;

interface ActorAgentProps {
  status: AgentStatus;
  taskSummary: string;
}

const ActorAgent = ({ status, taskSummary }: ActorAgentProps) => {
  const [skin] = useState(() => sample(AGENT_SKINS) ?? first(AGENT_SKINS));

  const spriteRef = useRef<AtlasSpriteHandle>(null);
  const config = (atlasConfig as AtlasConfig).actors[skin];
  const bubbleConfig = (atlasConfig as AtlasConfig).actors.bubble;

  const { animationName, advance } = useAnimationLifecycle(skin, status);

  useEffect(() => {
    if (spriteRef.current?.current !== animationName) {
      spriteRef.current?.play(animationName);
    }
  }, [animationName]);

  const canSeeText = new Set([
    `${skin}/spawn`,
    `${skin}/idle`,
    `${skin}/working`,
    `${skin}/task-complete`,
  ]).has(animationName);

  return (
    <div className="group relative col-span-1 aspect-square cursor-help">
      {canSeeText && taskSummary ? (
        <div className="absolute right-2 bottom-21 hidden group-hover:block">
          <div className="absolute top-0 right-0 bottom-1 left-0 px-1">
            <Marquee>
              <span className="block px-1 text-xs leading-3 uppercase whitespace-nowrap">
                {taskSummary}
              </span>
            </Marquee>
          </div>
          <Animation
            animationName="bubble"
            atlasConfig={atlasConfig as AtlasConfig}
            animationConfig={bubbleConfig}
          />
        </div>
      ) : null}

      <AtlasSprite
        ref={spriteRef}
        atlasConfig={atlasConfig as AtlasConfig}
        animationConfig={config}
        defaultAnimation={`${skin}/spawn`}
        onComplete={advance}
      />
    </div>
  );
};

export { ActorAgent };
