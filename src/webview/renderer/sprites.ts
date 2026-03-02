import type { AgentStatus } from "../../types";

export function spriteStatusClass(status: AgentStatus): string {
  return `status-${status}`;
}

export function initialsFor(name: string): string {
  const tokens = name
    .trim()
    .split(/\s+/)
    .filter(Boolean);
  if (tokens.length === 0) {
    return "?";
  }
  if (tokens.length === 1) {
    return tokens[0].slice(0, 2).toUpperCase();
  }
  return `${tokens[0][0]}${tokens[1][0]}`.toUpperCase();
}

export function statusGlyph(status: AgentStatus): string {
  switch (status) {
    case "completed":
      return "✓";
    case "error":
      return "!";
    case "running":
      return "…";
    case "idle":
    default:
      return "•";
  }
}
