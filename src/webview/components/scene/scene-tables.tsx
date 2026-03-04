import type { SceneComposition } from "@web/scene/composition";
import {
  TABLE_OFFSET_X_MULTIPLIER,
  TABLE_OFFSET_Y_MULTIPLIER,
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
            className="absolute rounded-md border-2 border-[#54453a] bg-[#b78f67] shadow-[0_4px_0_0_#3f3129]"
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
