import type { AgentStatus } from "@shared/types";

export function spriteStatusClass(status: AgentStatus): string {
  return `status-${status}`;
}

export function initialsFor(name: string): string {
  const parts = name
    .trim()
    .split(/\s+/)
    .filter((segment) => segment.length > 0);
  if (parts.length === 0) {
    return "??";
  }
  const initials = parts
    .slice(0, 2)
    .map((segment) => segment.charAt(0).toUpperCase())
    .join("");
  return initials || "??";
}

export function statusGlyph(status: AgentStatus): string {
  switch (status) {
    case "running":
      return "⌨";
    case "idle":
      return "☕";
    case "completed":
      return "✓";
    case "error":
      return "⚠";
    default:
      return "•";
  }
}
