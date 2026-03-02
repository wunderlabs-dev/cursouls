import type { SourceMode } from "../config";
import type { AgentSource } from "./AgentSource";
import {
  CursorTranscriptSource,
  type CursorTranscriptSourceOptions,
} from "./CursorTranscriptSource";
import { MockAgentSource, type MockAgentSourceOptions } from "./MockAgentSource";

export * from "./AgentSource";
export * from "./CursorTranscriptSource";
export * from "./MockAgentSource";

export interface AgentSourceFactoryOptions {
  mode?: SourceMode;
  preferredSource?: AgentSource;
  mockOptions?: MockAgentSourceOptions;
  transcriptOptions?: CursorTranscriptSourceOptions;
}

export function createAgentSource(options: AgentSourceFactoryOptions = {}): AgentSource {
  if (options.mode === "mock") {
    return new MockAgentSource(options.mockOptions);
  }

  if (options.preferredSource) {
    return options.preferredSource;
  }

  if ((options.transcriptOptions?.sourcePaths.length ?? 0) > 0) {
    return new CursorTranscriptSource(options.transcriptOptions);
  }

  return new MockAgentSource(options.mockOptions);
}
