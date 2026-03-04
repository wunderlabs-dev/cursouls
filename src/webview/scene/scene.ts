import type Phaser from "phaser";
import type { SceneFrame } from "@shared/types";
import { SCENE_BACKGROUND_COLOR_NUMERIC, SCENE_KEY } from "@web/constants";
import interiorsTiles from "@web/assets/interiors_free_32x32.png";
import roomBuilderTiles from "@web/assets/room_builder_free_32x32.png";
import { buildSceneComposition, type LayoutSymbol } from "./composition";
import { buildCafeSceneModel } from "./model";
import { createSeatSprite, ensureActorTextures, type SeatSprite, updateSeatSprite } from "./sprites";

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
  ambientPatrons: AmbientPatron[];
  latestFrame: SceneFrame | undefined;
  sceneInstance: Phaser.Scene | undefined;
  staticLayer: Phaser.GameObjects.GameObject[];
}

interface AmbientPatron {
  actor: Phaser.GameObjects.Sprite;
  frameEvent: Phaser.Time.TimerEvent;
  moveTween: Phaser.Tweens.Tween;
}

interface SymbolOverlay {
  textureKey: string;
  frame: number;
  widthMultiplier?: number;
  heightMultiplier?: number;
  offsetXMultiplier?: number;
  offsetYMultiplier?: number;
}

const ROOM_BUILDER_KEY = "room-builder-32";
const INTERIORS_KEY = "interiors-32";
const ROOM_BUILDER_COLUMNS = 17;
const INTERIORS_COLUMNS = 16;
const BASE_TILE_SIZE = 32;
const WALL_ROWS = 3;
const LAYOUT_DEBUG_FLAG = "__CURSOR_CAFE_LAYOUT_DEBUG__";

const WALL_TILE_FRAMES = [rb(1, 15), rb(2, 15), rb(3, 15), rb(4, 15)] as const;
const FLOOR_TILE_FRAMES = [it(0, 33), it(1, 33)] as const;
const COUNTER_TILE_FRAMES = [it(10, 70), it(11, 70), it(12, 70), it(13, 70)] as const;
const WINDOW_TILE_FRAMES = [it(6, 67), it(7, 67), it(8, 67), it(9, 67)] as const;
const TABLE_TILE_FRAMES = [it(2, 22), it(3, 22)] as const;
const DECOR_TILE_FRAMES = [it(0, 53), it(6, 58)] as const;
const ACCENT_DECOR_TILES = [
  { frame: it(10, 69), tileX: 0, tileY: 2 },
  { frame: it(11, 69), tileX: 9, tileY: 2 },
  { frame: it(0, 53), tileX: 0, tileY: 9 },
  { frame: it(0, 53), tileX: 9, tileY: 9 },
] as const;

function rb(column: number, row: number): number {
  return row * ROOM_BUILDER_COLUMNS + column;
}

function it(column: number, row: number): number {
  return row * INTERIORS_COLUMNS + column;
}

function renderFrame(state: CafePhaserSceneState, frame?: SceneFrame): void {
  const sceneInstance = state.sceneInstance;
  if (!sceneInstance) {
    return;
  }
  const composition = buildSceneComposition(sceneInstance.scale.gameSize.width, sceneInstance.scale.gameSize.height);
  const seatingRegion = {
    width: Math.max(420, composition.width - composition.tileSize),
    height: Math.max(320, composition.height - composition.tileSize * 3.2),
    offsetX: composition.originX + composition.tileSize * 0.4,
    offsetY: composition.originY + composition.tileSize * 2.4,
  };

  const model = buildCafeSceneModel(frame, {
    width: seatingRegion.width,
    height: seatingRegion.height,
    offsetX: seatingRegion.offsetX,
    offsetY: seatingRegion.offsetY,
    preferredTableOrigins: composition.cells
      .filter((cell) => cell.symbol === "t")
      .map((cell) => ({
        x: cell.x - composition.tileSize * 0.2,
        y: cell.y + composition.tileSize * 0.38,
      })),
  });
  const activeSeatIndexes = new Set<number>(model.seats.map((seat) => seat.tableIndex));

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

  for (const [tableIndex, sprite] of state.seatSprites.entries()) {
    if (activeSeatIndexes.has(tableIndex)) {
      continue;
    }
    sprite.actorTween?.stop();
    sprite.actorFrameEvent?.remove(false);
    sprite.actorSteamTween?.stop();
    sprite.floorShadow.destroy();
    sprite.agentActor.destroy();
    sprite.actorLaptop.destroy();
    sprite.actorSteam.destroy();
    sprite.actorHalo.destroy();
    sprite.actorStatusText.destroy();
    sprite.agentButton.destroy();
    state.seatSprites.delete(tableIndex);
  }
}

