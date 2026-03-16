import type { SceneComposition } from "@web/scene/composition";
import {
  FLOOR_TILE_CLASS,
  TILE_BORDER_CLASS,
  WALL_TILE_CLASS,
  WALL_TOP_ROW_COUNT,
} from "@web/scene/constants";
import type { JSX } from "react";

interface SceneGridProps {
  composition: SceneComposition;
}

export function SceneGrid({ composition }: SceneGridProps): JSX.Element {
  return (
    <>
      {composition.cells.map((cell) => {
        const baseClass =
          cell.row < WALL_TOP_ROW_COUNT ||
          cell.symbol === "W" ||
          cell.symbol === "w" ||
          cell.symbol === "C"
            ? WALL_TILE_CLASS
            : FLOOR_TILE_CLASS;
        return (
          <div
            key={`${cell.row}-${cell.column}`}
            className={`absolute border ${TILE_BORDER_CLASS} ${baseClass}`}
            style={{ left: cell.x, top: cell.y, width: cell.size, height: cell.size }}
          />
        );
      })}
    </>
  );
}
