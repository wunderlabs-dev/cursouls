import { formatUnknown, formatUnknownError } from "@ext/errors";
import { describe, expect, it } from "vitest";

describe("formatUnknownError", () => {
  it("extracts message from Error instances", () => {
    expect(formatUnknownError(new Error("something broke"))).toBe("something broke");
  });

  it("converts non-Error values to string", () => {
    expect(formatUnknownError("raw string")).toBe("raw string");
    expect(formatUnknownError(42)).toBe("42");
    expect(formatUnknownError(null)).toBe("null");
    expect(formatUnknownError(undefined)).toBe("undefined");
  });

  it("handles objects without message property", () => {
    expect(formatUnknownError({ code: 404 })).toBe("[object Object]");
  });
});

describe("formatUnknown", () => {
  it("extracts message from Error instances", () => {
    expect(formatUnknown(new Error("fail"))).toBe("fail");
  });

  it("JSON-serializes plain objects", () => {
    expect(formatUnknown({ key: "value" })).toBe('{"key":"value"}');
  });

  it("JSON-serializes arrays", () => {
    expect(formatUnknown([1, 2, 3])).toBe("[1,2,3]");
  });

  it("falls back to String() when JSON.stringify throws", () => {
    const circular: Record<string, unknown> = {};
    circular.self = circular;
    expect(formatUnknown(circular)).toBe("[object Object]");
  });

  it("serializes primitives", () => {
    expect(formatUnknown("hello")).toBe('"hello"');
    expect(formatUnknown(42)).toBe("42");
    expect(formatUnknown(null)).toBe("null");
    expect(formatUnknown(true)).toBe("true");
  });
});
