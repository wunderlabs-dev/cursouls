import { first, sample } from "lodash";
import { useEffect, useRef, useState } from "react";
import ReactFastMarquee from "react-fast-marquee";

import type { AgentStatus } from "@shared/types";
import type { ComponentType, ReactNode } from "react";
import type { AtlasConfig, AtlasSpriteHandle } from "@web/types";

import { AGENT_STATUS } from "@shared/types";
import atlasConfig from "@web/data/atlas.json";
import { AGENT_SKINS } from "@web/utils/constants";

import { Animation } from "./animation";
import { AtlasSprite } from "./atlas-sprite";

const Marquee = ((
  ReactFastMarquee as unknown as { default?: ComponentType<{ children?: ReactNode }> }
).default ?? ReactFastMarquee) as ComponentType<{ children?: ReactNode }>;

const AGENT_STATUS_ANIMATION: Record<AgentStatus, string> = {
  [AGENT_STATUS.running]: "working",
  [AGENT_STATUS.idle]: "idle",
  [AGENT_STATUS.completed]: "task-complete",
  [AGENT_STATUS.error]: "task-failed",
};

interface ActorAgentProps {
  status: AgentStatus;
  taskSummary: string;
}

const ActorAgent = ({ status, taskSummary }: ActorAgentProps) => {
  const [skin] = useState(() => sample(AGENT_SKINS) ?? first(AGENT_SKINS));

  const spriteRef = useRef<AtlasSpriteHandle>(null);
  const config = (atlasConfig as AtlasConfig).actors[skin];
  const bubbleConfig = (atlasConfig as AtlasConfig).actors.bubble;

  useEffect(() => {
    const animation = AGENT_STATUS_ANIMATION[status];

    if (animation) {
      spriteRef.current?.play(`${skin}/${animation}`);
    }
  }, [status, skin]);

  const animation = AGENT_STATUS_ANIMATION[status];
  const animationName = animation ? `${skin}/${animation}` : `${skin}/spawn`;

  const canSeeText = [
    `${skin}/spawn`,
    `${skin}/working`,
    `${skin}/done`,
    `${skin}/task-complete`,
  ].includes(animationName);

  return (
    <div className="group col-span-1 aspect-square relative cursor-help">
      {canSeeText && taskSummary ? (
        <div className="absolute bottom-21 right-2 hidden group-hover:block">
          <div className="absolute left-0 right-0 top-0 bottom-1 px-1">
            <Marquee>
              <span className="text-xs leading-3 uppercase whitespace-nowrap block px-1">
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
      />
    </div>
  );
};

export { ActorAgent };
