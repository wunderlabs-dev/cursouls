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

const TABLE_WIDTH = 116;
const TABLE_HEIGHT = 72;
const TABLE_LABEL_PREFIX = "Table";
const TABLE_MIN_COLUMNS = 2;
const TABLE_MAX_COLUMNS = 6;
const TABLE_HORIZONTAL_PADDING = 12;
const TABLE_TOP_PADDING = 36;
const TABLE_BOTTOM_PADDING = 16;

export const SCENE_WIDTH = 760;
export const SCENE_HEIGHT = 560;

export interface SceneLayoutBounds {
  width: number;
  height: number;
  offsetX?: number;
  offsetY?: number;
  preferredTableOrigins?: readonly { x: number; y: number }[];
}

export function buildSceneTableAnchors(
  tableCount: number,
  bounds: SceneLayoutBounds,
): readonly TableAnchor[] {
  return buildTableAnchors(Math.max(1, tableCount), bounds);
}

export function applyAgentsToAnchors(
  anchors: readonly TableAnchor[],
  frame?: SceneFrame,
): CafeSceneModel {
  const byTable = new Map<number, AgentSnapshot | null>();
  frame?.seats.forEach((seat) => {
    if (seat.tableIndex >= 0 && seat.tableIndex < anchors.length) {
      byTable.set(seat.tableIndex, seat.agent);
    }
  });

  return {
    generatedAt: frame?.generatedAt ?? Date.now(),
    seats: anchors.map((anchor) => ({
      ...anchor,
      agent: byTable.get(anchor.tableIndex) ?? null,
    })),
  };
}

export function buildCafeSceneModel(
  frame?: SceneFrame,
  bounds: SceneLayoutBounds = { width: SCENE_WIDTH, height: SCENE_HEIGHT },
): CafeSceneModel {
  const tableCount = Math.max(1, frame?.seats.length ?? DEFAULT_SEAT_COUNT);
  const anchors = buildTableAnchors(tableCount, bounds);
  return applyAgentsToAnchors(anchors, frame);
}

function buildTableAnchors(tableCount: number, bounds: SceneLayoutBounds): readonly TableAnchor[] {
  const preferredAnchors = buildPreferredTableAnchors(tableCount, bounds);
  if (preferredAnchors) {
    return preferredAnchors;
  }
  return buildGridAnchors(tableCount, bounds);
}

function buildPreferredTableAnchors(
  tableCount: number,
  bounds: SceneLayoutBounds,
): readonly TableAnchor[] | undefined {
  const preferredOrigins = bounds.preferredTableOrigins;
  if (!preferredOrigins || preferredOrigins.length === 0) {
    return undefined;
  }

  const fallbackAnchors = buildGridAnchors(tableCount, bounds);
  return Array.from({ length: tableCount }, (_, index) => {
    const origin = preferredOrigins[index];
    if (!origin) {
      return fallbackAnchors[index];
    }
    return {
      tableIndex: index,
      label: `${TABLE_LABEL_PREFIX} ${index + 1}`,
      x: origin.x,
      y: origin.y,
      width: fallbackAnchors[index].width,
      height: fallbackAnchors[index].height,
    };
  });
}

function buildGridAnchors(tableCount: number, bounds: SceneLayoutBounds): readonly TableAnchor[] {
  const tableColumnCount = Math.max(
    TABLE_MIN_COLUMNS,
    Math.min(TABLE_MAX_COLUMNS, Math.ceil(Math.sqrt(tableCount))),
  );
  const tableRowCount = Math.max(1, Math.ceil(tableCount / tableColumnCount));
  const availableWidth = Math.max(120, bounds.width - TABLE_HORIZONTAL_PADDING * 2);
  const availableHeight = Math.max(120, bounds.height - TABLE_TOP_PADDING - TABLE_BOTTOM_PADDING);
  const tableWidth = Math.max(80, Math.min(TABLE_WIDTH, availableWidth / Math.max(1, tableColumnCount) - 8));
  const tableHeight = Math.max(
    56,
    Math.min(TABLE_HEIGHT, availableHeight / Math.max(1, tableRowCount) - 8),
  );
  const stepX =
    tableColumnCount === 1 ? 0 : Math.max(0, (availableWidth - tableWidth) / (tableColumnCount - 1));
  const stepY =
    tableRowCount === 1 ? 0 : Math.max(0, (availableHeight - tableHeight) / (tableRowCount - 1));
  const offsetX = bounds.offsetX ?? 0;
  const offsetY = bounds.offsetY ?? 0;

  return Array.from({ length: tableCount }, (_, index) => {
    const rowIndex = Math.floor(index / tableColumnCount);
    const columnIndex = index % tableColumnCount;
    const x = offsetX + TABLE_HORIZONTAL_PADDING + columnIndex * stepX;
    const y = offsetY + TABLE_TOP_PADDING + rowIndex * stepY;
    return {
      tableIndex: index,
      label: `${TABLE_LABEL_PREFIX} ${index + 1}`,
      x,
      y,
      width: tableWidth,
      height: tableHeight,
    };
  });
}
