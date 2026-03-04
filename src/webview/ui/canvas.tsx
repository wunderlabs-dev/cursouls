import { useEffect, useRef } from "react";
import Phaser from "phaser";
import type { SceneFrame } from "@shared/types";
import { createCafePhaserScene, type CafePhaserSceneAdapter } from "@web/scene/scene";
import { SCENE_HEIGHT, SCENE_WIDTH } from "@web/scene/model";
import { SCENE_BACKGROUND_COLOR } from "@web/constants";

interface PhaserCanvasProps {
  frame?: SceneFrame;
  onSeatClick: (agentId: string) => void;
}

export function PhaserCanvas({ frame, onSeatClick }: PhaserCanvasProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const sceneRef = useRef<CafePhaserSceneAdapter | null>(null);
  const gameRef = useRef<Phaser.Game | null>(null);
  const onSeatClickRef = useRef(onSeatClick);

  useEffect(() => {
    onSeatClickRef.current = onSeatClick;
  }, [onSeatClick]);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) {
      return;
    }

    const measureSize = () => {
      const rect = container.getBoundingClientRect();
      return {
        width: Math.max(320, Math.floor(rect.width || SCENE_WIDTH)),
        height: Math.max(260, Math.floor(rect.height || SCENE_HEIGHT)),
      };
    };

    const initialSize = measureSize();

    const scene = createCafePhaserScene({
      onSeatClick: (agentId) => {
        onSeatClickRef.current(agentId);
      },
    });
    sceneRef.current = scene;

    const game = new Phaser.Game({
      type: Phaser.CANVAS,
      width: initialSize.width,
      height: initialSize.height,
      pixelArt: true,
      parent: container,
      backgroundColor: SCENE_BACKGROUND_COLOR,
      scene: [scene.scene],
      scale: {
        mode: Phaser.Scale.NONE,
        autoCenter: Phaser.Scale.NO_CENTER,
      },
      render: {
        antialias: false,
        roundPixels: true,
      },
      audio: {
        noAudio: true,
      },
    });
    gameRef.current = game;

    let lastWidth = initialSize.width;
    let lastHeight = initialSize.height;
    const refreshScale = () => {
      const next = measureSize();
      if (next.width === lastWidth && next.height === lastHeight) {
        return;
      }
      lastWidth = next.width;
      lastHeight = next.height;
      game.scale.resize(next.width, next.height);
    };
    const resizeObserver =
      typeof ResizeObserver === "function" ? new ResizeObserver(refreshScale) : null;
    resizeObserver?.observe(container);
    refreshScale();

    return () => {
      sceneRef.current = null;
      gameRef.current = null;
      resizeObserver?.disconnect();
      game.destroy(true);
    };
  }, []);

  useEffect(() => {
    if (!frame) {
      return;
    }
    sceneRef.current?.applyFrame(frame);
  }, [frame]);

  return <div className="phaser-canvas-root" ref={containerRef} />;
}
