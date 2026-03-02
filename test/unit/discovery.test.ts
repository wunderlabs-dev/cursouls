import { mkdtemp, rm, writeFile, mkdir } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { resolveTranscriptSourcePaths } from "@ext/sources/discovery";

describe("resolveTranscriptSourcePaths", () => {
  it("discovers nested jsonl transcript files under workspace-derived directory", async () => {
    const workspaceRoot = await mkdtemp(path.join(tmpdir(), "cursor-cafe-workspace-"));
    const workspaceName = workspaceRoot.replace(/^\/+/, "").split("/").join("-");
    const transcriptRoot = path.join(
      workspaceRoot,
      ".cursor-home",
      ".cursor",
      "projects",
      workspaceName,
      "agent-transcripts",
    );
    const nestedDir = path.join(transcriptRoot, "session-a");
    const nestedFile = path.join(nestedDir, "session-a.jsonl");

    await mkdir(nestedDir, { recursive: true });
    await writeFile(nestedFile, '{"role":"user","message":{"content":[]}}\n', "utf8");

    const originalHome = process.env.HOME;
    process.env.HOME = path.join(workspaceRoot, ".cursor-home");

    try {
      const resolved = resolveTranscriptSourcePaths({ workspacePaths: [workspaceRoot] });
      expect(resolved).toEqual([nestedFile]);
    } finally {
      process.env.HOME = originalHome;
      await rm(workspaceRoot, { recursive: true, force: true });
    }
  });

  it("discovers transcript files across global cursor projects", async () => {
    const workspaceRoot = await mkdtemp(path.join(tmpdir(), "cursor-cafe-workspace-"));
    const homeRoot = path.join(workspaceRoot, ".cursor-home");
    const globalTranscriptFile = path.join(
      homeRoot,
      ".cursor",
      "projects",
      "project-a",
      "agent-transcripts",
      "session-1",
      "agent.jsonl",
    );

    await mkdir(path.dirname(globalTranscriptFile), { recursive: true });
    await writeFile(globalTranscriptFile, '{"role":"user","message":{"content":[]}}\n', "utf8");

    const originalHome = process.env.HOME;
    process.env.HOME = homeRoot;

    try {
      const resolved = resolveTranscriptSourcePaths({ workspacePaths: [] });
      expect(resolved).toEqual([globalTranscriptFile]);
    } finally {
      process.env.HOME = originalHome;
      await rm(workspaceRoot, { recursive: true, force: true });
    }
  });
});
