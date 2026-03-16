import {
  formatLifecycleEvent,
  initialsFor,
  isVisibleLifecycleEvent,
  lifecycleGlyph,
  statusGlyph,
} from "@web/present";
import { describe, expect, it } from "vitest";

describe("initialsFor", () => {
  it("extracts two initials from a two-word name", () => {
    expect(initialsFor("John Doe")).toBe("JD");
  });

  it("extracts one initial from a single-word name", () => {
    expect(initialsFor("Claude")).toBe("C");
  });

  it("returns ?? for empty string", () => {
    expect(initialsFor("")).toBe("??");
  });

  it("returns ?? for whitespace-only string", () => {
    expect(initialsFor("   ")).toBe("??");
  });

  it("limits to first two words", () => {
    expect(initialsFor("John Michael Doe")).toBe("JM");
  });

  it("capitalizes lowercase initials", () => {
    expect(initialsFor("alice bob")).toBe("AB");
  });
});

describe("statusGlyph", () => {
  it("returns keyboard for running", () => {
    expect(statusGlyph("running")).toBe("⌨");
  });

  it("returns coffee for idle", () => {
    expect(statusGlyph("idle")).toBe("☕");
  });

  it("returns check for completed", () => {
    expect(statusGlyph("completed")).toBe("✓");
  });

  it("returns warning for error", () => {
    expect(statusGlyph("error")).toBe("⚠");
  });
});

describe("lifecycleGlyph", () => {
  it("returns arrow for joined", () => {
    expect(lifecycleGlyph("joined")).toBe("→");
  });

  it("returns arrow for left", () => {
    expect(lifecycleGlyph("left")).toBe("←");
  });

  it("returns tilde for statusChanged", () => {
    expect(lifecycleGlyph("statusChanged")).toBe("~");
  });

  it("returns dot for heartbeat", () => {
    expect(lifecycleGlyph("heartbeat")).toBe("·");
  });
});

describe("formatLifecycleEvent", () => {
  const agentNames = new Map([["a-1", "Alice"]]);

  it("formats a joined event with known agent name", () => {
    const result = formatLifecycleEvent(
      { kind: "joined", agentId: "a-1", at: 1000, fromStatus: null, toStatus: "running" },
      agentNames,
    );
    expect(result).toBe("Alice joined");
  });

  it("formats a left event", () => {
    const result = formatLifecycleEvent(
      { kind: "left", agentId: "a-1", at: 1000, fromStatus: "running", toStatus: null },
      agentNames,
    );
    expect(result).toBe("Alice left");
  });

  it("formats a statusChanged event with from and to", () => {
    const result = formatLifecycleEvent(
      { kind: "statusChanged", agentId: "a-1", at: 1000, fromStatus: "idle", toStatus: "running" },
      agentNames,
    );
    expect(result).toBe("Alice: idle → running");
  });

  it("truncates long unknown agent ids", () => {
    const result = formatLifecycleEvent(
      {
        kind: "joined",
        agentId: "abcdefghijklmnop",
        at: 1000,
        fromStatus: null,
        toStatus: "running",
      },
      new Map(),
    );
    expect(result).toBe("abcdefgh… joined");
  });

  it("uses short id as-is when within length limit", () => {
    const result = formatLifecycleEvent(
      { kind: "joined", agentId: "abc", at: 1000, fromStatus: null, toStatus: "running" },
      new Map(),
    );
    expect(result).toBe("abc joined");
  });
});

describe("isVisibleLifecycleEvent", () => {
  it("returns true for joined events", () => {
    expect(
      isVisibleLifecycleEvent({
        kind: "joined",
        agentId: "a-1",
        at: 1000,
        fromStatus: null,
        toStatus: "running",
      }),
    ).toBe(true);
  });

  it("returns true for left events", () => {
    expect(
      isVisibleLifecycleEvent({
        kind: "left",
        agentId: "a-1",
        at: 1000,
        fromStatus: "running",
        toStatus: null,
      }),
    ).toBe(true);
  });

  it("returns false for heartbeat events", () => {
    expect(
      isVisibleLifecycleEvent({
        kind: "heartbeat",
        agentId: "a-1",
        at: 1000,
        fromStatus: null,
        toStatus: null,
      }),
    ).toBe(false);
  });
});
