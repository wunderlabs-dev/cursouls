import { describe, expect, it } from "vitest";
import { createAgentSource, type AgentSource } from "@ext/sources";
import { readCafeConfig } from "@ext/config";

describe("createAgentSource", () => {
  it("uses mock source when mode is mock even with transcript paths", () => {
    const source = createAgentSource({
      mode: "mock",
      transcriptOptions: {
        sourcePaths: ["/tmp/transcript.jsonl"],
      },
    });

    expect(source.sourceKind).toBe("mock");
  });

  it("uses transcript source in auto mode when transcript paths are provided", () => {
    const source = createAgentSource({
      mode: "auto",
      transcriptOptions: {
        sourcePaths: ["/tmp/transcript.jsonl"],
      },
    });

    expect(source.sourceKind).toBe("cursor-transcripts");
  });

  it("uses transcript source in auto mode when transcript paths are missing", () => {
    const source = createAgentSource({
      mode: "auto",
      transcriptOptions: {} as never,
    });

    expect(source.sourceKind).toBe("cursor-transcripts");
  });

  it("uses preferred source before mock fallback in auto mode", () => {
    const preferredSource: AgentSource = {
      sourceKind: "mock",
      connect() {},
      disconnect() {},
      readSnapshot() {
        return { agents: [], connected: true, sourceLabel: "preferred", warnings: [] };
      },
    };
    const source = createAgentSource({
      mode: "auto",
      preferredSource,
      transcriptOptions: {} as never,
    });

    expect(source).toBe(preferredSource);
  });
});

describe("readCafeConfig", () => {
  it("keeps refresh and source config without transcript path options", () => {
    const config = {
      get<T>(key: string): T | undefined {
        if (key === "cursorCafe.refreshMs") {
          return 1500 as T;
        }
        if (key === "cursorCafe.sourceMode") {
          return "auto" as T;
        }
        return undefined;
      },
    };

    const parsed = readCafeConfig(config);

    expect(parsed.refreshMs).toBe(1500);
    expect(parsed.sourceMode).toBe("auto");
  });
});
