import { DEFAULT_SEAT_COUNT } from "@shared/constants";
import type { AgentSnapshot, SceneFrame } from "@shared/types";
import { SCENE_HEIGHT, SCENE_WIDTH } from "./constants";

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
  seats: readonly SeatRenderModel[];
}

const TABLE_WIDTH = 116;
const TABLE_HEIGHT = 72;
const TABLE_LABEL_PREFIX = "Table";
const TABLE_MIN_COLUMNS = 2;
const TABLE_MAX_COLUMNS = 6;
const TABLE_HORIZONTAL_PADDING = 12;
const TABLE_TOP_PADDING = 36;
const TABLE_BOTTOM_PADDING = 16;
const MIN_AVAILABLE_DIMENSION = 120;
const MIN_TABLE_WIDTH = 80;
const MIN_TABLE_HEIGHT = 56;
const TABLE_GAP = 8;

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
  if (preferredAnchors) return preferredAnchors;
  return buildGridAnchors(tableCount, bounds);
}

function buildPreferredTableAnchors(
  tableCount: number,
  bounds: SceneLayoutBounds,
): readonly TableAnchor[] | undefined {
  const preferredOrigins = bounds.preferredTableOrigins;
  if (!preferredOrigins || preferredOrigins.length === 0) return undefined;

  const fallbackAnchors = buildGridAnchors(tableCount, bounds);
  return Array.from({ length: tableCount }, (_, index) => {
    const origin = preferredOrigins[index];
    if (!origin) return fallbackAnchors[index];
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

interface GridLayout {
  tableWidth: number;
  tableHeight: number;
  stepX: number;
  stepY: number;
  offsetX: number;
  offsetY: number;
  columns: number;
}

function computeGridLayout(tableCount: number, bounds: SceneLayoutBounds): GridLayout {
  const columns = Math.max(
    TABLE_MIN_COLUMNS,
    Math.min(TABLE_MAX_COLUMNS, Math.ceil(Math.sqrt(tableCount))),
  );
  const rows = Math.max(1, Math.ceil(tableCount / columns));
  const availW = Math.max(MIN_AVAILABLE_DIMENSION, bounds.width - TABLE_HORIZONTAL_PADDING * 2);
  const availH = Math.max(
    MIN_AVAILABLE_DIMENSION,
    bounds.height - TABLE_TOP_PADDING - TABLE_BOTTOM_PADDING,
  );
  const tableWidth = Math.max(
    MIN_TABLE_WIDTH,
    Math.min(TABLE_WIDTH, availW / Math.max(1, columns) - TABLE_GAP),
  );
  const tableHeight = Math.max(
    MIN_TABLE_HEIGHT,
    Math.min(TABLE_HEIGHT, availH / Math.max(1, rows) - TABLE_GAP),
  );
  const stepX = columns === 1 ? 0 : Math.max(0, (availW - tableWidth) / (columns - 1));
  const stepY = rows === 1 ? 0 : Math.max(0, (availH - tableHeight) / (rows - 1));
  return {
    tableWidth,
    tableHeight,
    stepX,
    stepY,
    offsetX: bounds.offsetX ?? 0,
    offsetY: bounds.offsetY ?? 0,
    columns,
  };
}

function buildGridAnchors(tableCount: number, bounds: SceneLayoutBounds): readonly TableAnchor[] {
  const layout = computeGridLayout(tableCount, bounds);
  return Array.from({ length: tableCount }, (_, index) => {
    const row = Math.floor(index / layout.columns);
    const col = index % layout.columns;
    return {
      tableIndex: index,
      label: `${TABLE_LABEL_PREFIX} ${index + 1}`,
      x: layout.offsetX + TABLE_HORIZONTAL_PADDING + col * layout.stepX,
      y: layout.offsetY + TABLE_TOP_PADDING + row * layout.stepY,
      width: layout.tableWidth,
      height: layout.tableHeight,
    };
  });
}