function renderStaticCafeLayer(scene: Phaser.Scene, state: CafePhaserSceneState): void {
  if (!scene.textures.exists(ROOM_BUILDER_KEY) || !scene.textures.exists(INTERIORS_KEY)) {
    return;
  }

  for (const object of state.staticLayer) {
    object.destroy();
  }
  state.staticLayer = [];

  const composition = buildSceneComposition(scene.scale.gameSize.width, scene.scale.gameSize.height);
  const interiorWidth = composition.width;
  const interiorHeight = composition.height;
  const interiorX = composition.originX;
  const interiorY = composition.originY;
  const tileSize = composition.tileSize;

  const add = <T extends Phaser.GameObjects.GameObject>(object: T): T => {
    state.staticLayer.push(object);
    return object;
  };

  add(
    scene.add
      .rectangle(interiorX - 2, interiorY - 2, interiorWidth + 4, interiorHeight + 4, 0x2a201b)
      .setOrigin(0, 0),
  );
  add(
    scene.add
      .rectangle(interiorX, interiorY, interiorWidth, interiorHeight, 0x1b1411)
      .setOrigin(0, 0),
  );
  add(
    scene.add
      .rectangle(
        interiorX,
        interiorY + WALL_ROWS * tileSize,
        interiorWidth,
        interiorHeight - WALL_ROWS * tileSize,
        0xb28553,
      )
      .setOrigin(0, 0),
  );

  // Pass 1: always paint a base tile so overlays never create holes.
  for (const cell of composition.cells) {
    const isWallZone = cell.row < WALL_ROWS || cell.symbol === "W" || cell.symbol === "w" || cell.symbol === "C";
    const baseTexture = isWallZone ? ROOM_BUILDER_KEY : INTERIORS_KEY;
    const baseFrame = isWallZone
      ? WALL_TILE_FRAMES[(cell.row + cell.column) % WALL_TILE_FRAMES.length]
      : FLOOR_TILE_FRAMES[(cell.row + cell.column) % FLOOR_TILE_FRAMES.length];
    add(
      scene.add
        .sprite(cell.x, cell.y, baseTexture, baseFrame)
        .setOrigin(0, 0)
        .setDisplaySize(tileSize, tileSize),
    );
  }

  // Pass 2: symbol overlays on top of base.
  for (const cell of composition.cells) {
    const overlay = resolveSymbolOverlay(cell.symbol, cell.column, cell.row);
    if (!overlay) {
      continue;
    }
    const width = tileSize * (overlay.widthMultiplier ?? 1);
    const height = tileSize * (overlay.heightMultiplier ?? 1);
    const offsetX = tileSize * (overlay.offsetXMultiplier ?? 0);
    const offsetY = tileSize * (overlay.offsetYMultiplier ?? 0);
    add(
      scene.add
        .sprite(cell.x + offsetX, cell.y + offsetY, overlay.textureKey, overlay.frame)
        .setOrigin(0, 0)
        .setDisplaySize(width, height),
    );
  }

  if (isLayoutDebugEnabled()) {
    for (const cell of composition.cells) {
      add(
        scene.add
          .text(
            cell.x + 2,
            cell.y + 2,
            symbolLabel(cell.symbol),
            {
              fontFamily: "monospace",
              fontSize: `${Math.max(8, Math.floor(tileSize * 0.22))}px`,
              color: "#ffdca8",
            },
          )
          .setOrigin(0, 0),
      );
      add(
        scene.add
          .rectangle(cell.x, cell.y, tileSize, tileSize)
          .setOrigin(0, 0)
          .setStrokeStyle(1, 0x000000, 0.16),
      );
    }
  }

  // Accent decor around the room edges.
  for (const decorTile of ACCENT_DECOR_TILES) {
    add(
      scene.add
        .sprite(
          interiorX + decorTile.tileX * tileSize,
          interiorY + decorTile.tileY * tileSize,
          INTERIORS_KEY,
          decorTile.frame,
        )
        .setOrigin(0, 0)
        .setDisplaySize(tileSize, tileSize),
    );
  }

  // Interior vignette
  add(
    scene.add
      .rectangle(interiorX, interiorY, interiorWidth, interiorHeight, 0x000000, 0.05)
      .setOrigin(0, 0),
  );

  clearAmbientPatrons(state);
  startAmbientPatrons(scene, state, composition);
}

