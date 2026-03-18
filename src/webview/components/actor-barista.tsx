import { useRef } from "react";

import AtlasSprite from "./atlas-sprite";

import atlasConfig from "../data/atlas.json";

import type { AtlasConfig, AtlasSpriteHandle } from "../types";

const ActorBarista = () => {
  const counter = useRef<AtlasSpriteHandle>(null);
  const config = (atlasConfig as AtlasConfig).actors["long-counter"];

  return (
    <button
      type="button"
      className="shrink-0 mx-auto"
      style={{
        width: config.width,
        height: config.height,
      }}
      onClick={() => counter.current?.play("long-counter/counter")}
    >
      <AtlasSprite

        ref={counter}
        atlasConfig={atlasConfig as AtlasConfig}
        animationConfig={config}
      />
    </button>
  );
};

export default ActorBarista;
