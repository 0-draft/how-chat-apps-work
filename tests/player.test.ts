import { describe, expect, it } from "vitest";
import { activeCard, clamp, stepFromHash } from "../src/lib/player";

describe("clamp", () => {
  it("keeps the step inside the sequence", () => {
    expect(clamp(-1, 5)).toBe(0);
    expect(clamp(2, 5)).toBe(2);
    expect(clamp(9, 5)).toBe(4);
  });
});

describe("stepFromHash", () => {
  it("reads a 1-based step anchor as a 0-based index", () => {
    expect(stepFromHash("#overview-3", "overview")).toBe(2);
  });

  it("ignores anchors for other sequences or other shapes", () => {
    expect(stepFromHash("#retry-3", "overview")).toBeUndefined();
    expect(stepFromHash("#overview", "overview")).toBeUndefined();
    expect(stepFromHash("#overview-3x", "overview")).toBeUndefined();
  });
});

describe("activeCard", () => {
  it("picks the last card whose top has crossed the line", () => {
    expect(activeCard([100, 300, 600], 450)).toBe(1);
    expect(activeCard([-900, -400, 200], 450)).toBe(2);
  });

  it("returns nothing before the first card reaches the line", () => {
    expect(activeCard([500, 900], 450)).toBeUndefined();
  });
});
