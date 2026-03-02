import { readFile } from "node:fs/promises";
import type { AgentKind, AgentSnapshot, AgentSourceReadResult, AgentStatus } from "@shared/types";
import type { AgentSource } from "./source";

interface CursorTranscriptRecord {
  agentId: string;
  agentName: string;
  kind?: string;
  status: string;
  task: string;
  startedAt?: number;
  updatedAt: number;
}

export interface CursorTranscriptSourceOptions {
  sourcePaths: string[];
  sourceLabel?: string;
}

export interface CursorTranscriptSource extends AgentSource {
  readonly sourceKind: "cursor-transcripts";
}

export function createCursorTranscriptSource(
  options: CursorTranscriptSourceOptions,
): CursorTranscriptSource {
  const sourcePaths = Array.isArray(options.sourcePaths) ? [...options.sourcePaths] : [];
  const sourceLabel = options.sourceLabel ?? "cursor-transcripts";
  let connected = false;

  function connect(): void {
    connected = true;
  }

  function disconnect(): void {
    connected = false;
  }

  async function readSnapshot(_now: number = Date.now()): Promise<AgentSourceReadResult> {
    if (!connected) {
      return {
        agents: [],
        connected: false,
        sourceLabel,
        warnings: ["Cursor transcript source is disconnected."],
      };
    }

    if (sourcePaths.length === 0) {
      return {
        agents: [],
        connected: false,
        sourceLabel,
        warnings: ["No transcript paths configured."],
      };
    }

    const warnings: string[] = [];
    const orderedIds: string[] = [];
    const latestById = new Map<string, AgentSnapshot>();
    let hasReadError = false;

    for (const sourcePath of sourcePaths) {
      let contents: string;
      try {
        contents = await readFile(sourcePath, "utf8");
      } catch {
        hasReadError = true;
        warnings.push(`Failed to read transcript path: ${sourcePath}`);
        continue;
      }

      const parsedAgents = parseTranscriptFile(contents, sourcePath, warnings);
      for (const parsedAgent of parsedAgents) {
        const existing = latestById.get(parsedAgent.id);
        if (!existing) {
          latestById.set(parsedAgent.id, parsedAgent);
          orderedIds.push(parsedAgent.id);
          continue;
        }

        if (parsedAgent.updatedAt > existing.updatedAt) {
          latestById.set(parsedAgent.id, parsedAgent);
        }
      }
    }

    const agents = orderedIds
      .map((id) => latestById.get(id))
      .filter((agent): agent is AgentSnapshot => Boolean(agent));

    return {
      agents,
      connected: !hasReadError,
      sourceLabel,
      warnings,
    };
  }

  function parseTranscriptFile(
    contents: string,
    sourcePath: string,
    warnings: string[],
  ): AgentSnapshot[] {
    const lines = contents.split(/\r?\n/);
    const agents: AgentSnapshot[] = [];

    for (let lineNumber = 0; lineNumber < lines.length; lineNumber += 1) {
      const rawLine = lines[lineNumber];
      const line = rawLine.trim();
      if (line.length === 0) {
        continue;
      }

      let parsed: unknown;
      try {
        parsed = JSON.parse(line);
      } catch {
        warnings.push(formatLineWarning(sourcePath, lineNumber + 1, "Invalid JSON line."));
        continue;
      }

      const record = asRecord(parsed);
      if (!record) {
        warnings.push(formatLineWarning(sourcePath, lineNumber + 1, "Invalid transcript shape."));
        continue;
      }

      if (!isAgentStatus(record.status)) {
        warnings.push(formatLineWarning(sourcePath, lineNumber + 1, "Invalid agent status."));
        continue;
      }

      const normalizedKind = normalizeKind(record.kind, sourcePath, lineNumber + 1, warnings);
      if (!normalizedKind) {
        continue;
      }

      const snapshot: AgentSnapshot = {
        id: record.agentId,
        name: record.agentName,
        kind: normalizedKind,
        status: record.status,
        taskSummary: record.task,
        updatedAt: record.updatedAt,
        source: "cursor-transcripts",
      };

      if (typeof record.startedAt === "number") {
        snapshot.startedAt = record.startedAt;
      }

      agents.push(snapshot);
    }

    return agents;
  }

  function asRecord(value: unknown): CursorTranscriptRecord | null {
    if (!isRecord(value)) {
      return null;
    }

    const agentId = asNonEmptyString(value.agentId);
    const agentName = asNonEmptyString(value.agentName);
    const status = asNonEmptyString(value.status);
    const task = asNonEmptyString(value.task);
    const updatedAt = asFiniteNumber(value.updatedAt);

    if (!agentId || !agentName || !status || !task || updatedAt === undefined) {
      return null;
    }

    const kind = asNonEmptyString(value.kind);
    const startedAt = asFiniteNumber(value.startedAt);

    return {
      agentId,
      agentName,
      kind,
      status,
      task,
      startedAt,
      updatedAt,
    };
  }

  function normalizeKind(
    rawKind: string | undefined,
    sourcePath: string,
    lineNumber: number,
    warnings: string[],
  ): AgentKind | null {
    if (rawKind === undefined) {
      return "local";
    }

    if (isAgentKind(rawKind)) {
      return rawKind;
    }

    warnings.push(formatLineWarning(sourcePath, lineNumber, "Invalid agent kind."));
    return null;
  }

  function formatLineWarning(sourcePath: string, lineNumber: number, reason: string): string {
    return `${sourcePath}:${lineNumber} ${reason}`;
  }

  return {
    sourceKind: "cursor-transcripts",
    connect,
    disconnect,
    readSnapshot,
  };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function asNonEmptyString(value: unknown): string | undefined {
  return typeof value === "string" && value.trim().length > 0 ? value : undefined;
}

function asFiniteNumber(value: unknown): number | undefined {
  return typeof value === "number" && Number.isFinite(value) ? value : undefined;
}

function isAgentStatus(value: string): value is AgentStatus {
  return value === "running" || value === "idle" || value === "completed" || value === "error";
}

function isAgentKind(value: string): value is AgentKind {
  return value === "local" || value === "remote";
}
