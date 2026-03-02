import { readdirSync, statSync } from "node:fs";
import { homedir } from "node:os";
import path from "node:path";

export interface TranscriptDiscoveryOptions {
  workspacePaths: string[];
  configuredPaths?: string[];
}

export function resolveTranscriptSourcePaths(options: TranscriptDiscoveryOptions): string[] {
  const configuredPaths = collectTranscriptPaths(options.configuredPaths ?? []);
  const discoveredPaths = options.workspacePaths.flatMap((workspacePath) =>
    collectTranscriptPaths([toTranscriptDirectory(workspacePath)]),
  );
  return dedupePaths([...configuredPaths, ...discoveredPaths]);
}

function toTranscriptDirectory(workspacePath: string): string {
  const workspaceId = workspacePath.trim().replace(/^\/+/, "").split("/").join("-");
  return path.join(homedir(), ".cursor", "projects", workspaceId, "agent-transcripts");
}

function collectTranscriptPaths(inputPaths: readonly string[]): string[] {
  const collected: string[] = [];

  for (const inputPath of inputPaths) {
    const normalizedPath = inputPath.trim();
    if (normalizedPath.length === 0) {
      continue;
    }

    let stats;
    try {
      stats = statSync(normalizedPath);
    } catch {
      continue;
    }

    if (stats.isFile() && normalizedPath.endsWith(".jsonl")) {
      collected.push(normalizedPath);
      continue;
    }

    if (!stats.isDirectory()) {
      continue;
    }

    let entries;
    try {
      entries = readdirSync(normalizedPath, { withFileTypes: true });
    } catch {
      continue;
    }

    const files = entries
      .filter((entry) => entry.isFile() && entry.name.endsWith(".jsonl"))
      .map((entry) => path.join(normalizedPath, entry.name))
      .sort((left, right) => left.localeCompare(right));

    collected.push(...files);
  }

  return collected;
}

function dedupePaths(paths: readonly string[]): string[] {
  const seen = new Set<string>();
  const unique: string[] = [];

  for (const entry of paths) {
    if (seen.has(entry)) {
      continue;
    }
    seen.add(entry);
    unique.push(entry);
  }

  return unique;
}
