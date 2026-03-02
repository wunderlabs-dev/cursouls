import { describe, expect, it } from "vitest";
import { createAgentSource, type AgentSource } from "@ext/sources";
import { readCafeConfig } from "@ext/config";

describe("createAgentSource", () => {
  it("uses transcript source in auto mode when transcript paths are provided", () => {
    const source = createAgentSource({
      transcriptOptions: {
        sourcePaths: ["/tmp/transcript.jsonl"],
      },
    });

    expect(source.sourceKind).toBe("cursor-transcripts");
  });

  it("uses transcript source in auto mode when transcript paths are missing", () => {
    const source = createAgentSource({
      transcriptOptions: {} as never,
    });

    expect(source.sourceKind).toBe("cursor-transcripts");
  });

  it("uses preferred source before transcript source", () => {
    const preferredSource: AgentSource = {
      sourceKind: "cursor-transcripts",
      connect() {},
      disconnect() {},
      readSnapshot() {
        return { agents: [], connected: true, sourceLabel: "preferred", warnings: [] };
      },
    };
    const source = createAgentSource({
      preferredSource,
      transcriptOptions: {} as never,
    });

    expect(source).toBe(preferredSource);
  });
});

describe("readCafeConfig", () => {
  it("keeps refresh config without source mode options", () => {
    const config = {
      get<T>(key: string): T | undefined {
        if (key === "cursorCafe.refreshMs") {
          return 1500 as T;
        }
        return undefined;
      },
    };

    const parsed = readCafeConfig(config);

    expect(parsed.refreshMs).toBe(1500);
  });
});
