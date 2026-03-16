import { describe, expect, it } from "vitest";
import { readCafeConfig } from "@ext/config";

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
      seatCount: 20,
    });
  });
});
