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

    const scene = createCafePhaserScene({
      onSeatClick: (agentId) => {
        onSeatClickRef.current(agentId);
      },
    });
    sceneRef.current = scene;

    const game = new Phaser.Game({
      type: Phaser.CANVAS,
      width: SCENE_WIDTH,
      height: SCENE_HEIGHT,
      parent: container,
      backgroundColor: SCENE_BACKGROUND_COLOR,
      scene: [scene.scene],
      scale: {
        mode: Phaser.Scale.FIT,
        autoCenter: Phaser.Scale.CENTER_BOTH,
        width: SCENE_WIDTH,
        height: SCENE_HEIGHT,
      },
      render: {
        antialias: false,
      },
      audio: {
        noAudio: true,
      },
    });
    gameRef.current = game;

    const refreshScale = () => {
      game.scale?.refresh?.();
    };
    const resizeObserver =
      typeof ResizeObserver === "function" ? new ResizeObserver(refreshScale) : null;
    resizeObserver?.observe(container);
    if (typeof window !== "undefined") {
      window.addEventListener("resize", refreshScale);
    }
    refreshScale();

    return () => {
      sceneRef.current = null;
      gameRef.current = null;
      resizeObserver?.disconnect();
      if (typeof window !== "undefined") {
        window.removeEventListener("resize", refreshScale);
      }
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
