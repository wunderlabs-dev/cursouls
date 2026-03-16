import type { SceneFrame } from "@shared/types";
import { SceneAgents } from "@web/components/scene/scene-agents";
import { SceneGrid } from "@web/components/scene/scene-grid";
import { SceneTables } from "@web/components/scene/scene-tables";
import type { SceneComposition } from "@web/scene/composition";
import { buildSceneComposition } from "@web/scene/composition";
import {
  SCENE_BACKGROUND_DARK,
  SCENE_BACKGROUND_GRADIENT_FROM,
  SCENE_BACKGROUND_GRADIENT_TO,
  SCENE_MIN_HEIGHT,
  SCENE_MIN_WIDTH,
  SEATING_REGION_HEIGHT_TILE_SUBTRACT,
  SEATING_REGION_MIN_HEIGHT,
  SEATING_REGION_MIN_WIDTH,
  SEATING_REGION_OFFSET_X_MULTIPLIER,
  SEATING_REGION_OFFSET_Y_MULTIPLIER,
  SEATING_REGION_WIDTH_TILE_SUBTRACT,
  TABLE_ORIGIN_OFFSET_X_MULTIPLIER,
  TABLE_ORIGIN_OFFSET_Y_MULTIPLIER,
} from "@web/scene/constants";
import type { SceneLayoutBounds } from "@web/scene/model";
import { applyAgentsToAnchors, buildSceneTableAnchors } from "@web/scene/model";
import type { JSX } from "react";
import { useEffect, useMemo, useRef, useState } from "react";

interface CafeSceneProps {
  frame?: SceneFrame;
  onSeatClick: (agentId: string) => void;
}

export function CafeScene({ frame, onSeatClick }: CafeSceneProps): JSX.Element {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const size = useContainerSize(containerRef);
  const composition = useMemo(
    () => buildSceneComposition(size.width, size.height),
    [size.width, size.height],
  );
  const seatCount = frame?.seats.length ?? 0;
  const tableAnchors = useMemo(
    () => buildSceneTableAnchors(seatCount, toSeatingRegion(composition)),
    [composition, seatCount],
  );
  const sceneModel = useMemo(
    () => applyAgentsToAnchors(tableAnchors, frame),
    [tableAnchors, frame],
  );

  return (
    <div
      ref={containerRef}
      className="relative h-full w-full overflow-hidden rounded-lg"
      style={{ backgroundColor: SCENE_BACKGROUND_DARK }}
    >
      <div
        className="absolute inset-0"
        style={{
          backgroundImage: `linear-gradient(to bottom, ${SCENE_BACKGROUND_GRADIENT_FROM}, ${SCENE_BACKGROUND_GRADIENT_TO})`,
        }}
      />
      <SceneGrid composition={composition} />
      <SceneTables composition={composition} />
      <SceneAgents sceneModel={sceneModel} onSeatClick={onSeatClick} />
    </div>
  );
}

function useContainerSize(ref: React.RefObject<HTMLDivElement | null>): {
  width: number;
  height: number;
} {
  const [size, setSize] = useState({ width: 640, height: 460 });

  useEffect(() => {
    const node = ref.current;
    if (!node) return;
    let mounted = true;
    const sync = (): void => {
      if (!mounted) return;
      const rect = node.getBoundingClientRect();
      setSize({
        width: Math.max(SCENE_MIN_WIDTH, Math.floor(rect.width)),
        height: Math.max(SCENE_MIN_HEIGHT, Math.floor(rect.height)),
      });
    };
    sync();
    const observer = new ResizeObserver(sync);
    observer.observe(node);
    return () => {
      mounted = false;
      observer.disconnect();
    };
  }, [ref]);

  return size;
}

function toSeatingRegion(composition: SceneComposition): SceneLayoutBounds {
  return {
    width: Math.max(
      SEATING_REGION_MIN_WIDTH,
      composition.width - composition.tileSize * SEATING_REGION_WIDTH_TILE_SUBTRACT,
    ),
    height: Math.max(
      SEATING_REGION_MIN_HEIGHT,
      composition.height - composition.tileSize * SEATING_REGION_HEIGHT_TILE_SUBTRACT,
    ),
    offsetX: composition.originX + composition.tileSize * SEATING_REGION_OFFSET_X_MULTIPLIER,
    offsetY: composition.originY + composition.tileSize * SEATING_REGION_OFFSET_Y_MULTIPLIER,
    preferredTableOrigins: composition.cells
      .filter((cell) => cell.symbol === "t")
      .map((cell) => ({
        x: cell.x + composition.tileSize * TABLE_ORIGIN_OFFSET_X_MULTIPLIER,
        y: cell.y + composition.tileSize * TABLE_ORIGIN_OFFSET_Y_MULTIPLIER,
      })),
  };
}
