import { readFile, stat } from "node:fs/promises";
import path from "node:path";
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

interface ConversationTranscriptRecord {
  role: string;
  text?: string;
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

  async function readSnapshot(now: number = Date.now()): Promise<AgentSourceReadResult> {
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
      let fileUpdatedAt = now;
      try {
        const stats = await stat(sourcePath);
        fileUpdatedAt = Math.round(stats.mtimeMs);
      } catch {
        // Keep default now timestamp when stat access fails.
      }
      try {
        contents = await readFile(sourcePath, "utf8");
      } catch {
        hasReadError = true;
        warnings.push(`Failed to read transcript path: ${sourcePath}`);
        continue;
      }

      const parsedAgents = parseTranscriptFile(contents, sourcePath, warnings, fileUpdatedAt, now);
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
    fileUpdatedAt: number,
    now: number,
  ): AgentSnapshot[] {
    const lines = contents.split(/\r?\n/);
    const agents: AgentSnapshot[] = [];
    let latestUserTask: string | undefined;
    let sawConversationRecord = false;
    let sawErrorMarker = false;

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
        const conversationRecord = asConversationRecord(parsed);
        if (conversationRecord) {
          sawConversationRecord = true;
          if (conversationRecord.role === "user" && conversationRecord.text) {
            latestUserTask = sanitizeTaskSummary(conversationRecord.text);
          }
          if (conversationRecord.text && hasErrorMarker(conversationRecord.text)) {
            sawErrorMarker = true;
          }
          continue;
        }
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

    if (agents.length > 0 || !sawConversationRecord) {
      return agents;
    }

    const agentId = deriveAgentId(sourcePath);
    return [
      {
        id: agentId,
        name: deriveAgentName(agentId, sourcePath),
        kind: "local",
        status: deriveConversationStatus(now, fileUpdatedAt, sawErrorMarker),
        taskSummary: latestUserTask ?? "Working",
        updatedAt: fileUpdatedAt,
        source: "cursor-transcripts",
      },
    ];
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

function asConversationRecord(value: unknown): ConversationTranscriptRecord | null {
  if (!isRecord(value)) {
    return null;
  }

  const role = asNonEmptyString(value.role);
  if (!role) {
    return null;
  }

  if (!isRecord(value.message) || !Array.isArray(value.message.content)) {
    return { role };
  }

  for (const item of value.message.content) {
    if (!isRecord(item) || item.type !== "text") {
      continue;
    }
    const text = asNonEmptyString(item.text);
    if (text) {
      return { role, text };
    }
  }

  return { role };
}

function sanitizeTaskSummary(value: string): string {
  const match = value.match(/<user_query>\s*([\s\S]*?)\s*<\/user_query>/i);
  const query = match ? match[1] : value;
  return query.replace(/\s+/g, " ").trim();
}

function hasErrorMarker(value: string): boolean {
  return /(error|failed|exception|traceback)/i.test(value);
}

function deriveConversationStatus(
  now: number,
  updatedAt: number,
  sawErrorMarker: boolean,
): AgentStatus {
  if (sawErrorMarker) {
    return "error";
  }
  const ageMs = Math.max(0, now - updatedAt);
  if (ageMs <= 120_000) {
    return "running";
  }
  if (ageMs <= 3_600_000) {
    return "idle";
  }
  return "completed";
}

function deriveAgentId(sourcePath: string): string {
  const fileName = path.basename(sourcePath, ".jsonl");
  return fileName.length > 0 ? fileName : sourcePath;
}

function deriveAgentName(agentId: string, sourcePath: string): string {
  const prefix = sourcePath.includes("/subagents/") ? "Subagent" : "Agent";
  return `${prefix} ${agentId.slice(0, 6)}`;
}

function isAgentStatus(value: string): value is AgentStatus {
  return value === "running" || value === "idle" || value === "completed" || value === "error";
}

function isAgentKind(value: string): value is AgentKind {
  return value === "local" || value === "remote";
}
