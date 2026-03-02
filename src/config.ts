import {
  DEFAULT_MOCK_AGENT_COUNT,
  DEFAULT_REFRESH_MS,
  DEFAULT_SEAT_COUNT,
  EXTENSION_CONFIG_SECTION,
  MAX_REFRESH_MS,
  MIN_REFRESH_MS,
  MOCK_AGENT_COUNT_CONFIG_KEY,
  REFRESH_MS_CONFIG_KEY,
  SOURCE_MODE_CONFIG_KEY,
} from "./constants";

export type SourceMode = "auto" | "mock";

export interface ConfigReader {
  get<T>(key: string, defaultValue?: T): T | undefined;
}

export interface CafeConfig {
  refreshMs: number;
  seatCount: number;
  sourceMode: SourceMode;
  mockAgentCount: number;
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

export function resolveSourceMode(value: string | undefined): SourceMode {
  return value === "mock" ? "mock" : "auto";
}

export function readCafeConfig(
  config?: ConfigReader,
  defaults: Partial<CafeConfig> = {},
): CafeConfig {
  const refreshRaw = config?.get<number>(
    `${EXTENSION_CONFIG_SECTION}.${REFRESH_MS_CONFIG_KEY}`,
    defaults.refreshMs ?? DEFAULT_REFRESH_MS,
  );
  const sourceModeRaw = config?.get<string>(
    `${EXTENSION_CONFIG_SECTION}.${SOURCE_MODE_CONFIG_KEY}`,
    defaults.sourceMode ?? "auto",
  );
  const mockAgentCountRaw = config?.get<number>(
    `${EXTENSION_CONFIG_SECTION}.${MOCK_AGENT_COUNT_CONFIG_KEY}`,
    defaults.mockAgentCount ?? DEFAULT_MOCK_AGENT_COUNT,
  );

  return {
    refreshMs: clampInt(
      refreshRaw ?? defaults.refreshMs ?? DEFAULT_REFRESH_MS,
      MIN_REFRESH_MS,
      MAX_REFRESH_MS,
      defaults.refreshMs ?? DEFAULT_REFRESH_MS,
    ),
    seatCount: defaults.seatCount ?? DEFAULT_SEAT_COUNT,
    sourceMode: resolveSourceMode(sourceModeRaw),
    mockAgentCount: clampInt(
      mockAgentCountRaw ?? defaults.mockAgentCount ?? DEFAULT_MOCK_AGENT_COUNT,
      1,
      100,
      defaults.mockAgentCount ?? DEFAULT_MOCK_AGENT_COUNT,
    ),
  };
}
