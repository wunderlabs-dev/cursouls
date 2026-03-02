import type { SourceMode } from "../config";
import type { AgentSource } from "./AgentSource";
import {
  createCursorTranscriptSource,
  type CursorTranscriptSourceOptions,
} from "./CursorTranscriptSource";
import { createMockAgentSource, type MockAgentSourceOptions } from "./MockAgentSource";

export * from "./AgentSource";
export * from "./CursorTranscriptSource";
export * from "./MockAgentSource";

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
