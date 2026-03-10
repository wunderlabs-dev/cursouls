import type { SceneComposition } from "@web/scene/composition";
import {
  TABLE_BG_CLASS,
  TABLE_BORDER_CLASS,
  TABLE_OFFSET_X_MULTIPLIER,
  TABLE_OFFSET_Y_MULTIPLIER,
  TABLE_SHADOW_CLASS,
  TABLE_SIZE_MULTIPLIER,
} from "@web/scene/constants";

interface SceneTablesProps {
  composition: SceneComposition;
}

export function SceneTables({ composition }: SceneTablesProps) {
  return (
    <>
      {composition.cells
        .filter((cell) => cell.symbol === "t")
        .map((cell) => (
          <div
            key={`table-${cell.row}-${cell.column}`}
            className={`absolute rounded-md border-2 ${TABLE_BORDER_CLASS} ${TABLE_BG_CLASS} ${TABLE_SHADOW_CLASS}`}
            style={{
              left: cell.x + cell.size * TABLE_OFFSET_X_MULTIPLIER,
              top: cell.y + cell.size * TABLE_OFFSET_Y_MULTIPLIER,
              width: cell.size * TABLE_SIZE_MULTIPLIER,
              height: cell.size * TABLE_SIZE_MULTIPLIER,
            }}
          />
        ))}
    </>
  );
}
