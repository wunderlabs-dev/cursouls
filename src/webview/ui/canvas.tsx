import { useEffect, useRef } from "react";
import Phaser from "phaser";
import type { SceneFrame } from "@shared/types";
import { createCafePhaserScene, type CafePhaserSceneAdapter } from "@web/scene/scene";
import { SCENE_HEIGHT, SCENE_WIDTH } from "@web/scene/model";

interface PhaserCanvasProps {
  frame?: SceneFrame;
  onSeatClick: (agentId: string) => void;
}

export function PhaserCanvas({ frame, onSeatClick }: PhaserCanvasProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const sceneRef = useRef<CafePhaserSceneAdapter | null>(null);
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
      backgroundColor: "#221b16",
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

    return () => {
      sceneRef.current = null;
      game.destroy(true);
    };
  }, []);

  useEffect(() => {
    if (!frame) {
      return;
    }
    sceneRef.current?.applyFrame(frame);
  }, [frame]);

  return <div className="phaser-canvas-root" ref={containerRef} aria-label="Cafe phaser scene" />;
}
