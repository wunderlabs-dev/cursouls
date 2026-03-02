import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import type { AgentSourceReadResult } from "../../src/types";

interface TranscriptSource {
  connect: () => Promise<void> | void;
  disconnect: () => Promise<void> | void;
  readSnapshot: (now?: number) => Promise<AgentSourceReadResult> | AgentSourceReadResult;
}

function toFixturePath(name: string): string {
  const currentFile = fileURLToPath(import.meta.url);
  return path.resolve(path.dirname(currentFile), "../fixtures/transcripts", name);
}

async function createSource(sourcePaths: string[]): Promise<TranscriptSource> {
  const modulePath = path.resolve(
    path.dirname(fileURLToPath(import.meta.url)),
    "../../src/agent-source/CursorTranscriptSource.ts",
  );
  let loadedModule: Record<string, unknown>;

  try {
    loadedModule = (await import(modulePath)) as Record<string, unknown>;
  } catch (error) {
    throw new Error(
      `CursorTranscriptSource is not implemented at src/agent-source/CursorTranscriptSource.ts yet: ${String(error)}`,
    );
  }

  const Ctor = loadedModule.CursorTranscriptSource as (new (options: { sourcePaths: string[] }) => TranscriptSource);
  return new Ctor({ sourcePaths });
}

describe("CursorTranscriptSource", () => {
  it("parses transcript JSONL fixtures into AgentSnapshot records", async () => {
    const runningPath = toFixturePath("running.jsonl");
    const source = await createSource([runningPath]);

    await source.connect();
    const result = await source.readSnapshot(1_700_000_010_000);
    await source.disconnect();

    expect(result.agents.map((entry) => entry.id)).toEqual(["agent-1", "agent-2"]);
    expect(result.agents.map((entry) => entry.status)).toEqual(["running", "running"]);
    expect(result.connected).toBe(true);
    expect(result.sourceLabel).toBe("cursor-transcripts");
    expect(result.warnings).toEqual([]);
  });

  it("skips malformed lines while preserving valid records and warnings", async () => {
    const errorPath = toFixturePath("error.jsonl");
    const source = await createSource([errorPath]);

    await source.connect();
    const result = await source.readSnapshot(1_700_000_020_000);
    await source.disconnect();

    expect(result.agents.map((entry) => entry.id)).toEqual(["agent-7", "agent-8"]);
    expect(result.agents.map((entry) => entry.status)).toEqual(["error", "running"]);
    expect(result.warnings.length).toBeGreaterThanOrEqual(1);
  });

  it("degrades safely for missing or unreadable transcript paths", async () => {
    const tempDir = await mkdtemp(path.join(tmpdir(), "cursor-cafe-transcript-"));
    const transcriptPath = path.join(tempDir, "transcript.jsonl");
    await writeFile(transcriptPath, await readFile(toFixturePath("idle.jsonl"), "utf8"), "utf8");
    await rm(transcriptPath);

    const source = await createSource([transcriptPath]);

    await source.connect();
    const result = await source.readSnapshot(1_700_000_030_000);
    await source.disconnect();
    await rm(tempDir, { recursive: true, force: true });

    expect(result.agents).toEqual([]);
    expect(result.connected).toBe(false);
    expect(result.warnings.length).toBeGreaterThanOrEqual(1);
  });
});
