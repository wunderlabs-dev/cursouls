import type { SourceMode } from "../config";
import type { AgentSource } from "./source";
import {
  createCursorTranscriptSource,
  type CursorTranscriptSourceOptions,
} from "./transcripts";
import { createMockAgentSource, type MockAgentSourceOptions } from "./mock";

export * from "./source";
export * from "./transcripts";
export * from "./mock";

export interface AgentSourceFactoryOptions {
  mode?: SourceMode;
  preferredSource?: AgentSource;
  mockOptions?: MockAgentSourceOptions;
  transcriptOptions?: Partial<CursorTranscriptSourceOptions>;
}

export function createAgentSource(options: AgentSourceFactoryOptions = {}): AgentSource {
  if (options.mode === "mock") {
    return createMockAgentSource(options.mockOptions);
  }

  if (options.preferredSource) {
    return options.preferredSource;
  }

  const transcriptPaths = normalizeTranscriptPaths(options.transcriptOptions?.sourcePaths);
  if (transcriptPaths.length > 0) {
    return createCursorTranscriptSource({
      sourcePaths: transcriptPaths,
      sourceLabel: options.transcriptOptions?.sourceLabel,
    });
  }

  return createMockAgentSource(options.mockOptions);
}

function normalizeTranscriptPaths(sourcePaths: readonly string[] | undefined): string[] {
  if (!Array.isArray(sourcePaths)) {
    return [];
  }

  return sourcePaths
    .map((entry) => (typeof entry === "string" ? entry.trim() : ""))
    .filter((entry) => entry.length > 0);
}
