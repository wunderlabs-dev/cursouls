import type { AgentSnapshot, SceneFrame } from "@shared/types";

export const TABLE_COUNT = 6;

export interface TableAnchor {
  tableIndex: number;
  label: string;
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface SeatRenderModel extends TableAnchor {
  agent: AgentSnapshot | null;
}

export interface CafeSceneModel {
  generatedAt: number;
  seats: SeatRenderModel[];
}

const TABLE_WIDTH = 144;
const TABLE_HEIGHT = 86;
const TABLE_LEFT_X = 90;
const TABLE_RIGHT_X = 258;
const TABLE_TOP_Y = 76;
const TABLE_ROW_GAP = 100;
const TABLE_COLUMN_COUNT = 2;
const TABLE_LABEL_PREFIX = "Table";

export const TABLE_ANCHORS: readonly TableAnchor[] = Array.from({ length: TABLE_COUNT }, (_, index) => {
  const rowIndex = Math.floor(index / TABLE_COLUMN_COUNT);
  const columnIndex = index % TABLE_COLUMN_COUNT;
  const x = columnIndex === 0 ? TABLE_LEFT_X : TABLE_RIGHT_X;
  const y = TABLE_TOP_Y + rowIndex * TABLE_ROW_GAP;
  return {
    tableIndex: index,
    label: `${TABLE_LABEL_PREFIX} ${index + 1}`,
    x,
    y,
    width: TABLE_WIDTH,
    height: TABLE_HEIGHT,
  };
});

export const SCENE_WIDTH = 420;
export const SCENE_HEIGHT = 362;

export function buildCafeSceneModel(frame?: SceneFrame): CafeSceneModel {
  const byTable = new Map<number, AgentSnapshot | null>();
  frame?.seats.forEach((seat) => {
    if (seat.tableIndex >= 0 && seat.tableIndex < TABLE_COUNT) {
      byTable.set(seat.tableIndex, seat.agent);
    }
  });

  return {
    generatedAt: frame?.generatedAt ?? Date.now(),
    seats: TABLE_ANCHORS.map((anchor) => ({
      ...anchor,
      agent: byTable.get(anchor.tableIndex) ?? null,
    })),
  };
}
