import { DEFAULT_SEAT_COUNT } from "@shared/constants";
import type { AgentSnapshot, SceneFrame } from "@shared/types";

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

export const SCENE_WIDTH = 420;
export const SCENE_HEIGHT = 362;

export function buildCafeSceneModel(frame?: SceneFrame): CafeSceneModel {
  const tableCount = Math.max(1, frame?.seats.length ?? DEFAULT_SEAT_COUNT);
  const tableAnchors = buildTableAnchors(tableCount);
  const byTable = new Map<number, AgentSnapshot | null>();
  frame?.seats.forEach((seat) => {
    if (seat.tableIndex >= 0 && seat.tableIndex < tableCount) {
      byTable.set(seat.tableIndex, seat.agent);
    }
  });

  return {
    generatedAt: frame?.generatedAt ?? Date.now(),
    seats: tableAnchors.map((anchor) => ({
      ...anchor,
      agent: byTable.get(anchor.tableIndex) ?? null,
    })),
  };
}

function buildTableAnchors(tableCount: number): readonly TableAnchor[] {
  return Array.from({ length: tableCount }, (_, index) => {
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
}
