import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { SceneFrame } from "@shared/types";

let containerCurrent: HTMLDivElement | null;
let refCallCount = 0;
let cleanupFns: Array<() => void> = [];

const useEffectMock = vi.fn((effect: () => undefined | (() => void)) => {
  const cleanup = effect();
  if (typeof cleanup === "function") {
    cleanupFns.push(cleanup);
  }
});

const useRefMock = vi.fn((initialValue: unknown) => {
  refCallCount += 1;
  if (refCallCount === 1) {
    return { current: containerCurrent };
  }
  return { current: initialValue };
});

const gameDestroyMock = vi.fn();
const gameCtorMock = vi.fn(() => ({ destroy: gameDestroyMock }));
const applyFrameMock = vi.fn();
const phaserSceneConfig = { key: "CafePhaserScene" };
const createSceneMock = vi.fn(() => ({ scene: phaserSceneConfig, applyFrame: applyFrameMock }));

vi.mock("react", () => ({
  useEffect: useEffectMock,
  useRef: useRefMock,
}));

vi.mock("phaser", () => ({
  default: {
    CANVAS: "CANVAS",
    Scale: {
      FIT: "FIT",
      CENTER_BOTH: "CENTER_BOTH",
    },
    Game: gameCtorMock,
  },
}));

vi.mock("@web/scene/scene", () => ({
  createCafePhaserScene: createSceneMock,
}));

vi.mock("@web/scene/model", () => ({
  SCENE_WIDTH: 348,
  SCENE_HEIGHT: 362,
}));

function makeFrame(): SceneFrame {
  return {
    generatedAt: 1_700_000_000_000,
    seats: [],
    queue: [],
    health: { sourceConnected: true, sourceLabel: "mock", warnings: [] },
  };
}

describe("PhaserCanvas lifecycle", () => {
  beforeEach(() => {
    vi.stubGlobal("React", { createElement: vi.fn(() => null) });
    containerCurrent = {} as HTMLDivElement;
    refCallCount = 0;
    cleanupFns = [];
    useEffectMock.mockClear();
    useRefMock.mockClear();
    gameDestroyMock.mockClear();
    gameCtorMock.mockClear();
    applyFrameMock.mockClear();
    createSceneMock.mockClear();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("creates a Phaser game on mount and destroys it on unmount", async () => {
    const { PhaserCanvas } = await import("@web/ui/canvas");

    PhaserCanvas({ frame: makeFrame(), onSeatClick: vi.fn() });

    expect(createSceneMock).toHaveBeenCalledTimes(1);
    expect(gameCtorMock).toHaveBeenCalledTimes(1);
    expect(gameCtorMock.mock.calls[0][0]).toMatchObject({ scene: [phaserSceneConfig] });
    expect(applyFrameMock).toHaveBeenCalledTimes(1);
    expect(cleanupFns).toHaveLength(1);

    cleanupFns[0]();
    expect(gameDestroyMock).toHaveBeenCalledTimes(1);
    expect(gameDestroyMock).toHaveBeenCalledWith(true);
  });

  it("does not create Phaser game when container ref is unavailable", async () => {
    containerCurrent = null;
    const { PhaserCanvas } = await import("@web/ui/canvas");

    PhaserCanvas({ frame: makeFrame(), onSeatClick: vi.fn() });

    expect(createSceneMock).not.toHaveBeenCalled();
    expect(gameCtorMock).not.toHaveBeenCalled();
    expect(cleanupFns).toHaveLength(0);
  });
});