function resolveSymbolOverlay(
  symbol: LayoutSymbol,
  column: number,
  row: number,
): SymbolOverlay | undefined {
  if (symbol === "w") {
    return {
      textureKey: INTERIORS_KEY,
      frame: WINDOW_TILE_FRAMES[Math.floor(column / 2) % WINDOW_TILE_FRAMES.length],
    };
  }
  if (symbol === "C") {
    return {
      textureKey: INTERIORS_KEY,
      frame: COUNTER_TILE_FRAMES[column % COUNTER_TILE_FRAMES.length],
      heightMultiplier: 1.15,
      offsetYMultiplier: -0.15,
    };
  }
  if (symbol === "t") {
    return {
      textureKey: INTERIORS_KEY,
      frame: TABLE_TILE_FRAMES[column % TABLE_TILE_FRAMES.length],
      widthMultiplier: 1.5,
      heightMultiplier: 1.5,
      offsetXMultiplier: -0.25,
      offsetYMultiplier: -0.35,
    };
  }
  if (symbol === "d") {
    return {
      textureKey: INTERIORS_KEY,
      frame: DECOR_TILE_FRAMES[(row + column) % DECOR_TILE_FRAMES.length],
    };
  }
  return undefined;
}

function isLayoutDebugEnabled(): boolean {
  const globalMaybe = globalThis as { [LAYOUT_DEBUG_FLAG]?: unknown };
  return globalMaybe[LAYOUT_DEBUG_FLAG] === true;
}

function symbolLabel(symbol: LayoutSymbol): string {
  switch (symbol) {
    case "W":
      return "W";
    case "w":
      return "w";
    case "C":
      return "C";
    case "t":
      return "t";
    case "d":
      return "d";
    case "F":
      return ".";
    default:
      return "?";
  }
}

export function createCafePhaserScene({
  onSeatClick,
}: CafePhaserSceneOptions): CafePhaserSceneAdapter {
  const state: CafePhaserSceneState = {
    onSeatClick,
    seatSprites: new Map<number, SeatSprite>(),
    ambientPatrons: [],
    latestFrame: undefined,
    sceneInstance: undefined,
    staticLayer: [],
  };

  const scene: Phaser.Types.Scenes.SceneType = {
    key: SCENE_KEY,
    preload(this: Phaser.Scene) {
      this.load.spritesheet(ROOM_BUILDER_KEY, roomBuilderTiles, {
        frameWidth: BASE_TILE_SIZE,
        frameHeight: BASE_TILE_SIZE,
      });
      this.load.spritesheet(INTERIORS_KEY, interiorsTiles, {
        frameWidth: BASE_TILE_SIZE,
        frameHeight: BASE_TILE_SIZE,
      });
    },
    create(this: Phaser.Scene) {
      state.sceneInstance = this;
      ensureActorTextures(this);
      this.cameras.main.setBackgroundColor(SCENE_BACKGROUND_COLOR_NUMERIC);
      renderStaticCafeLayer(this, state);
      this.scale.on("resize", () => {
        renderStaticCafeLayer(this, state);
        renderFrame(state, state.latestFrame);
      });
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

function clearAmbientPatrons(state: CafePhaserSceneState): void {
  for (const patron of state.ambientPatrons) {
    patron.frameEvent.remove(false);
    patron.moveTween.stop();
    patron.actor.destroy();
  }
  state.ambientPatrons = [];
}

function startAmbientPatrons(
  _scene: Phaser.Scene,
  _state: CafePhaserSceneState,
  _composition: ReturnType<typeof buildSceneComposition>,
): void {
  return;
}
