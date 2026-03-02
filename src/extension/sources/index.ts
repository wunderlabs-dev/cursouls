import type { AgentSource } from "./source";
import { createCursorTranscriptSource, type CursorTranscriptSourceOptions } from "./transcripts";

export * from "./source";
export * from "./transcripts";

export interface AgentSourceFactoryOptions {
  preferredSource?: AgentSource;
  transcriptOptions?: Partial<CursorTranscriptSourceOptions>;
}

export function createAgentSource(options: AgentSourceFactoryOptions = {}): AgentSource {
  if (options.preferredSource) {
    return options.preferredSource;
  }

  const transcriptPaths = normalizeTranscriptPaths(options.transcriptOptions?.sourcePaths);
  return createCursorTranscriptSource({
    sourcePaths: transcriptPaths,
    sourceLabel: options.transcriptOptions?.sourceLabel,
  });
}

function normalizeTranscriptPaths(sourcePaths: readonly string[] | undefined): string[] {
  if (!Array.isArray(sourcePaths)) {
    return [];
  }

  return sourcePaths
    .map((entry) => (typeof entry === "string" ? entry.trim() : ""))
    .filter((entry) => entry.length > 0);
}
