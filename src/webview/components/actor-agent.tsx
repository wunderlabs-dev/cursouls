import { forwardRef, useImperativeHandle, useRef, useState } from "react";
import { sample } from "lodash";

import { AGENT_SKINS } from "../utils/constants";

import AtlasSprite from "./atlas-sprite";
import Animation from "./animation";

import atlasConfig from "../data/atlas.json";

import type { AtlasConfig, AtlasSpriteHandle } from "../types";

export interface ActorAgentHandle {
  play: (name: string) => void;
  readonly skin: string;
  readonly animationKeys: string[];
}

const ActorAgent = forwardRef<ActorAgentHandle>((_props, ref) => {
  const [skin] = useState(() => sample(AGENT_SKINS) ?? AGENT_SKINS[0]);
  const [animationName, setAnimationName] = useState(() => `${skin}/spawn`);

  const spriteRef = useRef<AtlasSpriteHandle>(null);
  const config = (atlasConfig as AtlasConfig).actors[skin];
  const bubbleConfig = (atlasConfig as AtlasConfig).actors.bubble;

  const canSeeText = [
    `${skin}/spawn`,
    `${skin}/working`,
    `${skin}/done`,
    `${skin}/task-complete`
  ].includes(animationName);

  useImperativeHandle(ref, () => ({
    play: (name: string) => {
      spriteRef.current?.play(name);
      setAnimationName(name);
    },
    get skin() { return skin; },
    get animationKeys() { return config.anims.map((agent) => agent.key); },
  }), [skin, config.anims]);

  return (
    <div className="group col-span-1 aspect-square relative cursor-help">
      {canSeeText ? (
        <div className="absolute bottom-21 right-2 hidden group-hover:block">
          <div className="absolute left-0 right-0 top-0 bottom-1 overflow-hidden px-1">
            <div className="w-full overflow-hidden">
              <span className="block truncate px-1 text-xs leading-3 whitespace-nowrap uppercase">
                Joke conversations in agent transcripts
              </span>
            </div>
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
});

export default ActorAgent;
