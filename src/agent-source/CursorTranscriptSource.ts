import { readFile } from "node:fs/promises";
import type { AgentKind, AgentSnapshot, AgentSourceReadResult, AgentStatus } from "../types";
import type { AgentSource } from "./AgentSource";

const VALID_STATUSES: ReadonlySet<AgentStatus> = new Set(["running", "idle", "completed", "error"]);
const VALID_KINDS: ReadonlySet<AgentKind> = new Set(["local", "remote"]);

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

export class CursorTranscriptSource implements AgentSource {
  public readonly sourceKind = "cursor-transcripts" as const;

  private readonly sourcePaths: string[];
  private readonly sourceLabel: string;
  private connected = false;

  public constructor(options: CursorTranscriptSourceOptions) {
    this.sourcePaths = Array.isArray(options.sourcePaths) ? [...options.sourcePaths] : [];
    this.sourceLabel = options.sourceLabel ?? "cursor-transcripts";
  }

  public connect(): void {
    this.connected = true;
  }

  public disconnect(): void {
    this.connected = false;
  }

  public async readSnapshot(_now: number = Date.now()): Promise<AgentSourceReadResult> {
    if (!this.connected) {
      return {
        agents: [],
        connected: false,
        sourceLabel: this.sourceLabel,
        warnings: ["Cursor transcript source is disconnected."],
      };
    }

    if (this.sourcePaths.length === 0) {
      return {
        agents: [],
        connected: false,
        sourceLabel: this.sourceLabel,
        warnings: ["No transcript paths configured."],
      };
    }

    const warnings: string[] = [];
    const orderedIds: string[] = [];
    const latestById = new Map<string, AgentSnapshot>();
    let hasReadError = false;

    for (const sourcePath of this.sourcePaths) {
      let contents: string;
      try {
        contents = await readFile(sourcePath, "utf8");
      } catch {
        hasReadError = true;
        warnings.push(`Failed to read transcript path: ${sourcePath}`);
        continue;
      }

      const parsedAgents = this.parseTranscriptFile(contents, sourcePath, warnings);
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
      sourceLabel: this.sourceLabel,
      warnings,
    };
  }

  private parseTranscriptFile(contents: string, sourcePath: string, warnings: string[]): AgentSnapshot[] {
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
        warnings.push(this.formatLineWarning(sourcePath, lineNumber + 1, "Invalid JSON line."));
        continue;
      }

      const record = this.asRecord(parsed);
      if (!record) {
        warnings.push(this.formatLineWarning(sourcePath, lineNumber + 1, "Invalid transcript shape."));
        continue;
      }

      if (!VALID_STATUSES.has(record.status as AgentStatus)) {
        warnings.push(this.formatLineWarning(sourcePath, lineNumber + 1, "Invalid agent status."));
        continue;
      }

      const normalizedKind = this.normalizeKind(record.kind, sourcePath, lineNumber + 1, warnings);
      if (!normalizedKind) {
        continue;
      }

      const snapshot: AgentSnapshot = {
        id: record.agentId,
        name: record.agentName,
        kind: normalizedKind,
        status: record.status as AgentStatus,
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

  private asRecord(value: unknown): CursorTranscriptRecord | null {
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

  private normalizeKind(
    rawKind: string | undefined,
    sourcePath: string,
    lineNumber: number,
    warnings: string[],
  ): AgentKind | null {
    if (rawKind === undefined) {
      return "local";
    }

    if (VALID_KINDS.has(rawKind as AgentKind)) {
      return rawKind as AgentKind;
    }

    warnings.push(this.formatLineWarning(sourcePath, lineNumber, "Invalid agent kind."));
    return null;
  }

  private formatLineWarning(sourcePath: string, lineNumber: number, reason: string): string {
    return `${sourcePath}:${lineNumber} ${reason}`;
  }
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
