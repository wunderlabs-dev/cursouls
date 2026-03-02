import type { AgentStatus } from "@shared/types";
import words from "lodash.words";
import upperFirst from "lodash.upperfirst";

export function spriteStatusClass(status: AgentStatus): string {
  return `status-${status}`;
}

export function initialsFor(name: string): string {
  const parts = words(name.trim());
  if (parts.length === 0) {
    return "??";
  }
  const initials = parts
    .slice(0, 2)
    .map((segment) => upperFirst(segment).charAt(0))
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
