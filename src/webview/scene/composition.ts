export type LayoutSymbol = "W" | "w" | "C" | "F" | "t" | "d";

export const LAYOUT_SYMBOL = {
  wall: "W",
  windowFrame: "w",
  counter: "C",
  floor: "F",
  table: "t",
  decor: "d",
} as const satisfies Record<string, LayoutSymbol>;

export interface CompositionCell {
  symbol: LayoutSymbol;
  row: number;
  column: number;
  x: number;
  y: number;
  size: number;
}

export interface SceneComposition {
  tileSize: number;
  originX: number;
  originY: number;
  columns: number;
  rows: number;
  width: number;
  height: number;
  cells: readonly CompositionCell[];
}

const MIN_TILE_SIZE = 18;
const FRAME_PADDING = 12;

export const ROOM_LAYOUT = [
  "WWWWWWWWWWWWWWWWWW",
  "WwWwWwWwWwWwWwWwWW",
  "CCCCCCCCCCCCCCCCCC",
  "FFFFFFFFFFFFFFFFFF",
  "FFFtFFFFtFFFFtFFFF",
  "FFFFFFFFFFFFFFFFFF",
  "FFdFFFFFFFFFFFFdFF",
  "FFFFtFFFFtFFFFtFFF",
  "FFFFFFFFFFFFFFFFFF",
  "FFFdFFFFFFFFFFdFFF",
  "FFtFFFFFFFFFFFFtFF",
  "FFFFFFFFFFFFFFFFFF",
  "FFFFFtFFtFFtFFFFFF",
  "FFFFFFFFFFFFFFFFFF",
  "FFdFFFFFFFFFFFFdFF",
  "FFFtFFFFtFFFFtFFFF",
  "FFFFFFFFFFFFFFFFFF",
  "FFFFtFFFFFFFFtFFFF",
  "FFFFFFFFFFFFFFFFFF",
  "FFdFFFFFFFFFFFFdFF",
  "FFFFFFFFFFFFFFFFFF",
  "FFFFFFFFFFFFFFFFFF",
] as const;

function toLayoutSymbol(value: string): LayoutSymbol {
  switch (value) {
    case "W":
    case "w":
    case "C":
    case "F":
    case "t":
    case "d":
      return value;
    default:
      throw new Error(`Unsupported layout symbol: ${value}`);
  }
}

export function buildSceneComposition(sceneWidth: number, sceneHeight: number): SceneComposition {
  const columns = ROOM_LAYOUT[0].length;
  const rows = ROOM_LAYOUT.length;
  const maxTileByWidth = Math.max(
    MIN_TILE_SIZE,
    Math.floor((sceneWidth - FRAME_PADDING) / columns),
  );
  const maxTileByHeight = Math.max(MIN_TILE_SIZE, Math.floor((sceneHeight - FRAME_PADDING) / rows));
  const tileSize = Math.max(MIN_TILE_SIZE, Math.min(maxTileByWidth, maxTileByHeight));
  const width = columns * tileSize;
  const height = rows * tileSize;
  const originX = Math.floor((sceneWidth - width) / 2);
  const originY = Math.floor((sceneHeight - height) / 2);

  const cells: CompositionCell[] = [];
  for (let row = 0; row < rows; row += 1) {
    const pattern = ROOM_LAYOUT[row];
    for (let column = 0; column < columns; column += 1) {
      const symbol = toLayoutSymbol(pattern[column]);
      cells.push({
        symbol,
        row,
        column,
        x: originX + column * tileSize,
        y: originY + row * tileSize,
        size: tileSize,
      });
    }
  }

  return {
    tileSize,
    originX,
    originY,
    columns,
    rows,
    width,
    height,
    cells,
  };
}
