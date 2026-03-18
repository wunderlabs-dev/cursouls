import type { RefObject } from "react";

export interface AtlasFrame {
  filename: string;
  frame: { x: number; y: number; w: number; h: number };
}

export interface AnimFrame {
  key: string;
  frame: string;
}

export interface Anim {
  key: string;
  type: string;
  repeat: number;
  frameRate: number;
  frames: AnimFrame[];
}

export interface ActorConfig {
  width: number;
  height: number;
  anims: Anim[];
}

export interface AtlasConfig {
  frames: AtlasFrame[];
  actors: Record<string, ActorConfig>;
}

export interface AtlasSpriteHandle {
  play: (name: string) => void;
  readonly current: string;
}

export interface Agent {
  id: string;
  slot: number;
  ref: RefObject<import("./components/actor-agent").ActorAgentHandle | null>;
}

export interface SceneEnvironmentHandle {
  scrollTo: (element: HTMLElement) => void;
}
