import Phaser from "phaser";
import type { SceneFrame } from "../../../../shared/types";
import { buildCafeSceneModel } from "./sceneModel";
import { createSeatSprite, type SeatSprite, updateSeatSprite } from "./spriteFactory";

interface CafePhaserSceneOptions {
  onSeatClick: (agentId: string) => void;
}

export interface CafePhaserSceneAdapter {
  scene: Phaser.Types.Scenes.SceneType;
  applyFrame: (frame: SceneFrame) => void;
}

interface CafePhaserSceneState {
  onSeatClick: (agentId: string) => void;
  seatSprites: Map<number, SeatSprite>;
  latestFrame: SceneFrame | undefined;
  sceneInstance: Phaser.Scene | undefined;
}

function renderFrame(state: CafePhaserSceneState, frame?: SceneFrame): void {
  const sceneInstance = state.sceneInstance;
  if (!sceneInstance) {
    return;
  }

  const model = buildCafeSceneModel(frame);

  model.seats.forEach((seat) => {
    const existing = state.seatSprites.get(seat.tableIndex);
    if (existing) {
      updateSeatSprite(existing, seat);
      return;
    }

    const sprite = createSeatSprite(sceneInstance, seat, state.onSeatClick);
    state.seatSprites.set(seat.tableIndex, sprite);
    updateSeatSprite(sprite, seat);
  });
}

export function createCafePhaserScene({ onSeatClick }: CafePhaserSceneOptions): CafePhaserSceneAdapter {
  const state: CafePhaserSceneState = {
    onSeatClick,
    seatSprites: new Map<number, SeatSprite>(),
    latestFrame: undefined,
    sceneInstance: undefined,
  };

  const scene: Phaser.Types.Scenes.SceneType = {
    key: "CafePhaserScene",
    create(this: Phaser.Scene) {
      state.sceneInstance = this;
      this.cameras.main.setBackgroundColor(0x221b16);
      renderFrame(state, state.latestFrame);
    },
  };

  const applyFrame = (frame: SceneFrame): void => {
    state.latestFrame = frame;
    if (!state.sceneInstance || !state.sceneInstance.scene.isActive()) {
      return;
    }
    renderFrame(state, frame);
  };

  return {
    scene,
    applyFrame,
  };
}
