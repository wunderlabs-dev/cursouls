import { describe, expect, it } from "vitest";
import { createCursorTranscriptSource } from "@agentprobe/core";
import { readCafeConfig } from "@ext/config";

describe("createCursorTranscriptSource", () => {
  it("creates transcript source with explicit source paths", () => {
    const source = createCursorTranscriptSource({
      sourcePaths: ["/tmp/transcript.jsonl"],
    });

    expect(source.sourceKind).toBe("cursor-transcripts");
  });

  it("returns disconnected health with empty source paths", async () => {
    const source = createCursorTranscriptSource({
      sourcePaths: [],
    });

    source.connect();
    const result = await source.readSnapshot(1234);
    source.disconnect();

    expect(result.connected).toBe(false);
    expect(result.warnings).toContain("No transcript paths configured.");
  });

  it("uses provided source label", async () => {
    const source = createCursorTranscriptSource({
      sourcePaths: [],
      sourceLabel: "custom-source",
    });

    source.connect();
    const result = await source.readSnapshot(1234);
    source.disconnect();

    expect(result.connected).toBe(false);
    expect(result.sourceLabel).toBe("custom-source");
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
