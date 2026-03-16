import {
  DEFAULT_REFRESH_MS,
  DEFAULT_SEAT_COUNT,
  EXTENSION_CONFIG_SECTION,
  MAX_REFRESH_MS,
  MAX_SEAT_COUNT,
  MIN_REFRESH_MS,
  MIN_SEAT_COUNT,
  REFRESH_MS_CONFIG_KEY,
  SEAT_COUNT_CONFIG_KEY,
} from "@shared/constants";

export type CafeConfigKey = typeof REFRESH_MS_CONFIG_KEY | typeof SEAT_COUNT_CONFIG_KEY;

export interface ConfigReader {
  get<T>(key: string, defaultValue?: T): T | undefined;
}

export interface CafeConfig {
  refreshMs: number;
  seatCount: number;
}

export function clampInt(
  value: number,
  minValue: number,
  maxValue: number,
  fallbackValue: number = minValue,
): number {
  const inputValue = Number.isFinite(value) ? value : fallbackValue;
  if (!Number.isFinite(inputValue)) {
    return minValue;
  }
  const rounded = Math.round(inputValue);
  return Math.max(minValue, Math.min(maxValue, rounded));
}

export function readCafeConfig(
  config?: ConfigReader,
  defaults: Partial<CafeConfig> = {},
): CafeConfig {
  return {
    refreshMs: readConfigNumber(
      config,
      REFRESH_MS_CONFIG_KEY,
      defaults.refreshMs ?? DEFAULT_REFRESH_MS,
      MIN_REFRESH_MS,
      MAX_REFRESH_MS,
    ),
    seatCount: readConfigNumber(
      config,
      SEAT_COUNT_CONFIG_KEY,
      defaults.seatCount ?? DEFAULT_SEAT_COUNT,
      MIN_SEAT_COUNT,
      MAX_SEAT_COUNT,
    ),
  };
}

function readConfigNumber(
  config: ConfigReader | undefined,
  key: CafeConfigKey,
  fallback: number,
  min: number,
  max: number,
): number {
  const raw = config?.get<number>(`${EXTENSION_CONFIG_SECTION}.${key}`, fallback);
  return clampInt(raw ?? fallback, min, max, fallback);
}
