import type { AgentStatus } from "@shared/types";

export const SCENE_MIN_WIDTH = 360;
export const SCENE_MIN_HEIGHT = 280;

export const SCENE_BACKGROUND_DARK = "#1b1411";
export const SCENE_BACKGROUND_GRADIENT_FROM = "#281e18";
export const SCENE_BACKGROUND_GRADIENT_TO = "#18120f";

export const WALL_TOP_ROW_COUNT = 3;
export const WALL_TILE_CLASS = "bg-[#7f4f33]";
export const FLOOR_TILE_CLASS = "bg-[#b98958]";
export const TILE_BORDER_CLASS = "border-[#4f3a2d]/65";

export const TABLE_BORDER_CLASS = "border-[#54453a]";
export const TABLE_BG_CLASS = "bg-[#b78f67]";
export const TABLE_SHADOW_CLASS = "shadow-[0_4px_0_0_#3f3129]";

export const AGENT_SKIN_CLASS = "bg-[#ebc39f]";
export const AGENT_OUTLINE_CLASS = "border-[#2f2620]";
export const AGENT_LEGS_CLASS = "bg-[#2b3942]";
export const AGENT_LABEL_CLASS = "bg-black/65 text-[#f5ecdd]";
export const AGENT_SHADOW_CLASS = "bg-black/20";
export const AGENT_SHADOW_HOVER_CLASS = "group-hover:bg-black/30";

export const TABLE_OFFSET_X_MULTIPLIER = -0.25;
export const TABLE_OFFSET_Y_MULTIPLIER = -0.35;
export const TABLE_SIZE_MULTIPLIER = 1.5;

export const SEATING_REGION_MIN_WIDTH = 420;
export const SEATING_REGION_MIN_HEIGHT = 320;
export const SEATING_REGION_WIDTH_TILE_SUBTRACT = 1;
export const SEATING_REGION_HEIGHT_TILE_SUBTRACT = 3.2;
export const SEATING_REGION_OFFSET_X_MULTIPLIER = 0.4;
export const SEATING_REGION_OFFSET_Y_MULTIPLIER = 2.4;

export const TABLE_ORIGIN_OFFSET_X_MULTIPLIER = -0.2;
export const TABLE_ORIGIN_OFFSET_Y_MULTIPLIER = 0.38;

export const STATUS_STYLE: Record<AgentStatus, string> = {
  running: "border-emerald-500 bg-emerald-300/20 text-emerald-200 animate-pulse",
  idle: "border-stone-500 bg-stone-300/10 text-stone-200",
  completed: "border-teal-500 bg-teal-300/20 text-teal-200",
  error: "border-red-500 bg-red-300/20 text-red-200 animate-bounce",
};

export const BODY_COLOR: Record<AgentStatus, string> = {
  running: "bg-[#5fa26a]",
  idle: "bg-[#5c7b96]",
  completed: "bg-[#4c8f5f]",
  error: "bg-[#8f4c4c]",
};
