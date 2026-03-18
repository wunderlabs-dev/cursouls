const EXTENSION_CONFIG_SECTION = "cursorCafe";
const REFRESH_MS_CONFIG_KEY = "refreshMs";
const DEFAULT_REFRESH_MS = 250;
const MIN_REFRESH_MS = 100;
const MAX_REFRESH_MS = 10_000;

export interface ConfigReader {
  get<T>(key: string, defaultValue?: T): T | undefined;
}

export interface CafeConfig {
  refreshMs: number;
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
  };
}

function readConfigNumber(
  config: ConfigReader | undefined,
  key: string,
  fallback: number,
  min: number,
  max: number,
): number {
  const raw = config?.get<number>(`${EXTENSION_CONFIG_SECTION}.${key}`, fallback);
  return clampInt(raw ?? fallback, min, max, fallback);
}
