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

  it("normalizes transcript paths to non-empty trimmed entries", async () => {
    const source = createAgentSource({
      transcriptOptions: {
        sourcePaths: ["  /tmp/a.jsonl  ", "", "   ", "/tmp/b.jsonl"],
      },
    });

    source.connect();
    const result = await source.readSnapshot(1234);
    source.disconnect();

    expect(result.connected).toBe(false);
    expect(result.sourceLabel).toBe("cursor-transcripts");
    expect(result.warnings).toContain("Failed to read transcript path: /tmp/a.jsonl");
    expect(result.warnings).toContain("Failed to read transcript path: /tmp/b.jsonl");
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

  it("ignores legacy source-mode config keys in transcript-only mode", () => {
    const config = {
      get<T>(key: string): T | undefined {
        if (key === "cursorCafe.refreshMs") {
          return 1200 as T;
        }
        if (key === "cursorCafe.sourceMode") {
          return "mock" as T;
        }
        if (key === "cursorCafe.transcriptPath") {
          return "/tmp/legacy.jsonl" as T;
        }
        return undefined;
      },
    };

    const parsed = readCafeConfig(config);

    expect(parsed).toEqual({
      refreshMs: 1200,
      seatCount: 6,
    });
  });
});
