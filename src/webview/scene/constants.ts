export const SCENE_MIN_WIDTH = 360;
export const SCENE_MIN_HEIGHT = 280;

export const SCENE_BACKGROUND_DARK = "#1b1411";
export const SCENE_BACKGROUND_GRADIENT_FROM = "#281e18";
export const SCENE_BACKGROUND_GRADIENT_TO = "#18120f";

export const WALL_TILE_CLASS = "bg-[#7f4f33]";
export const FLOOR_TILE_CLASS = "bg-[#b98958]";
export const TILE_BORDER_CLASS = "border-[#4f3a2d]/65";

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

export const STATUS_STYLE: Record<string, string> = {
  running: "border-emerald-500 bg-emerald-300/20 text-emerald-200 animate-pulse",
  idle: "border-stone-500 bg-stone-300/10 text-stone-200",
  completed: "border-teal-500 bg-teal-300/20 text-teal-200",
  error: "border-red-500 bg-red-300/20 text-red-200 animate-bounce",
};
