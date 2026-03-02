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

export const TABLE_ANCHORS: readonly TableAnchor[] = [
  { tableIndex: 0, label: "Table 1", x: 90, y: 76, width: TABLE_WIDTH, height: TABLE_HEIGHT },
  { tableIndex: 1, label: "Table 2", x: 258, y: 76, width: TABLE_WIDTH, height: TABLE_HEIGHT },
  { tableIndex: 2, label: "Table 3", x: 90, y: 176, width: TABLE_WIDTH, height: TABLE_HEIGHT },
  { tableIndex: 3, label: "Table 4", x: 258, y: 176, width: TABLE_WIDTH, height: TABLE_HEIGHT },
  { tableIndex: 4, label: "Table 5", x: 90, y: 276, width: TABLE_WIDTH, height: TABLE_HEIGHT },
  { tableIndex: 5, label: "Table 6", x: 258, y: 276, width: TABLE_WIDTH, height: TABLE_HEIGHT },
];

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
