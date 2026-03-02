export interface OutputChannelLike {
  appendLine(message: string): void;
  dispose?(): void;
}

export interface Logger {
  debug(message: string): void;
  info(message: string): void;
  warn(message: string): void;
  error(message: string): void;
  dispose(): void;
}

export type NowProvider = () => number;

function formatLogLine(
  level: "DEBUG" | "INFO" | "WARN" | "ERROR",
  scope: string,
  message: string,
  nowProvider: NowProvider,
): string {
  return `[${new Date(nowProvider()).toISOString()}] [${scope}] [${level}] ${message}`;
}

export function createLogger(
  scope: string,
  output: OutputChannelLike,
  nowProvider: NowProvider = () => Date.now(),
): Logger {
  return {
    debug(message: string): void {
      output.appendLine(formatLogLine("DEBUG", scope, message, nowProvider));
    },
    info(message: string): void {
      output.appendLine(formatLogLine("INFO", scope, message, nowProvider));
    },
    warn(message: string): void {
      output.appendLine(formatLogLine("WARN", scope, message, nowProvider));
    },
    error(message: string): void {
      output.appendLine(formatLogLine("ERROR", scope, message, nowProvider));
    },
    dispose(): void {
      output.dispose?.();
    },
  };
}
