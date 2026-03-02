import {
  DEFAULT_REFRESH_MS,
  DEFAULT_SEAT_COUNT,
  EXTENSION_CONFIG_SECTION,
  MAX_REFRESH_MS,
  MIN_REFRESH_MS,
  REFRESH_MS_CONFIG_KEY,
} from "@shared/constants";

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
  const refreshRaw = config?.get<number>(
    `${EXTENSION_CONFIG_SECTION}.${REFRESH_MS_CONFIG_KEY}`,
    defaults.refreshMs ?? DEFAULT_REFRESH_MS,
  );
  return {
    refreshMs: clampInt(
      refreshRaw ?? defaults.refreshMs ?? DEFAULT_REFRESH_MS,
      MIN_REFRESH_MS,
      MAX_REFRESH_MS,
      defaults.refreshMs ?? DEFAULT_REFRESH_MS,
    ),
    seatCount: defaults.seatCount ?? DEFAULT_SEAT_COUNT,
  };
}
