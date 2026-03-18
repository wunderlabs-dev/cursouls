import { type ComponentType, type ReactNode, useEffect, useRef, useState } from "react";
import { sample, first } from "lodash";
import MarqueeImport from "react-fast-marquee";

import { AGENT_STATUS } from "@shared/types";
import type { AgentStatus } from "@shared/types";

import { AGENT_SKINS } from "../utils/constants";

const Marquee =
  ((MarqueeImport as unknown as { default?: ComponentType<{ children?: ReactNode }> }).default ??
    MarqueeImport) as ComponentType<{ children?: ReactNode }>;

import AtlasSprite from "./atlas-sprite";
import Animation from "./animation";

import atlasConfig from "../data/atlas.json";

import type { AtlasConfig, AtlasSpriteHandle } from "../types";

const STATUS_ANIMATION: Record<string, string> = {
  [AGENT_STATUS.running]: "working",
  [AGENT_STATUS.idle]: "idle",
  [AGENT_STATUS.completed]: "task-complete",
  [AGENT_STATUS.error]: "task-failed",
};

interface ActorAgentProps {
  status: AgentStatus;
}

const ActorAgent = ({ status }: ActorAgentProps) => {
  const [skin] = useState(() => sample(AGENT_SKINS) ?? first(AGENT_SKINS));

  const spriteRef = useRef<AtlasSpriteHandle>(null);
  const config = (atlasConfig as AtlasConfig).actors[skin];
  const bubbleConfig = (atlasConfig as AtlasConfig).actors.bubble;

  useEffect(() => {
    const animation = STATUS_ANIMATION[status];

    if (animation) {
      spriteRef.current?.play(`${skin}/${animation}`);
    }
  }, [status, skin]);

  const animation = STATUS_ANIMATION[status];
  const animationName = animation ? `${skin}/${animation}` : `${skin}/spawn`;

  const canSeeText = [
    `${skin}/spawn`,
    `${skin}/working`,
    `${skin}/done`,
    `${skin}/task-complete`
  ].includes(animationName);

  return (
    <div className="group col-span-1 aspect-square relative cursor-help">
      {canSeeText ? (
        <div className="absolute bottom-21 right-2 hidden group-hover:block">
          <div className="absolute left-0 right-0 top-0 bottom-1 px-1">
            <Marquee>
              <span className="text-xs leading-3 uppercase whitespace-nowrap block px-1">Joke conversations in agent transcripts</span>
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

export default ActorAgent;
